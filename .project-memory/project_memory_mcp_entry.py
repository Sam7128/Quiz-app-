from __future__ import annotations

import sys
from pathlib import Path

LOCAL_DIR = Path(__file__).resolve().parent
SKILL_SCRIPTS = Path(r"C:\Users\user\.codex\skills\project-memory-refresh\scripts")
if str(LOCAL_DIR) not in sys.path:
    sys.path.insert(0, str(LOCAL_DIR))
if str(SKILL_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SKILL_SCRIPTS))

import project_memory_mcp_server as project_memory_mcp_server


def _score_entry(entry: dict, terms: list[str]) -> int:
    category_boost = {
        "alias": 5,
        "entry-point": 4,
        "search-recipe": 4,
        "memory": 3,
        "rules": 2,
        "openspec-proposal": 4,
        "openspec-task": 4,
        "openspec-spec": 4,
        "openspec-design": 3,
        "openspec-doc": 2,
        "openspec-index": 2,
        "archive-index": 1,
        "archive-doc": 1,
        "source-doc": 1,
    }
    haystack = f"{entry['path']} {entry['heading']} {entry['text']}".lower()
    score = category_boost.get(entry.get("category", ""), 0)
    for term in terms:
        if term in entry["path"].lower():
            score += 5
        if term in entry["heading"].lower():
            score += 4
        if term in haystack:
            score += 2
    return score


if not hasattr(project_memory_mcp_server, "score_entry"):
    project_memory_mcp_server.score_entry = _score_entry

create_server = project_memory_mcp_server.create_server

ROOT = Path(__file__).resolve().parents[1]

if __name__ == "__main__":
    create_server(ROOT).run(transport="stdio")
