from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
import os
from pathlib import Path
import threading
import time
import shutil
import asyncio
from typing import Union
import logging

from mcp.server.fastmcp import FastMCP

from build_docs_index import build_index_text
from build_project_memory_index import INDEX_DIR, INDEX_FILE, build_index, iter_candidate_files, write_index_atomic
from project_memory_search import search_entries

logger = logging.getLogger("project-memory")

EXTERNAL_CLI_TIMEOUT_SECONDS = float(os.environ.get("PROJECT_MEMORY_EXTERNAL_TIMEOUT_SECONDS", "5"))
HEALTH_CACHE_TTL_SECONDS = float(os.environ.get("PROJECT_MEMORY_HEALTH_CACHE_SECONDS", "30"))

class ProjectMemoryMCP(FastMCP):
    def __init__(self, name: str, **kwargs):
        super().__init__(name, **kwargs)
        self._last_checked_time = 0.0
        self._last_health_result = None

EXPECTED_MEMORY_SECTIONS = {
    "Source of Truth",
    "Aliases & Vocabulary",
    "Entry Points",
    "Stable Facts",
    "Active Decisions",
    "Hotspots",
    "Search Recipes",
    "Open Risks",
    "Next Refresh Triggers",
}
HEALTH_CRITICAL_SECTIONS = {
    "Source of Truth",
    "Aliases & Vocabulary",
    "Entry Points",
    "Hotspots",
}

_FALLBACK_HEALTH_TEMPLATE = {
    "status": "server_unavailable",
    "memory_exists": False,
    "index_exists": False,
    "docs_index_exists": False,
    "index_built_at": None,
    "index_age_days": None,
    "entry_count": 0,
    "category_counts": {},
    "scope_counts": {},
    "missing_sections": [],
    "quality_checks": {
        "random_query_clean": False,
        "known_query_accurate": False,
        "section_getters_clean": False,
        "no_duplicate_runtime": False,
        "skill_manifest_exists": False,
        "bridge_consistent": True
    },
    "codebase_graph_status": {
        "available": False,
        "status": "unavailable",
        "project_name": None,
        "indexed_at": None,
        "is_stale": None,
        "error": "health check unavailable",
    },
    "wrapper_status": {"available": False, "status": "unavailable", "transport": "stdio"},
    "local_index_status": {"available": False, "status": "unavailable", "path": None},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Project-local memory MCP server.")
    parser.add_argument("--root", required=True, help="Project root for this MCP instance.")
    return parser.parse_args()


def _detect_executable() -> str | None:
    env_path = os.environ.get('CODEBASE_MEMORY_MCP_PATH')
    if env_path:
        return env_path
    
    if os.name == 'nt':
        localappdata = os.environ.get('LOCALAPPDATA')
        if localappdata:
            exe_path = Path(localappdata) / "Programs" / "codebase-memory-mcp" / "codebase-memory-mcp.exe"
            if exe_path.exists():
                return str(exe_path)
                
    system_path = shutil.which("codebase-memory-mcp")
    if system_path:
        return system_path
        
    return None


async def _safe_kill_process(process, use_taskkill=False) -> None:
    if os.name == 'nt' and use_taskkill:
        try:
            tk_process = await asyncio.create_subprocess_exec(
                "taskkill", "/F", "/T", "/PID", str(process.pid)
            )
            try:
                await asyncio.wait_for(tk_process.wait(), timeout=3.0)
            except (asyncio.TimeoutError, Exception) as tk_err:
                logger.warning(f"taskkill wait error or timeout: {tk_err}")
                try:
                    tk_process.kill()
                    await tk_process.wait()
                except Exception:
                    pass
        except Exception as tk_err:
            logger.warning(f"Failed to execute taskkill cleanup: {tk_err}")
    
    try:
        process.kill()
    except (ProcessLookupError, OSError):
        pass
    try:
        await process.wait()
    except Exception:
        pass


async def _detect_and_run_mcp_cli(
    tool_name: str,
    root_path: Path,
    arguments: dict | None = None,
) -> Union[dict, list]:
    def unavailable(error: str) -> dict:
        return {
            "available": False,
            "status": "unavailable",
            "project_name": None,
            "indexed_at": None,
            "is_stale": None,
            "error": error,
        }

    exe_path = _detect_executable()
    if not exe_path:
        return unavailable("codebase-memory-mcp executable not found")

    use_cmd_wrapper = False
    if os.name == 'nt':
        lower_path = exe_path.lower()
        if lower_path.endswith('.cmd') or lower_path.endswith('.bat'):
            use_cmd_wrapper = True

    if use_cmd_wrapper:
        program = "cmd.exe"
        cmd_args = ["/S", "/C", exe_path]
    else:
        program = exe_path
        cmd_args = []

    cmd_args.extend(["cli", tool_name, json.dumps(arguments or {}, ensure_ascii=False)])

    try:
        process = await asyncio.create_subprocess_exec(
            program,
            *cmd_args,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=root_path
        )
    except (FileNotFoundError, PermissionError) as exc:
        logger.warning(f"CLI startup failed: {exc}")
        return unavailable(f"CLI startup failed: {exc}")
    except Exception as exc:
        logger.warning(f"CLI unexpected startup failed: {exc}")
        return unavailable(f"CLI startup failed: {exc}")

    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=EXTERNAL_CLI_TIMEOUT_SECONDS
        )
    except asyncio.TimeoutError:
        logger.warning(f"CLI execution timed out ({EXTERNAL_CLI_TIMEOUT_SECONDS:g}s)")
        await _safe_kill_process(process, use_taskkill=use_cmd_wrapper)
        return unavailable(
            f"codebase-memory-mcp {tool_name} timed out after {EXTERNAL_CLI_TIMEOUT_SECONDS:g}s"
        )
    except Exception as exc:
        logger.warning(f"CLI execution failed with exception: {exc}")
        await _safe_kill_process(process, use_taskkill=use_cmd_wrapper)
        return unavailable(f"CLI execution failed: {exc}")

    if process.returncode != 0:
        error = stderr.decode(errors="ignore").strip()
        logger.warning(f"CLI returned non-zero code {process.returncode}, stderr: {error}")
        return unavailable(error or f"CLI returned exit code {process.returncode}")

    try:
        decoded_stdout = stdout.decode('utf-8', errors='ignore')
        data = json.loads(decoded_stdout)
        return data
    except json.JSONDecodeError as exc:
        logger.warning(f"CLI stdout is not valid JSON: {exc}")
        return unavailable(f"CLI returned invalid JSON: {exc}")


