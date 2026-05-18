from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from mcp.server.fastmcp import FastMCP

from build_docs_index import build_index_text
from build_project_memory_index import INDEX_DIR, INDEX_FILE, build_index
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


def split_sections(text: str) -> dict[str, str]:
    sections: dict[str, str] = {}
    current_heading = "Document"
    current_lines: list[str] = []
    for line in text.splitlines():
        if line.startswith("#"):
            if current_lines:
                sections[current_heading] = "\n".join(current_lines).strip()
                current_lines = []
            current_heading = line.lstrip("#").strip() or "Document"
            continue
        current_lines.append(line)
    if current_lines:
        sections[current_heading] = "\n".join(current_lines).strip()
    return sections

def ensure_index(root: Path) -> Path:
    index_dir = root / INDEX_DIR
    index_dir.mkdir(parents=True, exist_ok=True)
    index_path = index_dir / INDEX_FILE
    payload = build_index(root)
    index_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    return index_path


def load_index(root: Path) -> dict:
    index_path = root / INDEX_DIR / INDEX_FILE
    if not index_path.exists():
        ensure_index(root)
    payload = json.loads(index_path.read_text(encoding="utf-8"))
    indexed_root = Path(payload["project_root"]).resolve()
    if indexed_root != root.resolve():
        raise RuntimeError(f"Index root mismatch: expected {root}, found {indexed_root}")
    return payload

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

    if index_path.exists():
        payload = load_index(root)
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
    else:
        warnings.append("Memory index is missing. Run build_project_memory_index.py --write.")

    sections: dict[str, str] = {}
    if memory_path.exists():
        sections = split_sections(memory_path.read_text(encoding="utf-8", errors="ignore"))
    else:
        warnings.append("MEMORY.md is missing.")

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
        memory_path = resolved_root / "MEMORY.md"
        if not memory_path.exists():
            return {}
        return split_sections(memory_path.read_text(encoding="utf-8", errors="ignore"))

    @server.tool(description="Search the project-local memory index for the current project with optional category or scope filters.")
    def search_memory(
        query: str,
        limit: int = 8,
        category: str | None = None,
        scope: str | None = None,
    ) -> dict:
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
