from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path

from project_memory_search import category_for, scope_for_category


INDEX_DIR = ".memory-index"
INDEX_FILE = "index.json"
EXCLUDED_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".idea",
    ".vscode",
    ".antigravity",
    ".agent",
    ".claude",
    ".continue",
    ".gemini",
    ".agents",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "__pycache__",
    ".memory-index",
}
INCLUDED_FILES = {
    "AGENTS.md",
    "MEMORY.md",
    "README.md",
    "GEMINI.md",
    "CHANGELOG.md",
    "CHECKLIST.md",
    "DEVELOPMENT_LOG.md",
    "project.md",
    "docs/INDEX.md",
}
@dataclass
class IndexEntry:
    path: str
    heading: str
    category: str
    scope: str
    text: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a project-local memory index.")
    parser.add_argument("--root", required=True, help="Project root.")
    parser.add_argument("--write", action="store_true", help="Write the local index.")
    return parser.parse_args()


def ensure_within_root(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def should_include(path: Path, root: Path) -> bool:
    if not path.is_file():
        return False
    if not ensure_within_root(path, root):
        return False
    relative = path.relative_to(root).as_posix()
    if relative in INCLUDED_FILES:
        return True
    if relative.startswith("docs/") and path.suffix.lower() == ".md":
        return True
    if relative.startswith("openspec/") and path.suffix.lower() == ".md":
        return True
    return False


def iter_candidate_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*.md"):
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        if path.is_symlink():
            continue
        if should_include(path, root):
            files.append(path)
    return sorted(files, key=lambda p: p.relative_to(root).as_posix())


def split_markdown_sections(text: str) -> list[tuple[str, str]]:
    sections: list[tuple[str, str]] = []
    current_heading = "Document"
    current_lines: list[str] = []
    for line in text.splitlines():
        if line.startswith("#"):
            if current_lines:
                sections.append((current_heading, "\n".join(current_lines).strip()))
                current_lines = []
            current_heading = line.lstrip("#").strip() or "Document"
            continue
        current_lines.append(line)
    if current_lines:
        sections.append((current_heading, "\n".join(current_lines).strip()))
    return [(heading, body) for heading, body in sections if body]


def build_index(root: Path) -> dict:
    entries: list[IndexEntry] = []
    for path in iter_candidate_files(root):
        relative = path.relative_to(root).as_posix()
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for heading, body in split_markdown_sections(text):
            compact_body = " ".join(body.split())
            if not compact_body:
                continue
            category = category_for(relative, heading)
            entries.append(
                IndexEntry(
                    path=relative,
                    heading=heading,
                    category=category,
                    scope=scope_for_category(category),
                    text=compact_body[:1200],
                )
            )
    return {
        "project_root": str(root.resolve()),
        "built_at": datetime.now().isoformat(timespec="seconds"),
        "entry_count": len(entries),
        "entries": [asdict(entry) for entry in entries],
    }


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {root}")

    index = build_index(root)
    if not args.write:
        print(json.dumps(index, ensure_ascii=False, indent=2))
        return 0

    index_dir = root / INDEX_DIR
    index_dir.mkdir(parents=True, exist_ok=True)
    index_path = index_dir / INDEX_FILE
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
    print(f"Updated {index_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
