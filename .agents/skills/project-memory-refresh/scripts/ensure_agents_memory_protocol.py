from __future__ import annotations

import argparse
from pathlib import Path


BEGIN = "<!-- >>> project-memory protocol >>> -->"
END = "<!-- <<< project-memory protocol <<< -->"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ensure AGENTS.md contains the project memory protocol block.")
    parser.add_argument("--root", action="append", required=True, help="Project root. Repeat for multiple projects.")
    return parser.parse_args()


def protocol_block() -> str:
    return "\n".join(
        [
            BEGIN,
            "## Memory Refresh Protocol",
            "",
            "- This section is additive. Do not rewrite existing `/init` instructions, design system rules, style guidance, or architecture guidance above.",
            "- At task start, read `MEMORY.md` before broad exploration if the file exists.",
            "- If a matching `project-memory` MCP server is available for this repository, use it proactively at task start to inspect `Entry Points`, `Hotspots`, or targeted memory search before broad recursive search.",
            "- If `MEMORY.md` is missing, stale, or the project structure changed, refresh it before continuing.",
            "- At task end, update `MEMORY.md` when you changed architecture, moved files, added new modules, or discovered durable constraints.",
            "- Keep memory project-scoped: do not create `GEMINI.md`, dated memory logs, or duplicate note files unless explicitly requested.",
            "- Prefer one canonical `MEMORY.md` plus nested `AGENTS.md` files for local routing.",
            "- Keep `Aliases & Vocabulary`, `Entry Points`, and `Search Recipes` current so future agents can map user language to the right files quickly.",
            "- If archived reports live under `docs/`, update `docs/INDEX.md` after moving or adding report files.",
            "- If a local memory index is used, keep it under `.memory-index/` inside this project only and never merge it with other projects.",
            "- Never consult another project's `MEMORY.md`, `docs/INDEX.md`, or `.memory-index/` unless the user explicitly asks for cross-project analysis.",
            "- If multiple `project-memory`, `project-memory-*`, or `pm-*` servers are visible, use only the server whose wrapper path or declared root matches this repository. Ignore sibling project servers.",
            "- If `project-memory` MCP wiring is missing for this project, install the local wrapper and project-local MCP config before relying on it.",
            "- Codex: invoke `$project-memory-refresh` when memory needs to be created or refreshed.",
            "- Other agents: follow the same protocol manually by updating the `MEMORY.md` auto-generated map, then curating `Aliases & Vocabulary`, `Entry Points`, `Stable Facts`, `Active Decisions`, `Hotspots`, `Search Recipes`, and `Open Risks`.",
            END,
        ]
    )


def update_managed_block(text: str, block: str) -> str:
    if BEGIN in text and END in text:
        before, remainder = text.split(BEGIN, 1)
        _, after = remainder.split(END, 1)
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


def ensure_agents(root: Path) -> Path:
    agents_path = root / "AGENTS.md"
    if agents_path.exists():
        existing = agents_path.read_text(encoding="utf-8", errors="ignore")
    else:
        existing = "# Repository Guidelines\n"
    if BEGIN not in existing and "## Memory Refresh Protocol" in existing:
        return agents_path
    updated = update_managed_block(existing, protocol_block())
    agents_path.write_text(updated, encoding="utf-8", newline="\n")
    return agents_path


def main() -> int:
    args = parse_args()
    for raw_root in args.root:
        root = Path(raw_root).resolve()
        if not root.exists() or not root.is_dir():
            raise SystemExit(f"Root does not exist or is not a directory: {root}")
        print(f"Updated {ensure_agents(root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
