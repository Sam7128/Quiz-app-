from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path

from build_docs_index import build_index_text


KEEP_ROOT = {
    "README.md",
    "AGENTS.md",
    "MEMORY.md",
    "GEMINI.md",
    "CHANGELOG.md",
    "CHECKLIST.md",
    "CONTRIBUTING.md",
    "DEVELOPMENT_LOG.md",
    "插件.md",
    "LICENSE",
}
KEEP_KEYWORDS = (
    "playbook",
)

REPORT_PREFIXES = (
    "CHANGE-REPORT",
    "CHANGE_REPORT",
    "CODEQL",
    "EXPLORATION_REPORT",
    "IMPLEMENTATION_SUMMARY",
    "INVESTIGATING",
    "OPTIMIZATION-REPORT",
    "P1-P3-CHANGE-REPORT",
    "SECURITY",
    "AUDIT",
    "RISK",
)
CHECKPOINT_PREFIXES = (
    "CHECKPOINT",
    "PROGRESS",
    "STATUS",
)
HANDOFF_PREFIXES = (
    "AGSECURE_SESSION",
    "HANDOFF_DOCUMENT",
    "SESSION_HANDOFF",
    "SESSION-SUMMARY",
)
CHECKPOINT_KEYWORDS = (
    "followup",
    "progress",
    "rollback",
    "status",
    "update",
    "進度",
)
REPORT_KEYWORDS = (
    "analysis",
    "codeql",
    "report",
    "audit",
    "implementation_summary",
    "investigating",
    "sarif",
    "security",
    "risk",
)
HANDOFF_KEYWORDS = (
    "handoff",
    "summary",
    "交接",
)


@dataclass
class MovePlan:
    source: Path
    destination: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Archive scattered project Markdown reports into docs/.")
    parser.add_argument("--root", required=True, help="Project root to organize.")
    parser.add_argument("--write", action="store_true", help="Apply the moves. Without this flag, print the plan.")
    return parser.parse_args()


def classify(path: Path) -> str | None:
    name = path.name
    upper_name = name.upper()
    lower_name = name.lower()

    if name in KEEP_ROOT:
        return None
    if not name.endswith(".md"):
        return None
    if any(keyword in lower_name for keyword in KEEP_KEYWORDS):
        return None
    if upper_name.startswith(HANDOFF_PREFIXES):
        return "docs/handoffs"
    if any(keyword in lower_name for keyword in HANDOFF_KEYWORDS) or "交接" in name:
        return "docs/handoffs"
    if upper_name.startswith(CHECKPOINT_PREFIXES) or any(keyword in lower_name for keyword in CHECKPOINT_KEYWORDS):
        return "docs/checkpoints"
    if upper_name.startswith(REPORT_PREFIXES) or any(keyword in lower_name for keyword in REPORT_KEYWORDS):
        return "docs/reports"
    return None


def build_plan(root: Path) -> list[MovePlan]:
    plans: list[MovePlan] = []
    for path in sorted(root.iterdir(), key=lambda item: item.name.lower()):
        if not path.is_file():
            continue
        if path.parent.name == "openspec":
            continue
        bucket = classify(path)
        if bucket is None:
            continue
        destination = root / bucket / path.name
        plans.append(MovePlan(source=path, destination=destination))
    return plans


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {root}")

    plan = build_plan(root)
    if not args.write:
        if not plan:
            print("No report markdown files to organize.")
            return 0
        for item in plan:
            print(f"{item.source.name} -> {item.destination.relative_to(root).as_posix()}")
        return 0

    for item in plan:
        item.destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(item.source), str(item.destination))
        print(f"Moved {item.source.name} -> {item.destination.relative_to(root).as_posix()}")

    docs_dir = root / "docs"
    if docs_dir.exists():
        index_path = docs_dir / "INDEX.md"
        index_path.write_text(build_index_text(docs_dir), encoding="utf-8", newline="\n")
        print(f"Updated {index_path.relative_to(root).as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
