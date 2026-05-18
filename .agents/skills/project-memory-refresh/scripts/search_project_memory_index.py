from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from project_memory_search import search_entries


INDEX_DIR = ".memory-index"
INDEX_FILE = "index.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Search a project-local memory index.")
    parser.add_argument("--root", required=True, help="Project root.")
    parser.add_argument("--query", required=True, help="Search query.")
    parser.add_argument("--limit", type=int, default=8, help="Maximum results.")
    parser.add_argument("--category", help="Filter to one category.")
    parser.add_argument("--scope", help="Filter to one scope: memory, rules, openspec, archive, source.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    index_path = root / INDEX_DIR / INDEX_FILE
    if not index_path.exists():
        raise SystemExit(f"Memory index not found: {index_path}")

    payload = json.loads(index_path.read_text(encoding="utf-8"))
    indexed_root = Path(payload["project_root"]).resolve()
    if indexed_root != root:
        raise SystemExit(f"Index root mismatch: expected {root}, found {indexed_root}")

    search_payload = search_entries(payload, args.query, limit=args.limit, category=args.category, scope=args.scope)

    lines: list[str] = [f"# Search Results", "", f"- Query: `{args.query}`", f"- Root: `{root}`"]
    if args.category:
        lines.append(f"- Category: `{args.category}`")
    if args.scope:
        lines.append(f"- Scope: `{args.scope}`")
    profile = search_payload.get("profile", {})
    lines.extend(
        [
            f"- Terms: `{', '.join(profile.get('terms', []))}`",
            f"- Intents: `{', '.join(profile.get('intents', []))}`",
        ]
    )
    if not search_payload.get("results"):
        lines.extend(["", "- No matching entries found."])
        sys.stdout.buffer.write("\n".join(lines).encode("utf-8", errors="replace"))
        return 0

    for entry in search_payload["results"]:
        snippet = entry["snippet"][:220].strip()
        lines.extend(
            [
                "",
                f"## {entry['path']} :: {entry['heading']}",
                f"- Category: `{entry.get('category', 'unknown')}`",
                f"- Scope: `{entry.get('scope', 'unknown')}`",
                f"- Score: `{entry['score']}`",
                f"- Matched Terms: `{', '.join(entry.get('matched_terms', []))}`",
                f"- Reasons: `{', '.join(entry.get('reasons', []))}`",
                f"- Snippet: {snippet}",
            ]
        )
    sys.stdout.buffer.write("\n".join(lines).encode("utf-8", errors="replace"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
