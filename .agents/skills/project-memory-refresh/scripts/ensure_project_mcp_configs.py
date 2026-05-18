from __future__ import annotations

import argparse
import json
from pathlib import Path

from install_project_mcp_configs import (
    ANTIGRAVITY_CONFIG,
    CODEX_CONFIG,
    CODEX_DIR,
    WRAPPER_DIR,
    WRAPPER_FILE,
    antigravity_server_name,
    install_antigravity,
    install_antigravity_rules,
    install_codex,
    install_cursor,
    install_gemini,
    install_generic,
    install_wrapper,
    json_project_memory_matches,
    wrapper_content,
    antigravity_entry_matches_target,
    is_same_antigravity_project,
    codex_project_memory_matches,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ensure project-local MCP configs exist for project-memory.")
    parser.add_argument("--root", action="append", required=True, help="Project root. Repeat for multiple projects.")
    parser.add_argument(
        "--tools",
        default="gemini,cursor,generic,codex,antigravity",
        help="Comma-separated targets: gemini,cursor,generic,codex,antigravity",
    )
    parser.add_argument(
        "--require-antigravity",
        action="store_true",
        help="Fail the command if Antigravity MCP installation cannot be completed.",
    )
    return parser.parse_args()


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def has_gemini_agents_context(path: Path) -> bool:
    payload = load_json(path)
    context = payload.get("context")
    if not isinstance(context, dict):
        legacy = payload.get("contextFileName")
        return isinstance(legacy, str) and legacy == "AGENTS.md"

    file_name = context.get("fileName")
    if isinstance(file_name, str):
        return file_name == "AGENTS.md"
    if isinstance(file_name, list):
        return any(isinstance(item, str) and item == "AGENTS.md" for item in file_name)
    return False


def has_antigravity_project_memory_entry(path: Path, root: Path, wrapper_path: Path) -> bool:
    payload = load_json(path)
    target_name = antigravity_server_name(root)
    servers = payload.get("mcpServers", {})
    server = servers.get(target_name)
    if antigravity_entry_matches_target(server, root, wrapper_path):
        return True
    return any(antigravity_entry_matches_target(candidate, root, wrapper_path) for candidate in servers.values())


def ensure_wrapper(root: Path) -> Path:
    wrapper_path = root / WRAPPER_DIR / WRAPPER_FILE
    desired = wrapper_content()
    if wrapper_path.exists():
        existing = wrapper_path.read_text(encoding="utf-8", errors="ignore")
        if existing == desired:
            return wrapper_path
        wrapper_path.parent.mkdir(parents=True, exist_ok=True)
        wrapper_path.write_text(desired, encoding="utf-8", newline="\n")
        return wrapper_path
    return install_wrapper(root)


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

        wrapper_path = ensure_wrapper(root)
        print(f"Wrapper ready: {wrapper_path}")

        if "gemini" in tools:
            gemini_path = root / ".gemini" / "settings.json"
            gemini_payload = load_json(gemini_path)
            if json_project_memory_matches(gemini_payload, wrapper_path) and has_gemini_agents_context(gemini_path):
                print(f"Gemini MCP/context already present: {gemini_path}")
            else:
                print(f"Installed Gemini project settings: {install_gemini(root, wrapper_path)}")

        if "cursor" in tools:
            cursor_path = root / ".cursor" / "mcp.json"
            cursor_payload = load_json(cursor_path)
            if json_project_memory_matches(cursor_payload, wrapper_path, require_cursor_type=True):
                print(f"Cursor MCP already present: {cursor_path}")
            else:
                print(f"Installed Cursor MCP: {install_cursor(root, wrapper_path)}")

        if "generic" in tools:
            generic_path = root / ".mcp.json"
            generic_payload = load_json(generic_path)
            if json_project_memory_matches(generic_payload, wrapper_path):
                print(f"Generic MCP already present: {generic_path}")
            else:
                print(f"Installed generic MCP: {install_generic(root, wrapper_path)}")

        if "codex" in tools:
            codex_path = root / CODEX_DIR / CODEX_CONFIG
            if codex_project_memory_matches(codex_path, root, wrapper_path):
                print(f"Codex MCP already present: {codex_path}")
            else:
                print(f"Installed Codex MCP: {install_codex(root, wrapper_path)}")

        if "antigravity" in tools:
            try:
                if has_antigravity_project_memory_entry(ANTIGRAVITY_CONFIG, root, wrapper_path):
                    print(f"Antigravity MCP already present: {ANTIGRAVITY_CONFIG}")
                else:
                    config_path, server_name = install_antigravity(root, wrapper_path)
                    print(f"Installed Antigravity MCP: {config_path} ({server_name})")
                print(f"Antigravity rules ready: {install_antigravity_rules(root)}")
            except OSError as exc:
                if args.require_antigravity:
                    raise SystemExit(f"Antigravity MCP setup failed for {root}: {exc}") from exc
                print(f"WARNING: Antigravity MCP setup skipped for {root}: {exc}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
