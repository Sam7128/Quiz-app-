#!/usr/bin/env python3
"""Collect OpenSpec artifacts for a target change and print metadata as JSON."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass
class Artifact:
    role: str
    path: Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect OpenSpec artifact paths for review")
    parser.add_argument("--root", default=".", help="Project root (default: current directory)")
    parser.add_argument("--change", default=None, help="OpenSpec change name (default: latest modified)")
    return parser.parse_args()


def list_changes(changes_dir: Path) -> list[Path]:
    return sorted([p for p in changes_dir.iterdir() if p.is_dir()], key=lambda p: p.name)


def latest_change(change_dirs: Iterable[Path]) -> Path:
    def newest_mtime(directory: Path) -> float:
        mtimes = [directory.stat().st_mtime]
        for child in directory.rglob("*"):
            try:
                mtimes.append(child.stat().st_mtime)
            except OSError:
                continue
        return max(mtimes)

    return max(change_dirs, key=newest_mtime)


def collect_artifacts(change_dir: Path) -> list[Artifact]:
    artifacts: list[Artifact] = [
        Artifact("config", change_dir / ".openspec.yaml"),
        Artifact("proposal", change_dir / "proposal.md"),
        Artifact("design", change_dir / "design.md"),
        Artifact("tasks", change_dir / "tasks.md"),
    ]

    specs_dir = change_dir / "specs"
    if specs_dir.exists():
        for spec_file in sorted(specs_dir.rglob("spec.md")):
            role = f"spec:{spec_file.parent.name}"
            artifacts.append(Artifact(role, spec_file))

    return artifacts


def metadata(path: Path) -> dict[str, object]:
    exists = path.exists()
    if not exists:
        return {
            "path": str(path),
            "exists": False,
            "size": None,
            "modified": None,
        }

    stat = path.stat()
    return {
        "path": str(path),
        "exists": True,
        "size": stat.st_size,
        "modified": stat.st_mtime,
    }


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    changes_dir = root / "openspec" / "changes"

    if not changes_dir.exists():
        print(json.dumps({"error": f"Missing directory: {changes_dir}"}, indent=2))
        return 1

    change_dirs = list_changes(changes_dir)
    if not change_dirs:
        print(json.dumps({"error": f"No changes found under: {changes_dir}"}, indent=2))
        return 1

    if args.change:
        target = changes_dir / args.change
        if not target.exists() or not target.is_dir():
            print(json.dumps({"error": f"Change not found: {args.change}"}, indent=2))
            return 1
    else:
        target = latest_change(change_dirs)

    artifacts = collect_artifacts(target)
    payload = {
        "root": str(root),
        "change": target.name,
        "change_dir": str(target),
        "artifacts": [
            {
                "role": artifact.role,
                **metadata(artifact.path),
            }
            for artifact in artifacts
        ],
    }

    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
