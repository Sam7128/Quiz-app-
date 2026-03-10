from __future__ import annotations

import sys
from pathlib import Path

SKILL_SCRIPTS = Path(r"C:\Users\user\.codex\skills\project-memory-refresh\scripts")
if str(SKILL_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SKILL_SCRIPTS))

from project_memory_mcp_server import create_server

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    create_server(ROOT).run(transport="stdio")
