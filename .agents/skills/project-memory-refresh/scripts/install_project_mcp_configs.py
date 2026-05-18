from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


SKILL_SCRIPTS = Path(__file__).resolve().parent
SERVER_SCRIPT = SKILL_SCRIPTS / "project_memory_mcp_server.py"
WRAPPER_DIR = ".project-memory"
WRAPPER_FILE = "project_memory_mcp_entry.py"
CODEX_DIR = ".codex"
CODEX_CONFIG = "config.toml"
CODEX_BEGIN = "# >>> project-memory mcp >>>"
CODEX_END = "# <<< project-memory mcp <<<"
ANTIGRAVITY_CONFIG = Path.home() / ".gemini" / "antigravity" / "mcp_config.json"
ANTIGRAVITY_RULES_DIR = ".antigravity"
ANTIGRAVITY_RULES_FILE = "rules.md"
ANTIGRAVITY_RULES_BEGIN = "<!-- >>> project-memory antigravity rules >>> -->"
ANTIGRAVITY_RULES_END = "<!-- <<< project-memory antigravity rules <<< -->"
GEMINI_CONTEXT_FILE = "AGENTS.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Install project-local MCP configs for project-memory.")
    parser.add_argument("--root", action="append", required=True, help="Project root. Repeat for multiple projects.")
    parser.add_argument(
        "--tools",
        default="gemini,cursor,generic,codex,antigravity",
        help="Comma-separated targets: gemini,cursor,generic,codex,antigravity",
    )
    return parser.parse_args()


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        text = path.read_text(encoding="utf-8")
        if not text.strip():
            return {}
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")


def wrapper_content() -> str:
    return f"""from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_SKILL_SCRIPTS = ROOT / ".agents" / "skills" / "project-memory-refresh" / "scripts"
CANONICAL_GLOBAL_SKILL_SCRIPTS = Path.home() / ".agents" / "skills" / "project-memory-refresh" / "scripts"
GENERATED_FROM_SKILL_SCRIPTS = Path(r"{SKILL_SCRIPTS}")

for candidate in (LOCAL_SKILL_SCRIPTS, CANONICAL_GLOBAL_SKILL_SCRIPTS, GENERATED_FROM_SKILL_SCRIPTS):
    if (candidate / "project_memory_mcp_server.py").exists():
        if str(candidate) not in sys.path:
            sys.path.insert(0, str(candidate))
        break
else:
    raise SystemExit(
        "Could not find project_memory_mcp_server.py in repo-local or global project-memory-refresh scripts."
    )

from project_memory_mcp_server import create_server

if __name__ == "__main__":
    create_server(ROOT).run(transport="stdio")
"""


def update_managed_block(text: str, begin: str, end: str, block: str) -> str:
    if begin in text and end in text:
        before, remainder = text.split(begin, 1)
        _, after = remainder.split(end, 1)
        updated = before.rstrip()
        if updated:
            updated += "\n\n"
        updated += block
        after = after.lstrip()
        if after:
            updated += "\n" + after
        else:
            updated += "\n"
        return updated

    updated = text.rstrip()
    if updated:
        updated += "\n\n"
    updated += block + "\n"
    return updated


def install_wrapper(root: Path) -> Path:
    wrapper_path = root / WRAPPER_DIR / WRAPPER_FILE
    wrapper_path.parent.mkdir(parents=True, exist_ok=True)
    wrapper_path.write_text(wrapper_content(), encoding="utf-8", newline="\n")
    return wrapper_path


def mcp_server_block(wrapper_path: Path) -> dict:
    return {
        "command": "python",
        "args": [str(wrapper_path)],
    }


def normalize_args(args: object) -> list[str]:
    if not isinstance(args, list):
        return []
    return [str(item) for item in args if isinstance(item, (str, Path))]


def json_project_memory_matches(payload: dict, wrapper_path: Path, *, require_cursor_type: bool = False) -> bool:
    server = payload.get("mcpServers", {}).get("project-memory")
    if not isinstance(server, dict):
        return False
    if str(server.get("command") or "").strip().lower() != "python":
        return False
    args = normalize_args(server.get("args"))
    if args != [str(wrapper_path)]:
        return False
    if require_cursor_type and server.get("type") != "stdio":
        return False
    return True


