from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path


SEVERITY_ORDER = {"error": 0, "warning": 1, "note": 2, "none": 3}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summarize a CodeQL SARIF report into compact Markdown.")
    parser.add_argument("--sarif", required=True, help="Path to a CodeQL SARIF file.")
    parser.add_argument(
        "--out",
        help="Output Markdown path. Defaults to <repo>/docs/reports/codeql/<sarif-stem>.md when --root is set.",
    )
    parser.add_argument("--root", help="Project root for default output placement and relative paths.")
    parser.add_argument("--limit", type=int, default=25, help="Maximum findings to include in the Markdown summary.")
    return parser.parse_args()


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc


def normalize_level(result: dict) -> str:
    level = str(result.get("level") or "warning").lower()
    if level in {"error", "warning", "note", "none"}:
        return level
    return "warning"


def extract_message(result: dict) -> str:
    message = result.get("message")
    if isinstance(message, dict):
        text = message.get("text") or message.get("markdown")
        if isinstance(text, str) and text.strip():
            return " ".join(text.split())
    if isinstance(message, str) and message.strip():
        return " ".join(message.split())
    return "No message"


def extract_location(result: dict, root: Path | None) -> tuple[str, int | None]:
    locations = result.get("locations")
    if not isinstance(locations, list) or not locations:
        return ("unknown", None)
    physical = locations[0].get("physicalLocation", {})
    artifact = physical.get("artifactLocation", {})
    uri = artifact.get("uri")
    region = physical.get("region", {})
    line = region.get("startLine")
    if not isinstance(uri, str) or not uri.strip():
        return ("unknown", line if isinstance(line, int) else None)
    path = Path(uri)
    if root is not None:
        try:
            resolved = (root / path).resolve() if not path.is_absolute() else path.resolve()
            relative = resolved.relative_to(root.resolve()).as_posix()
            return (relative, line if isinstance(line, int) else None)
        except (OSError, ValueError):
            pass
    return (path.as_posix(), line if isinstance(line, int) else None)


def summarize_run(run: dict, root: Path | None, limit: int) -> str:
    tool = run.get("tool", {})
    driver = tool.get("driver", {}) if isinstance(tool, dict) else {}
    tool_name = str(driver.get("name") or "Unknown Tool")
    tool_version = str(driver.get("version") or "").strip()
    results = run.get("results", [])
    if not isinstance(results, list):
        results = []

    severity_counts: Counter[str] = Counter()
    rule_counts: Counter[str] = Counter()
    file_counts: Counter[str] = Counter()
    findings: list[dict[str, object]] = []

    for result in results:
        if not isinstance(result, dict):
            continue
        level = normalize_level(result)
        rule_id = str(result.get("ruleId") or "unknown-rule")
        path, line = extract_location(result, root)
        message = extract_message(result)
        severity_counts[level] += 1
        rule_counts[rule_id] += 1
        file_counts[path] += 1
        findings.append(
            {
                "level": level,
                "rule_id": rule_id,
                "path": path,
                "line": line,
                "message": message,
            }
        )

    findings.sort(
        key=lambda item: (
            SEVERITY_ORDER.get(str(item["level"]), 9),
            -rule_counts[str(item["rule_id"])],
            str(item["path"]),
            str(item["line"] or 0),
        )
    )

    lines = [
        f"## {tool_name}" + (f" {tool_version}" if tool_version else ""),
        "",
        f"- Total findings: `{len(findings)}`",
        f"- Errors: `{severity_counts.get('error', 0)}`",
        f"- Warnings: `{severity_counts.get('warning', 0)}`",
        f"- Notes: `{severity_counts.get('note', 0)}`",
    ]

    if rule_counts:
        lines.extend(["", "### Top Rules"])
        for rule_id, count in rule_counts.most_common(10):
            lines.append(f"- `{rule_id}`: `{count}`")

    if file_counts:
        lines.extend(["", "### Most Affected Files"])
        for path, count in file_counts.most_common(10):
            lines.append(f"- `{path}`: `{count}`")

    if findings:
        lines.extend(["", "### Key Findings"])
        for finding in findings[:limit]:
            location = finding["path"]
            if finding["line"] is not None:
                location = f"{location}:{finding['line']}"
            lines.append(
                f"- `[{finding['level']}]` `{finding['rule_id']}` at `{location}`: {finding['message']}"
            )

    return "\n".join(lines)


def build_summary(payload: dict, root: Path | None, sarif_path: Path, limit: int) -> str:
    runs = payload.get("runs", [])
    if not isinstance(runs, list):
        runs = []

    lines = [
        "# CodeQL Summary",
        "",
        f"- Source: `{sarif_path}`",
        f"- Runs: `{len(runs)}`",
        "- Purpose: compact security and code-quality summary derived from SARIF for project memory and agent routing.",
    ]

    if not runs:
        lines.extend(["", "- No SARIF runs found."])
        return "\n".join(lines) + "\n"

    for run in runs:
        lines.extend(["", summarize_run(run, root, limit)])

    lines.extend(
        [
            "",
            "## Usage Notes",
            "",
            "- Treat this file as an indexable summary, not the source of truth for every path trace.",
            "- Keep the original SARIF artifact for tooling; let agents read this summary first to reduce token waste.",
            "- Add durable security risks or recurring patterns to `MEMORY.md` instead of repeating the whole SARIF payload.",
        ]
    )
    return "\n".join(lines) + "\n"


def sarif_summary_stem(path: Path) -> str:
    lower_name = path.name.lower()
    if lower_name.endswith(".sarif.json"):
        return path.name[:-11]
    if lower_name.endswith(".sarif"):
        return path.name[:-6]
    return path.stem


def default_output(root: Path | None, sarif_path: Path) -> Path:
    if root is None:
        return sarif_path.with_suffix(".md")
    base_dir = root / "docs" / "reports" / "codeql"
    try:
        relative = sarif_path.relative_to(root)
        parent = relative.parent
        return base_dir / parent / f"{sarif_summary_stem(relative)}.md"
    except ValueError:
        digest = hashlib.sha1(str(sarif_path).encode("utf-8")).hexdigest()[:8]
        return base_dir / f"{sarif_summary_stem(sarif_path)}-{digest}.md"


def main() -> int:
    args = parse_args()
    sarif_path = Path(args.sarif).resolve()
    if not sarif_path.exists() or not sarif_path.is_file():
        raise SystemExit(f"SARIF file does not exist: {sarif_path}")

    root = Path(args.root).resolve() if args.root else None
    payload = load_json(sarif_path)
    output_path = Path(args.out).resolve() if args.out else default_output(root, sarif_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_summary(payload, root, sarif_path, args.limit), encoding="utf-8", newline="\n")
    print(f"Updated {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
