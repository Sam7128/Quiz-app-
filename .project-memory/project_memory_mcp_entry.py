from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_SKILL_SCRIPTS = ROOT / ".agents" / "skills" / "project-memory-refresh" / "scripts"
CANONICAL_GLOBAL_SKILL_SCRIPTS = Path.home() / ".agents" / "skills" / "project-memory-refresh" / "scripts"

for candidate in (LOCAL_SKILL_SCRIPTS, CANONICAL_GLOBAL_SKILL_SCRIPTS):
    if (candidate / "project_memory_mcp_server.py").exists():
        if str(candidate) not in sys.path:
            sys.path.insert(0, str(candidate))
        break
else:
    raise SystemExit(
        "Could not find project_memory_mcp_server.py in repo-local or global project-memory-refresh scripts."
    )

if __name__ == "__main__":
    try:
        from project_memory_mcp_server import create_server
        create_server(ROOT).run(transport="stdio")
    except Exception as exc:
        print(f"project-memory server unavailable: {exc}", file=sys.stderr, flush=True)
        raise SystemExit(1) from exc
