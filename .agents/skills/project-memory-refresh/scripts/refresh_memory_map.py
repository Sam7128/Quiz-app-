from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable


BEGIN_MARKER = "<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->"
END_MARKER = "<!-- END AUTO-GENERATED: MEMORY MAP -->"
EXCLUDE_DIRS = {
    ".agents",
    ".git",
    ".gemini",
    ".hg",
    ".svn",
    ".claude",
    ".continue",
    ".idea",
    ".sisyphus",
    ".vscode",
    ".next",
    ".nuxt",
    ".turbo",
    ".cache",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "logs",
    "out",
    "playwright-report",
    "temp",
    "test-results",
    "tmp",
    "__pycache__",
}
ALLOWED_DOT_DIRS = {
    ".github",
    ".storybook",
}
KEY_FILE_ORDER = [
    "AGENTS.md",
    "MEMORY.md",
    "README.md",
    "DEVELOPMENT_LOG.md",
    "CHANGELOG.md",
    "CHECKLIST.md",
    ".env.example",
    "package.json",
    "project.md",
    "tsconfig.json",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "requirements.txt",
]
NOISE_FILE_SUFFIXES = {
    ".bak",
    ".log",
    ".tmp",
    ".txt",
}

DIR_HINTS = {
    "src": "primary source implementation",
    "app": "application entry and route logic",
    "components": "ui components",
    "services": "service and integration logic",
    "hooks": "feature hooks and orchestration",
    "contexts": "shared context and state boundaries",
    "constants": "static definitions and domain data",
    "utils": "helpers and low-level utilities",
    "lib": "shared library code",
    "types": "shared type definitions",
    "tests": "test entry points",
    "__tests__": "test entry points",
    "e2e": "end-to-end tests",
    "docs": "project documentation",
    "openspec": "change planning and specs",
    "public": "static assets",
    "scripts": "automation scripts",
}


@dataclass
class ModuleRow:
    module_id: str
    path: str
    has_agents: bool
    purpose: str
    tags: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Refresh the auto-generated memory map block.")
    parser.add_argument("--root", required=True, help="Project root to scan.")
    parser.add_argument(
        "--memory-file",
        help="Path to MEMORY.md. Defaults to <root>/MEMORY.md.",
    )
    parser.add_argument(
        "--max-modules",
        type=int,
        default=12,
        help="Maximum number of top-level modules to include.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write changes to the memory file. Without this flag, print to stdout.",
    )
    return parser.parse_args()


def visible_children(root: Path) -> tuple[list[Path], list[Path]]:
    dirs: list[Path] = []
    files: list[Path] = []
    for child in sorted(root.iterdir(), key=lambda item: item.name.lower()):
        if child.name in EXCLUDE_DIRS:
            continue
        if child.is_dir() and child.name.startswith(".") and child.name not in ALLOWED_DOT_DIRS:
            continue
        if child.is_dir():
            dirs.append(child)
        elif child.is_file():
            files.append(child)
    return dirs, files


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def find_nested_agents(root: Path) -> list[str]:
    found: list[str] = []
    for path in root.rglob("AGENTS.md"):
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        if any(part.startswith(".") and part not in ALLOWED_DOT_DIRS for part in path.parts if part not in {path.name, root.name}):
            continue
        if path.parent == root:
            continue
        found.append(rel(path, root))
    return sorted(found)


def pick_key_files(files: Iterable[Path], root: Path) -> list[str]:
    by_name = {path.name: path for path in files}
    chosen: list[str] = []
    for name in KEY_FILE_ORDER:
        if name in by_name:
            chosen.append(rel(by_name[name], root))
    docs_index = root / "docs" / "INDEX.md"
    if docs_index.exists():
        docs_relative = rel(docs_index, root)
        if docs_relative not in chosen:
            chosen.append(docs_relative)
    for path in files:
        if path.name.isdigit():
            continue
        if path.suffix.lower() in NOISE_FILE_SUFFIXES:
            continue
        if path.name.startswith(".") and path.name not in KEY_FILE_ORDER:
            continue
        relative = rel(path, root)
        if relative not in chosen and len(chosen) < 10:
            chosen.append(relative)
    return chosen


def purpose_for_dir(path: Path) -> str:
    return DIR_HINTS.get(path.name.lower(), "important project module")


def build_module_rows(root: Path, dirs: list[Path], limit: int) -> list[ModuleRow]:
    rows: list[ModuleRow] = []
    for index, directory in enumerate(dirs[:limit], start=1):
        rows.append(
            ModuleRow(
                module_id=f"MOD-{index:03d}",
                path=rel(directory, root) + "/",
                has_agents=(directory / "AGENTS.md").exists(),
                purpose=purpose_for_dir(directory),
                tags=directory.name.lower().replace(" ", "-"),
            )
        )
    return rows


def openspec_doc_flags(change_dir: Path) -> str:
    flags: list[str] = []
    for name, label in (
        ("proposal.md", "proposal"),
        ("design.md", "design"),
        ("tasks.md", "tasks"),
    ):
        if (change_dir / name).exists():
            flags.append(label)
    specs_dir = change_dir / "specs"
    if specs_dir.exists():
        spec_count = sum(1 for path in specs_dir.rglob("spec.md") if path.is_file())
        if spec_count:
            flags.append(f"specs:{spec_count}")
    return ", ".join(flags) if flags else "no standard docs"