def ensure_gemini_context(payload: dict) -> None:
    payload.pop("contextFileName", None)

    context = payload.get("context")
    if not isinstance(context, dict):
        context = {}
        payload["context"] = context

    existing = context.get("fileName")
    file_names: list[str] = []
    if isinstance(existing, str) and existing.strip():
        file_names = [existing.strip()]
    elif isinstance(existing, list):
        file_names = [item.strip() for item in existing if isinstance(item, str) and item.strip()]

    if GEMINI_CONTEXT_FILE in file_names:
        file_names = [GEMINI_CONTEXT_FILE] + [item for item in file_names if item != GEMINI_CONTEXT_FILE]
    else:
        file_names = [GEMINI_CONTEXT_FILE, *file_names]

    context["fileName"] = file_names


def antigravity_server_name(root: Path) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", root.name.lower()).strip("-") or "project"
    digest = hashlib.sha1(str(root).encode("utf-8")).hexdigest()[:8]
    slug = slug[:19].strip("-") or "project"
    return f"pm-{slug}-{digest}"


def antigravity_entry_matches_target(server: dict, root: Path, wrapper_path: Path) -> bool:
    if not isinstance(server, dict):
        return False
    command = str(server.get("command") or "").strip().lower()
    args = normalize_args(server.get("args"))
    env = server.get("env")
    return (
        command == "python"
        and args == [str(wrapper_path)]
        and isinstance(env, dict)
        and env.get("PROJECT_ROOT") == str(root)
    )


def is_same_antigravity_project(server: dict, root: Path, wrapper_path: Path) -> bool:
    if antigravity_entry_matches_target(server, root, wrapper_path):
        return True
    if not isinstance(server, dict):
        return False
    args = normalize_args(server.get("args"))
    env = server.get("env")
    if args == [str(wrapper_path)]:
        return True
    return isinstance(env, dict) and env.get("PROJECT_ROOT") == str(root)


def install_gemini(root: Path, wrapper_path: Path) -> Path:
    settings_path = root / ".gemini" / "settings.json"
    payload = load_json(settings_path)
    ensure_gemini_context(payload)
    payload.setdefault("mcpServers", {})
    payload["mcpServers"]["project-memory"] = mcp_server_block(wrapper_path)
    write_json(settings_path, payload)
    return settings_path


def install_cursor(root: Path, wrapper_path: Path) -> Path:
    settings_path = root / ".cursor" / "mcp.json"
    payload = load_json(settings_path)
    payload.setdefault("mcpServers", {})
    payload["mcpServers"]["project-memory"] = {
        "type": "stdio",
        **mcp_server_block(wrapper_path),
    }
    write_json(settings_path, payload)
    return settings_path


def install_generic(root: Path, wrapper_path: Path) -> Path:
    settings_path = root / ".mcp.json"
    payload = load_json(settings_path)
    payload.setdefault("mcpServers", {})
    payload["mcpServers"]["project-memory"] = mcp_server_block(wrapper_path)
    write_json(settings_path, payload)
    return settings_path


def install_antigravity(root: Path, wrapper_path: Path) -> tuple[Path, str]:
    settings_path = ANTIGRAVITY_CONFIG
    payload = load_json(settings_path)
    payload.setdefault("mcpServers", {})
    existing_servers = payload["mcpServers"]
    for name in list(existing_servers.keys()):
        if is_same_antigravity_project(existing_servers.get(name), root, wrapper_path):
            existing_servers.pop(name, None)
    server_name = antigravity_server_name(root)
    existing_servers[server_name] = {
        "command": "python",
        "args": [str(wrapper_path)],
        "env": {
            "PROJECT_ROOT": str(root),
        },
    }
    write_json(settings_path, payload)
    return settings_path, server_name


def antigravity_rules_block(root: Path, server_name: str) -> str:
    return "\n".join(
        [
            ANTIGRAVITY_RULES_BEGIN,
            "## Project Memory Tool Routing",
            "",
            "- This block is additive. Do not rewrite existing project rules above.",
            f"- In this repository, use `{server_name}` for project memory tasks.",
            "- Do not use other `project-memory`, `project-memory-*`, or `pm-*` servers unless the user explicitly asks for cross-project analysis.",
            "- Before broad search, prefer `get_entry_points`, `get_hotspots`, or `search_memory` from the matching project memory server.",
            "- If memory is missing, stale, or the root has scattered report markdown, trigger the project memory refresh workflow before broad exploration.",
            f"- This repository root is `{root}`. Only use memory files, docs archives, and indexes inside this root.",
            ANTIGRAVITY_RULES_END,
        ]
    )


