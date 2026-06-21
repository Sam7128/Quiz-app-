from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
import os
from pathlib import Path
import threading
import time

from mcp.server.fastmcp import FastMCP

from build_docs_index import build_index_text
from build_project_memory_index import INDEX_DIR, INDEX_FILE, build_index, iter_candidate_files, write_index_atomic
from project_memory_search import search_entries


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Project-local memory MCP server.")
    parser.add_argument("--root", required=True, help="Project root for this MCP instance.")
    return parser.parse_args()


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


def should_rebuild_index(root: Path) -> bool:
    return bool(index_stale_reasons(root))


def summarize_index_health(root: Path) -> dict[str, object]:
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

    return {
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
    }


def create_server(root: Path) -> FastMCP:
    resolved_root = root.resolve()
    if not resolved_root.exists() or not resolved_root.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {resolved_root}")

    server = FastMCP(
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
        if should_rebuild_index(resolved_root):
            ensure_index(resolved_root)
        payload = load_index(resolved_root)
        search_payload = search_entries(payload, query, limit=limit, category=category, scope=scope)
        search_payload["root"] = str(resolved_root)
        return search_payload

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
    def get_memory_health() -> dict:
        return summarize_index_health(resolved_root)

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
