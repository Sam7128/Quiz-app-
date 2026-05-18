from __future__ import annotations

from pathlib import Path


CONFIG_PATH = Path(r"C:\Users\user\.codex\config.toml")
SCRIPT_PATH = Path(r"C:\Users\user\.agents\skills\project-memory-refresh\scripts\project_memory_mcp_auto_root.py")
BEGIN = "# >>> project-memory-auto mcp >>>"
END = "# <<< project-memory-auto mcp <<<"


def toml_literal(value: str) -> str:
    return "'" + value.replace("'", "\\'") + "'"


def block() -> str:
    return "\n".join(
        [
            BEGIN,
            "[mcp_servers.project-memory-auto]",
            f"command = {toml_literal('python')}",
            f"args = [{toml_literal(str(SCRIPT_PATH))}]",
            "enabled = true",
            END,
            "",
        ]
    )


def main() -> int:
    existing = CONFIG_PATH.read_text(encoding="utf-8") if CONFIG_PATH.exists() else ""
    managed = block()
    if BEGIN in existing and END in existing:
        before, remainder = existing.split(BEGIN, 1)
        _, after = remainder.split(END, 1)
        updated = before.rstrip() + "\n\n" + managed + after.lstrip()
    elif "[mcp_servers.project-memory-auto]" in existing:
        updated = existing
    else:
        updated = existing.rstrip()
        if updated:
            updated += "\n\n"
        updated += managed
    CONFIG_PATH.write_text(updated, encoding="utf-8", newline="\n")
    print(f"Updated {CONFIG_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