def install_antigravity_rules(root: Path) -> Path:
    rules_path = root / ANTIGRAVITY_RULES_DIR / ANTIGRAVITY_RULES_FILE
    rules_path.parent.mkdir(parents=True, exist_ok=True)
    existing = rules_path.read_text(encoding="utf-8") if rules_path.exists() else ""
    block = antigravity_rules_block(root, antigravity_server_name(root))
    updated = update_managed_block(existing, ANTIGRAVITY_RULES_BEGIN, ANTIGRAVITY_RULES_END, block)
    rules_path.write_text(updated, encoding="utf-8", newline="\n")
    return rules_path


def toml_literal(value: str) -> str:
    return "'" + value.replace("'", "\\'") + "'"


def codex_block(root: Path, wrapper_path: Path) -> str:
    return "\n".join(
        [
            CODEX_BEGIN,
            "[mcp_servers.project-memory]",
            f"command = {toml_literal('python')}",
            f"args = [{toml_literal(str(wrapper_path))}]",
            f"cwd = {toml_literal(str(root))}",
            "enabled = true",
            CODEX_END,
            "",
        ]
    )


def codex_project_memory_matches(path: Path, root: Path, wrapper_path: Path) -> bool:
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8", errors="ignore")
    return (
        "[mcp_servers.project-memory]" in text
        and toml_literal(str(wrapper_path)) in text
        and toml_literal(str(root)) in text
    )


def install_codex(root: Path, wrapper_path: Path) -> Path:
    config_path = root / CODEX_DIR / CODEX_CONFIG
    config_path.parent.mkdir(parents=True, exist_ok=True)
    existing = config_path.read_text(encoding="utf-8") if config_path.exists() else ""
    block = codex_block(root, wrapper_path)
    if CODEX_BEGIN in existing and CODEX_END in existing:
        before, remainder = existing.split(CODEX_BEGIN, 1)
        _, after = remainder.split(CODEX_END, 1)
        updated = before.rstrip() + "\n\n" + block + after.lstrip()
    elif "[mcp_servers.project-memory]" in existing:
        pattern = re.compile(r"(?ms)^\[mcp_servers\.project-memory\]\n.*?(?=^\[|\Z)")
        if pattern.search(existing):
            updated = pattern.sub(block, existing, count=1)
        else:
            updated = existing.rstrip()
            if updated:
                updated += "\n\n"
            updated += block
    else:
        updated = existing.rstrip()
        if updated:
            updated += "\n\n"
        updated += block
    config_path.write_text(updated, encoding="utf-8", newline="\n")
    return config_path


def main() -> int:
    args = parse_args()
    tools = {item.strip().lower() for item in args.tools.split(",") if item.strip()}
    supported = {"gemini", "cursor", "generic", "codex", "antigravity"}
    unknown = tools - supported
    if unknown:
        raise SystemExit(f"Unsupported tools: {', '.join(sorted(unknown))}")

    for raw_root in args.root:
        root = Path(raw_root).resolve()
        if not root.exists() or not root.is_dir():
            raise SystemExit(f"Root does not exist or is not a directory: {root}")

        wrapper_path = install_wrapper(root)
        print(f"Installed wrapper: {wrapper_path}")

        if "gemini" in tools:
            print(f"Updated {install_gemini(root, wrapper_path)}")
        if "cursor" in tools:
            print(f"Updated {install_cursor(root, wrapper_path)}")
        if "generic" in tools:
            print(f"Updated {install_generic(root, wrapper_path)}")
        if "codex" in tools:
            print(f"Updated {install_codex(root, wrapper_path)}")
        if "antigravity" in tools:
            config_path, server_name = install_antigravity(root, wrapper_path)
            print(f"Updated {config_path} ({server_name})")
            print(f"Updated {install_antigravity_rules(root)}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
