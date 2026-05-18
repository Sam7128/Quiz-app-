from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build docs/INDEX.md for archived markdown files.")
    parser.add_argument("--root", required=True, help="Project root.")
    parser.add_argument("--write", action="store_true", help="Write docs/INDEX.md. Without this flag, print to stdout.")
    return parser.parse_args()


def extract_title(path: Path) -> str:
    try:
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                return stripped.lstrip("#").strip()
    except OSError:
        return path.stem
    return path.stem


def build_index_text(docs_dir: Path) -> str:
    groups: dict[str, list[tuple[str, str]]] = {}
    for path in sorted(docs_dir.rglob("*.md")):
        if path.name == "INDEX.md":
            continue
        relative = path.relative_to(docs_dir).as_posix()
        section = relative.split("/", 1)[0] if "/" in relative else "root"
        groups.setdefault(section, []).append((relative, extract_title(path)))

    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = [
        "# Docs Index",
        "",
        f"- Updated: `{stamp}`",
        "- Purpose: quick archive routing for reports, checkpoints, handoffs, and other non-source docs.",
    ]

    if not groups:
        lines.extend(["", "- No archived markdown files detected."])
        return "\n".join(lines) + "\n"

    for section in sorted(groups):
        lines.extend(["", f"## {section}"])
        for relative, title in groups[section]:
            lines.append(f"- `{relative}` - {title}")
    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    docs_dir = root / "docs"
    if not docs_dir.exists():
        raise SystemExit(f"docs directory does not exist: {docs_dir}")

    index_text = build_index_text(docs_dir)
    if not args.write:
        sys.stdout.buffer.write(index_text.encode("utf-8", errors="replace"))
        return 0

    index_path = docs_dir / "INDEX.md"
    index_path.write_text(index_text, encoding="utf-8", newline="\n")
    print(f"Updated {index_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