def _normalize_path(p: str | Path) -> str:
    return Path(p).resolve().as_posix().lower()


def _resolve_project_name(projects: Union[dict, list], root_path: Path) -> str | None:
    if isinstance(projects, dict):
        projects = projects.get("projects", [])
    if not isinstance(projects, list):
        return None
    
    try:
        target_norm = _normalize_path(root_path)
    except Exception:
        return None

    for project in projects:
        if not isinstance(project, dict):
            continue
        p_path = project.get("root_path") or project.get("path")
        if not p_path or not isinstance(p_path, str):
            continue
        try:
            if _normalize_path(p_path) == target_norm:
                return project.get("name")
        except Exception:
            continue
    return None


_PROCESS_REBUILD_LOCK = threading.Lock()
LOCK_STALE_SECONDS = 30
LOCK_WAIT_SECONDS = 10


def split_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current_heading = "Document"
    current_lines: list[str] = []
    in_code_block = False

    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code_block = not in_code_block
            current_lines.append(line)
            continue

        if not in_code_block and line.startswith("#"):
            if current_lines:
                sections[current_heading] = "\n".join(current_lines).strip()
                current_lines = []
            current_heading = line.lstrip("#").strip() or "Document"
            continue

        if not in_code_block and stripped.startswith("<!-- BEGIN AUTO-GENERATED:"):
            if current_lines:
                sections[current_heading] = "\n".join(current_lines).strip()
                current_lines = []
            current_heading = "_auto_generated"
            continue

        current_lines.append(line)

    if current_lines:
        sections[current_heading] = "\n".join(current_lines).strip()
    return sections


