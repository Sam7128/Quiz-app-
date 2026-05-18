from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


SCRIPTS_DIR = Path(__file__).resolve().parent
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
    "venv",
    ".venv",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the standard project-memory refresh workflow.")
    parser.add_argument("--root", action="append", required=True, help="Project root. Repeat for multiple projects.")
    parser.add_argument(
        "--skip-codeql-summary",
        action="store_true",
        help="Skip auto-summarizing SARIF and CodeQL outputs before rebuilding docs and memory indexes.",
    )
    return parser.parse_args()


def run_script(script_name: str, *args: str) -> None:
    script_path = SCRIPTS_DIR / script_name
    command = [sys.executable, str(script_path), *args]
    subprocess.run(command, check=True)


def iter_sarif_files(root: Path) -> list[Path]:
    sarif_files: list[Path] = []
    patterns = ("*.sarif", "*.sarif.json")
    for pattern in patterns:
        for path in root.rglob(pattern):
            if any(part in EXCLUDED_DIRS for part in path.parts):
                continue
            if path.is_symlink() or not path.is_file():
                continue
            sarif_files.append(path)
    unique: dict[str, Path] = {}
    for path in sarif_files:
        unique[str(path.resolve())] = path
    return sorted(unique.values(), key=lambda item: item.relative_to(root).as_posix())


def summarize_sarif_reports(root: Path) -> None:
    sarif_files = iter_sarif_files(root)
    for sarif_path in sarif_files:
        run_script("summarize_codeql_sarif.py", "--root", str(root), "--sarif", str(sarif_path))


def process_root(root: Path, skip_codeql_summary: bool = False) -> None:
    resolved = root.resolve()
    if not resolved.exists() or not resolved.is_dir():
        raise SystemExit(f"Root does not exist or is not a directory: {resolved}")

    run_script("organize_project_reports.py", "--root", str(resolved), "--write")
    if not skip_codeql_summary:
        summarize_sarif_reports(resolved)
    run_script("refresh_memory_map.py", "--root", str(resolved), "--memory-file", str(resolved / "MEMORY.md"), "--write")
    run_script("ensure_agents_memory_protocol.py", "--root", str(resolved))
    if (resolved / "docs").exists():
        run_script("build_docs_index.py", "--root", str(resolved), "--write")
    run_script("ensure_project_mcp_configs.py", "--root", str(resolved))
    run_script("build_project_memory_index.py", "--root", str(resolved), "--write")
    run_script("verify_project_memory_mcp.py", "--root", str(resolved), "--query", "AGENTS.md")


def main() -> int:
    args = parse_args()
    for raw_root in args.root:
        print(f"=== Refreshing {raw_root} ===")
        process_root(Path(raw_root), skip_codeql_summary=args.skip_codeql_summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
