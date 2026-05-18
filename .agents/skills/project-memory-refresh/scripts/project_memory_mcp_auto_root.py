from __future__ import annotations

import os
from pathlib import Path

from project_memory_mcp_server import create_server


ROOT_MARKERS = [
    ".git",
    "AGENTS.md",
    "MEMORY.md",
    "package.json",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "requirements.txt",
]
DISALLOWED_ROOTS = {
    Path(r"C:\Users\user").resolve(),
    Path(r"C:\Users\user\Desktop").resolve(),
    Path(r"C:\Users\user\Downloads").resolve(),
    Path(r"C:\Users\user\Documents").resolve(),
}


def looks_like_project_root(path: Path) -> bool:
    for marker in ROOT_MARKERS:
        if (path / marker).exists():
            return True
    return False


def detect_root(start: Path) -> Path:
    current = start.resolve()
    for candidate in [current, *current.parents]:
        if candidate in DISALLOWED_ROOTS:
            continue
        if looks_like_project_root(candidate):
            return candidate
    raise SystemExit(
        f"Could not detect a safe project root from {start}. "
        "Start Codex inside a real project directory or use a project-local MCP config."
    )


def main() -> int:
    cwd = Path(os.getcwd())
    root = detect_root(cwd)
    create_server(root).run(transport="stdio")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