def _strip_markers(text: str) -> str:
    return "\n".join(
        line for line in text.splitlines()
        if not line.strip().startswith("<!-- BEGIN AUTO-GENERATED:")
        and not line.strip().startswith("<!-- END AUTO-GENERATED:")
    )


def read_memory_sections_for_root(root: Path) -> dict[str, str]:
    memory_path = root / "MEMORY.md"
    if not memory_path.exists():
        return {}
    sections = split_sections(memory_path.read_text(encoding="utf-8", errors="ignore"))
    return {k: _strip_markers(v) for k, v in sections.items()}


def _current_file_hashes(root: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for path in iter_candidate_files(root):
        relative = path.relative_to(root).as_posix()
        hashes[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
    return hashes


def index_stale_reasons(root: Path, payload: dict | None = None) -> list[str]:
    index_path = root / INDEX_DIR / INDEX_FILE
    if payload is None:
        if not index_path.exists():
            return ["index is missing"]
        try:
            payload = json.loads(index_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            return [f"index is unreadable: {exc}"]

    previous_hashes = payload.get("file_hashes")
    if not isinstance(previous_hashes, dict):
        return ["index is stale: missing file_hashes"]

    try:
        current_hashes = _current_file_hashes(root)
    except OSError as exc:
        return [f"index freshness check failed: {exc}"]

    reasons: list[str] = []
    previous_paths = set(previous_hashes)
    current_paths = set(current_hashes)
    new_paths = sorted(current_paths - previous_paths)
    removed_paths = sorted(previous_paths - current_paths)
    changed_paths = sorted(path for path in current_paths & previous_paths if current_hashes[path] != previous_hashes[path])

    if new_paths:
        reasons.append(f"index is stale: new indexed files: {', '.join(new_paths[:5])}")
    if removed_paths:
        reasons.append(f"index is stale: removed indexed files: {', '.join(removed_paths[:5])}")
    if changed_paths:
        reasons.append(f"index is stale: changed indexed files: {', '.join(changed_paths[:5])}")
    return reasons


def _acquire_rebuild_lock(index_path: Path) -> tuple[int, Path]:
    lock_path = index_path.with_name(index_path.name + ".lock")
    deadline = time.time() + LOCK_WAIT_SECONDS

    while True:
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f"{os.getpid()} {time.time()}".encode("utf-8"))
            return fd, lock_path
        except FileExistsError:
            try:
                if time.time() - lock_path.stat().st_mtime > LOCK_STALE_SECONDS:
                    lock_path.unlink()
                    continue
            except OSError:
                pass
            if time.time() >= deadline:
                raise TimeoutError(f"Timed out waiting for index rebuild lock: {lock_path}")
            time.sleep(0.05)


def _release_rebuild_lock(fd: int, lock_path: Path) -> None:
    os.close(fd)
    try:
        lock_path.unlink()
    except FileNotFoundError:
        pass


def ensure_index(root: Path) -> Path:
    index_dir = root / INDEX_DIR
    index_dir.mkdir(parents=True, exist_ok=True)
    index_path = index_dir / INDEX_FILE

    with _PROCESS_REBUILD_LOCK:
        fd, lock_path = _acquire_rebuild_lock(index_path)
        try:
            if index_path.exists() and not should_rebuild_index(root):
                return index_path
            payload = build_index(root)
            write_index_atomic(index_path, payload)
        finally:
            _release_rebuild_lock(fd, lock_path)
    return index_path


def load_index(root: Path) -> dict:
    index_path = root / INDEX_DIR / INDEX_FILE
    if not index_path.exists():
        ensure_index(root)
    try:
        payload = json.loads(index_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        ensure_index(root)
        payload = json.loads(index_path.read_text(encoding="utf-8"))

    indexed_root = Path(payload["project_root"]).resolve()
    if indexed_root != root.resolve():
        raise RuntimeError(f"Index root mismatch: expected {root}, found {indexed_root}")
    return payload


def read_existing_index(root: Path) -> dict:
    """Read the last good on-disk index without attempting a rebuild."""
    index_path = root / INDEX_DIR / INDEX_FILE
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    indexed_root = Path(payload["project_root"]).resolve()
    if indexed_root != root.resolve():
        raise RuntimeError(f"Index root mismatch: expected {root}, found {indexed_root}")
    return payload


def search_memory_for_root(
    root: Path,
    query: str,
    limit: int = 8,
    category: str | None = None,
    scope: str | None = None,
) -> dict:
    fallback_used = False
    warnings: list[str] = []

    try:
        if should_rebuild_index(root):
            ensure_index(root)
        payload = load_index(root)
    except Exception as exc:
        fallback_used = True
        warnings.append(f"Index refresh failed; using the last on-disk index: {exc}")
        try:
            payload = read_existing_index(root)
        except Exception as fallback_exc:
            return {
                "status": "server_unavailable",
                "available": False,
                "root": str(root),
                "source": str(root / INDEX_DIR / INDEX_FILE),
                "fallback_used": True,
                "results": [],
                "warnings": [*warnings, f"Local index fallback failed: {fallback_exc}"],
            }

    try:
        search_payload = search_entries(payload, query, limit=limit, category=category, scope=scope)
    except Exception as exc:
        return {
            "status": "server_unavailable",
            "available": False,
            "root": str(root),
            "source": str(root / INDEX_DIR / INDEX_FILE),
            "fallback_used": fallback_used,
            "results": [],
            "warnings": [*warnings, f"Local index query failed: {exc}"],
        }

    search_payload.update(
        {
            "status": "degraded" if fallback_used else "ready",
            "available": True,
            "root": str(root),
            "source": str(root / INDEX_DIR / INDEX_FILE),
            "fallback_used": fallback_used,
            "warnings": warnings,
        }
    )
    return search_payload


def should_rebuild_index(root: Path) -> bool:
    return bool(index_stale_reasons(root))


async def get_memory_health_for_root(root: Path, server: ProjectMemoryMCP) -> dict:
    now = time.time()
    if now - server._last_checked_time < HEALTH_CACHE_TTL_SECONDS and server._last_health_result is not None:
        return server._last_health_result

    try:
        result = await _run_memory_health_check_impl(root)
        server._last_health_result = result
        server._last_checked_time = now
        return result
    except Exception as exc:
        fallback_res = {
            **_FALLBACK_HEALTH_TEMPLATE,
            "root": str(root),
            "warnings": [f"Health check failed with exception: {exc}"]
        }
        server._last_health_result = fallback_res
        server._last_checked_time = now
        return fallback_res


async def _run_memory_health_check_impl(root: Path) -> dict:
    index_path = root / INDEX_DIR / INDEX_FILE
    memory_path = root / "MEMORY.md"
    docs_dir = root / "docs"
    docs_index_path = docs_dir / "INDEX.md"

    payload: dict[str, object] | None = None
    warnings: list[str] = []
    category_counts: dict[str, int] = {}
    scope_counts: dict[str, int] = {}
    index_built_at: str | None = None
    index_age_days: int | None = None
    quality_checks: dict[str, bool] = {}

    if index_path.exists():
        try:
            payload = load_index(root)
            warnings.extend(index_stale_reasons(root, payload))
            index_built_at = str(payload.get("built_at") or "")
            if index_built_at:
                try:
                    built_at = datetime.fromisoformat(index_built_at)
                    if built_at.tzinfo is None:
                        built_at = built_at.replace(tzinfo=timezone.utc)
                    index_age_days = max(0, (datetime.now(timezone.utc) - built_at).days)
                except ValueError:
                    warnings.append(f"Index timestamp is invalid: {index_built_at}")

            for entry in payload.get("entries", []):
                if not isinstance(entry, dict):
                    continue
                category = str(entry.get("category") or "unknown")
                scope = str(entry.get("scope") or "unknown")
                category_counts[category] = category_counts.get(category, 0) + 1
                scope_counts[scope] = scope_counts.get(scope, 0) + 1
        except Exception as e:
            warnings.append(f"Failed to load index: {e}")
    else:
        warnings.append("Memory index is missing. Run build_project_memory_index.py --write.")

    sections = read_memory_sections_for_root(root)
    if not memory_path.exists():
        warnings.append("MEMORY.md is missing.")

    # random_query_clean
    if payload:
        try:
            import uuid
            smoke_query = f"__health_smoke_{uuid.uuid4().hex}__"
            test_result = search_entries(payload, smoke_query, limit=8)
            quality_checks["random_query_clean"] = len(test_result.get("results", [])) == 0
        except Exception:
            quality_checks["random_query_clean"] = False
    else:
        quality_checks["random_query_clean"] = False

    # known_query_accurate
    if payload:
        try:
            test_result = search_entries(payload, "entry points", limit=1)
            results = test_result.get("results", [])
            quality_checks["known_query_accurate"] = (
                len(results) > 0 and results[0].get("category") == "entry-point"
            )
        except Exception:
            quality_checks["known_query_accurate"] = False
    else:
        quality_checks["known_query_accurate"] = False

    # section_getters_clean
    marker_leaked = any("BEGIN AUTO-GENERATED" in v for v in sections.values() if isinstance(v, str))
    quality_checks["section_getters_clean"] = not marker_leaked

    # no_duplicate_runtime
    skill_dir = root / ".agents" / "skills" / "project-memory-refresh"
    duplicate_dirs = []
    if skill_dir.exists():
        duplicate_dirs = [
            d.name
            for d in skill_dir.iterdir()
            if d.is_dir() and any(kw in d.name.lower() for kw in ("複製", "copy", "backup"))
        ]
    quality_checks["no_duplicate_runtime"] = len(duplicate_dirs) == 0

    # skill_manifest_exists
    quality_checks["skill_manifest_exists"] = (skill_dir / "SKILL.md").exists() if skill_dir.exists() else False

    projects = await _detect_and_run_mcp_cli("list_projects", root)
    external_error = projects.get("error") if isinstance(projects, dict) else None
    available = not (isinstance(projects, dict) and projects.get("available") is False)
    project_name = _resolve_project_name(projects, root)
    if project_name is None:
        status_data: dict = {}
        indexed_at = None
        is_stale = None
        graph_status = "not_indexed" if available else "unavailable"
    else:
        raw_status = await _detect_and_run_mcp_cli("index_status", root, {"project": project_name})
        status_data = raw_status if isinstance(raw_status, dict) else {}
        if status_data.get("available") is False:
            graph_status = "degraded"
            external_error = status_data.get("error")
        else:
            graph_status = str(status_data.get("status") or "ready")
        indexed_at = status_data.get("indexed_at") if isinstance(status_data, dict) else None
        is_stale = status_data.get("is_stale")
        if is_stale is None and graph_status == "ready":
            is_stale = False

    codebase_graph_status = {
        "available": available,
        "status": graph_status,
        "project_name": project_name,
        "indexed_at": indexed_at,
        "is_stale": is_stale,
        "nodes": status_data.get("nodes"),
        "edges": status_data.get("edges"),
        "error": external_error,
    }

    # bridge_consistent
    project_list = projects.get("projects") if isinstance(projects, dict) else projects
    if available and isinstance(project_list, list):
        bridge_consistent = (project_name is not None)
    else:
        bridge_consistent = True
    quality_checks["bridge_consistent"] = bridge_consistent

    # 完善警告邏輯
    if available:
        if project_name is None:
            warnings.append("Codebase graph index not found. Run 'codebase-memory-mcp index_repository' to refresh.")
        elif is_stale:
            warnings.append("Codebase graph index is stale. Run 'codebase-memory-mcp index_repository' to refresh.")
    else:
        warnings.append(f"Codebase graph server unavailable: {external_error or 'unknown error'}")

    # Warnings for failed quality checks
    if not quality_checks["random_query_clean"]:
        warnings.append("Quality check failed: random query is not clean (score pollution detected).")
    if not quality_checks["known_query_accurate"]:
        warnings.append("Quality check failed: known query 'entry points' did not map to entry-point category.")
    if not quality_checks["section_getters_clean"]:
        warnings.append("Quality check failed: Section getters leaked AUTO-GENERATED markers.")
    if not quality_checks["no_duplicate_runtime"]:
        warnings.append(f"Quality check failed: Duplicate runtime directories found: {', '.join(duplicate_dirs)}")
    if not quality_checks["skill_manifest_exists"]:
        warnings.append("Quality check failed: SKILL.md manifest is missing in skill directory.")

    missing_sections = sorted(section for section in EXPECTED_MEMORY_SECTIONS if not sections.get(section, "").strip())
    critical_gaps = sorted(section for section in HEALTH_CRITICAL_SECTIONS if not sections.get(section, "").strip())
    if critical_gaps:
        warnings.append(f"Critical memory sections need curation: {', '.join(critical_gaps)}")
    if docs_dir.exists() and not docs_index_path.exists():
        warnings.append("docs/ exists but docs/INDEX.md is missing.")
    if index_age_days is not None and index_age_days > 7:
        warnings.append(f"Memory index is stale ({index_age_days} days old).")

    local_index_available = isinstance(payload, dict)
    local_index_status = "ready"
    if not index_path.exists():
        local_index_status = "missing"
    elif not local_index_available:
        local_index_status = "error"
    elif index_stale_reasons(root, payload):
        local_index_status = "stale"

    overall_status = "ready"
    if not local_index_available:
        overall_status = "server_unavailable"
    elif not available or graph_status in {"degraded", "not_indexed"}:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "root": str(root),
        "memory_exists": memory_path.exists(),
        "index_exists": index_path.exists(),
        "docs_index_exists": docs_index_path.exists(),
        "index_built_at": index_built_at,
        "index_age_days": index_age_days,
        "entry_count": int(payload.get("entry_count", 0)) if isinstance(payload, dict) else 0,
        "category_counts": category_counts,
        "scope_counts": scope_counts,
        "missing_sections": missing_sections,
        "warnings": warnings,
        "quality_checks": quality_checks,
        "codebase_graph_status": codebase_graph_status,
        "wrapper_status": {"available": True, "status": "ready", "transport": "stdio"},
        "local_index_status": {
            "available": local_index_available,
            "status": local_index_status,
            "path": str(index_path),
            "fallback_source": str(index_path) if local_index_available else None,
        },
    }


async def summarize_index_health_for_root(root: Path, server: ProjectMemoryMCP) -> str:
    health_data = await get_memory_health_for_root(root, server)
    
    lines = []
    lines.append(f"Memory Index Health Summary for {health_data.get('root')}:")
    lines.append(f"  Memory file exists: {health_data.get('memory_exists')}")
    lines.append(f"  Index file exists: {health_data.get('index_exists')}")
    lines.append(f"  Docs index exists: {health_data.get('docs_index_exists')}")
    lines.append(f"  Overall status: {health_data.get('status')}")

    wrapper_status = health_data.get("wrapper_status", {})
    local_status = health_data.get("local_index_status", {})
    lines.append(
        f"  Wrapper: {wrapper_status.get('status')} (available={wrapper_status.get('available')})"
    )
    lines.append(
        f"  Local index: {local_status.get('status')} (available={local_status.get('available')})"
    )
    
    cgs = health_data.get("codebase_graph_status", {})
    lines.append("  Codebase Graph Status:")
    lines.append(f"    Status: {cgs.get('status')}")
    lines.append(f"    Available: {cgs.get('available')}")
    lines.append(f"    Project Name: {cgs.get('project_name')}")
    lines.append(f"    Indexed At: {cgs.get('indexed_at')}")
    lines.append(f"    Is Stale: {cgs.get('is_stale')}")

    warnings = health_data.get("warnings", [])
    if warnings:
        lines.append("  Warnings:")
        for w in warnings:
            lines.append(f"    - {w}")
    else:
        lines.append("  Warnings: None")
        
    quality = health_data.get("quality_checks", {})
    if quality:
        lines.append("  Quality Checks:")
        for k, v in quality.items():
            status = "PASS" if v else "FAIL"
            lines.append(f"    - {k}: {status}")
            
    return "\n".join(lines)


def create_server(root: Path) -> ProjectMemoryMCP:
    resolved_root = root.resolve()
    if not resolved_root.exists() or not resolved_root.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {resolved_root}")

    server = ProjectMemoryMCP(
        name="project-memory",
        instructions=(
            "Project-local memory server. This instance is scoped to one project root only. "
            "Do not use it for sibling or parent repositories."
        ),
    )

    def read_memory_sections() -> dict[str, str]:
        return read_memory_sections_for_root(resolved_root)

    @server.tool(description="Search the project-local memory index for the current project with optional category or scope filters.")
    def search_memory(
        query: str,
        limit: int = 8,
        category: str | None = None,
        scope: str | None = None,
    ) -> dict:
        return search_memory_for_root(
            resolved_root,
            query,
            limit=limit,
            category=category,
            scope=scope,
        )

    @server.tool(description="Return the current Aliases & Vocabulary section from MEMORY.md.")
    def get_aliases() -> dict:
        sections = read_memory_sections()
        return {
            "root": str(resolved_root),
            "section": "Aliases & Vocabulary",
            "content": sections.get("Aliases & Vocabulary", ""),
        }

    @server.tool(description="Return the current Source of Truth section from MEMORY.md.")
    def get_source_of_truth() -> dict:
        sections = read_memory_sections()
        return {
            "root": str(resolved_root),
            "section": "Source of Truth",
            "content": sections.get("Source of Truth", ""),
        }

    @server.tool(description="Return the current Entry Points section from MEMORY.md.")
    def get_entry_points() -> dict:
        sections = read_memory_sections()
        return {
            "root": str(resolved_root),
            "section": "Entry Points",
            "content": sections.get("Entry Points", ""),
        }

    @server.tool(description="Return the current Hotspots section from MEMORY.md.")
    def get_hotspots() -> dict:
        sections = read_memory_sections()
        return {"root": str(resolved_root), "section": "Hotspots", "content": sections.get("Hotspots", "")}

    @server.tool(description="Return the current Search Recipes section from MEMORY.md.")
    def get_search_recipes() -> dict:
        sections = read_memory_sections()
        return {
            "root": str(resolved_root),
            "section": "Search Recipes",
            "content": sections.get("Search Recipes", ""),
        }

    @server.tool(description="Return memory coverage and freshness warnings for this project.")
    async def get_memory_health() -> dict:
        return await get_memory_health_for_root(resolved_root, server)

    @server.tool(description="Return a formatted summary of the memory index health.")
    async def summarize_index_health() -> str:
        return await summarize_index_health_for_root(resolved_root, server)

    @server.tool(description="Rebuild the local memory index and docs index for this project.")
    def rebuild_project_memory_cache() -> dict:
        index_path = ensure_index(resolved_root)
        docs_index_path = None
        docs_dir = resolved_root / "docs"
        if docs_dir.exists():
            docs_index_path = docs_dir / "INDEX.md"
            docs_index_path.write_text(build_index_text(docs_dir), encoding="utf-8", newline="\n")
        return {
            "root": str(resolved_root),
            "memory_index": str(index_path),
            "docs_index": str(docs_index_path) if docs_index_path else None,
        }

    @server.resource(
        "project-memory://summary",
        name="Project Memory Summary",
        description="Project-local summary from MEMORY.md",
        mime_type="text/markdown",
    )
    def summary_resource() -> str:
        memory_path = resolved_root / "MEMORY.md"
        if not memory_path.exists():
            return "# MEMORY.md\n\nMissing.\n"
        return memory_path.read_text(encoding="utf-8", errors="ignore")

    @server.resource(
        "project-memory://docs-index",
        name="Project Docs Index",
        description="Archive index for docs/ when present",
        mime_type="text/markdown",
    )
    def docs_index_resource() -> str:
        index_path = resolved_root / "docs" / "INDEX.md"
        if not index_path.exists():
            return "# Docs Index\n\nMissing.\n"
        return index_path.read_text(encoding="utf-8", errors="ignore")

    return server


def main() -> int:
    args = parse_args()
    server = create_server(Path(args.root))
    server.run(transport="stdio")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