def collect_openspec_changes(root: Path) -> tuple[list[str], list[str], int]:
    changes_root = root / "openspec" / "changes"
    if not changes_root.exists():
        return [], [], 0

    active: list[str] = []
    archived_preview: list[str] = []
    archived_total = 0

    for child in sorted(changes_root.iterdir(), key=lambda item: item.name.lower()):
        if not child.is_dir():
            continue
        if child.name == "archive":
            archive_dirs = [item for item in sorted(child.iterdir(), key=lambda item: item.name.lower()) if item.is_dir()]
            archived_total = len(archive_dirs)
            for entry in archive_dirs[-5:]:
                archived_preview.append(f"`openspec/changes/archive/{entry.name}/` ({openspec_doc_flags(entry)})")
            continue
        active.append(f"`openspec/changes/{child.name}/` ({openspec_doc_flags(child)})")

    return active[:8], archived_preview, archived_total


def render_generated_block(root: Path, module_rows: list[ModuleRow], key_files: list[str], nested_agents: list[str]) -> str:
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    active_changes, archived_preview, archived_total = collect_openspec_changes(root)
    lines: list[str] = [
        BEGIN_MARKER,
        "## Auto-Generated Memory Map",
        f"- Refreshed: `{stamp}`",
        f"- Project root: `{root}`",
        "",
        "### Key Files",
    ]
    if key_files:
        for index, path in enumerate(key_files, start=1):
            lines.append(f"- [PATH-{index:03d}] `{path}`")
    else:
        lines.append("- No key files detected.")

    lines.extend(["", "### Module Index", "| ID | Path | Local AGENTS | Purpose | Tags |", "|---|---|---|---|---|"])
    if module_rows:
        for row in module_rows:
            local_agents = "yes" if row.has_agents else "no"
            lines.append(f"| {row.module_id} | `{row.path}` | {local_agents} | {row.purpose} | {row.tags} |")
    else:
        lines.append("| MOD-000 | `.` | no | single-directory project | root |")

    lines.extend(["", "### OpenSpec Snapshot"])
    if root.joinpath("openspec").exists():
        specs_root = root / "openspec" / "specs"
        if specs_root.exists():
            lines.append(f"- Main specs: `openspec/specs/`")
        if active_changes:
            lines.append(f"- Active changes: `{len(active_changes)}`")
            for index, entry in enumerate(active_changes, start=1):
                lines.append(f"- [OS-ACT-{index:03d}] {entry}")
        else:
            lines.append("- Active changes: none detected.")
        if archived_total:
            lines.append(f"- Archived changes: `{archived_total}`")
            for index, entry in enumerate(archived_preview, start=1):
                lines.append(f"- [OS-ARC-{index:03d}] {entry}")
        else:
            lines.append("- Archived changes: none detected.")
    else:
        lines.append("- No `openspec/` directory detected.")

    lines.extend(["", "### Nested AGENTS",])
    if nested_agents:
        for index, path in enumerate(nested_agents, start=1):
            lines.append(f"- [AG-{index:03d}] `{path}`")
    else:
        lines.append("- No nested `AGENTS.md` files detected.")

    lines.append(END_MARKER)
    return "\n".join(lines)


def default_memory_text(root: Path, generated_block: str) -> str:
    return "\n".join(
        [
            "# MEMORY.md",
            "",
            "## Purpose Snapshot",
            "- [FACT-001] Fill in the current project goal.",
            "- [FACT-002] Fill in the main stack or runtime.",
            "",
            "## Source of Truth",
            "- [PATH-001] `AGENTS.md`: project rules and routing.",
            "- [PATH-002] `README.md`: setup and overview.",
            "",
            "## Aliases & Vocabulary",
            "- [ALIAS-001] Add common user-facing terms and map them to actual files or modules.",
            "",
            "## Entry Points",
            "- [ENTRY-001] Add the first files an agent should open before broad search.",
            "",
            generated_block,
            "",
            "## Stable Facts",
            "- [FACT-010] Add durable implementation facts here.",
            "",
            "## Active Decisions",
            "- [DEC-001] Add current architectural or workflow decisions here.",
            "",
            "## Hotspots",
            "- [HOT-001] Add high-value files or modules to inspect first.",
            "",
            "## Search Recipes",
            "- [RG-001] Add a few reliable `rg` patterns for recurring search tasks.",
            "",
            "## Archive Index",
            "- [DOC-001] Point to `docs/INDEX.md` when archive folders exist.",
            "",
            "## Open Risks",
            "- [RISK-001] Add unresolved correctness or maintenance risks here.",
            "",
            "## Next Refresh Triggers",
            "- Rename or move a major directory.",
            "- Add or remove nested `AGENTS.md` files.",
            "- Change architecture, persistence, or integration boundaries.",
            "",
        ]
    )


def replace_generated_block(existing: str, generated_block: str) -> str:
    if BEGIN_MARKER in existing and END_MARKER in existing:
        before, remainder = existing.split(BEGIN_MARKER, 1)
        _, after = remainder.split(END_MARKER, 1)
        return before.rstrip() + "\n\n" + generated_block + after
    return existing.rstrip() + "\n\n" + generated_block + "\n"


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    memory_file = Path(args.memory_file).resolve() if args.memory_file else root / "MEMORY.md"

    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {root}")

    dirs, files = visible_children(root)
    key_files = pick_key_files(files, root)
    nested_agents = find_nested_agents(root)
    module_rows = build_module_rows(root, dirs, args.max_modules)
    generated_block = render_generated_block(root, module_rows, key_files, nested_agents)

    if not args.write:
        print(generated_block)
        return 0

    if memory_file.exists():
        updated = replace_generated_block(memory_file.read_text(encoding="utf-8"), generated_block)
    else:
        updated = default_memory_text(root, generated_block)

    memory_file.write_text(updated, encoding="utf-8", newline="\n")
    print(f"Updated {memory_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
