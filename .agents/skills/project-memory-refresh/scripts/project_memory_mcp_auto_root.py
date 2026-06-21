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
_HOME = Path.home().resolve()
DISALLOWED_ROOTS = {
    _HOME,
    _HOME / "Desktop",
    _HOME / "Downloads",
    _HOME / "Documents",
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

    raise RuntimeError(
        f"No project root detected from {start}. "
        "Ensure the working directory is inside a project with AGENTS.md, MEMORY.md, .git, or similar markers."
    )


from mcp.server.fastmcp import FastMCP

def main() -> int:
    cwd = Path(os.getcwd())
    try:
        root = detect_root(cwd)
        server = create_server(root)
    except RuntimeError as e:
        server = FastMCP(
            name="project-memory-error",
            instructions=f"Error starting server: {e}"
        )

        @server.tool(description="Search the project-local memory index.")
        def search_memory(query: str, limit: int = 8, category: str | None = None, scope: str | None = None) -> dict:
            raise RuntimeError(str(e))

        @server.tool(description="Return the current Aliases & Vocabulary section.")
        def get_aliases() -> dict:
            raise RuntimeError(str(e))

        @server.tool(description="Return the current Source of Truth section.")
        def get_source_of_truth() -> dict:
            raise RuntimeError(str(e))

        @server.tool(description="Return the current Entry Points section.")
        def get_entry_points() -> dict:
            raise RuntimeError(str(e))

        @server.tool(description="Return the current Hotspots section.")
        def get_hotspots() -> dict:
            raise RuntimeError(str(e))

        @server.tool(description="Return the current Search Recipes section.")
        def get_search_recipes() -> dict:
            raise RuntimeError(str(e))

        @server.tool(description="Return memory coverage and freshness warnings.")
        def get_memory_health() -> dict:
            return {
                "root": str(cwd),
                "memory_exists": False,
                "index_exists": False,
                "docs_index_exists": False,
                "index_built_at": None,
                "index_age_days": None,
                "entry_count": 0,
                "category_counts": {},
                "scope_counts": {},
                "missing_sections": [],
                "warnings": [str(e)],
                "quality_checks": {
                    "random_query_clean": False,
                    "known_query_accurate": False,
                    "section_getters_clean": False,
                    "no_duplicate_runtime": False,
                    "skill_manifest_exists": False
                }
            }

        @server.tool(description="Rebuild the local memory index.")
        def rebuild_project_memory_cache() -> dict:
            raise RuntimeError(str(e))

    server.run(transport="stdio")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
