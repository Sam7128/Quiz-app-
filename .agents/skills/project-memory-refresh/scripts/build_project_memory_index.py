from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import hashlib
import os
import threading
import uuid
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
    heading_stack: list[tuple[int, str]] = []
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
                sections.append((current_heading, "\n".join(current_lines).strip()))
                current_lines = []

            level = len(line) - len(line.lstrip("#"))
            heading_text = line.lstrip("#").strip() or "Document"

            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            heading_stack.append((level, heading_text))

            current_heading = " > ".join(h[1] for h in heading_stack)
            continue

        current_lines.append(line)

    if current_lines:
        sections.append((current_heading, "\n".join(current_lines).strip()))
    return [(heading, body) for heading, body in sections if body]


def chunk_body(body: str, heading: str, max_chars: int = 2000) -> list[tuple[str, str]]:
    text = body.strip()
    if len(text) <= max_chars:
        return [(heading, text)]

    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = []
    current_len = 0
    part = 1

    for para in paragraphs:
        para_len = len(para)
        if para_len > max_chars:
            if current_chunk:
                chunks.append((f"{heading} (part {part})", "\n\n".join(current_chunk)))
                part += 1
                current_chunk = []
                current_len = 0
            for start in range(0, para_len, max_chars):
                chunks.append((f"{heading} (part {part})", para[start : start + max_chars]))
                part += 1
            continue

        if current_len + para_len + (2 if current_chunk else 0) > max_chars:
            if current_chunk:
                chunks.append((f"{heading} (part {part})", "\n\n".join(current_chunk)))
                part += 1
                current_chunk = []
                current_len = 0
        current_chunk.append(para)
        current_len += para_len + (2 if len(current_chunk) > 1 else 0)

    if current_chunk:
        chunks.append((f"{heading} (part {part})" if part > 1 else heading, "\n\n".join(current_chunk)))
    return chunks


def build_index(root: Path) -> dict:
    entries: list[IndexEntry] = []
    file_hashes = {}
    candidate_files = iter_candidate_files(root)

    for path in candidate_files:
        relative = path.relative_to(root).as_posix()
        try:
            data = path.read_bytes()
            file_hashes[relative] = hashlib.sha256(data).hexdigest()
            text = data.decode(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        for heading, body in split_markdown_sections(text):
            if not body.strip():
                continue
            category = category_for(relative, heading)
            chunks = chunk_body(body, heading)
            for chunk_heading, chunk_text in chunks:
                entries.append(
                    IndexEntry(
                        path=relative,
                        heading=chunk_heading,
                        category=category,
                        scope=scope_for_category(category),
                        text=chunk_text,
                    )
                )

    return {
        "project_root": str(root.resolve()),
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "file_hashes": file_hashes,
        "entry_count": len(entries),
        "entries": [asdict(entry) for entry in entries],
    }


def write_index_atomic(index_path: Path, payload: dict) -> None:
    tmp_path = index_path.with_name(
        f"{index_path.name}.{os.getpid()}.{threading.get_ident()}.{uuid.uuid4().hex}.tmp"
    )
    try:
        tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
        os.replace(tmp_path, index_path)
    except Exception:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass
        raise


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
    write_index_atomic(index_path, index)

    print(f"Updated {index_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
