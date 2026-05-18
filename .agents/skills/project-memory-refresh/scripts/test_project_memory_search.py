from __future__ import annotations

import unittest

from project_memory_search import build_query_profile, search_entries


class ProjectMemorySearchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.payload = {
            "entries": [
                {
                    "path": "MEMORY.md",
                    "heading": "Entry Points",
                    "category": "entry-point",
                    "scope": "memory",
                    "text": "ENTRY-001 AgentSkillManager.ps1 is the GUI entrypoint.",
                },
                {
                    "path": "MEMORY.md",
                    "heading": "Active Decisions",
                    "category": "decision",
                    "scope": "memory",
                    "text": "DEC-004 Keep one canonical MEMORY.md and repo-local wrapper.",
                },
                {
                    "path": "AGENTS.md",
                    "heading": "Memory Refresh Protocol",
                    "category": "rules",
                    "scope": "rules",
                    "text": "Read MEMORY.md before broad exploration.",
                },
                {
                    "path": "docs/INDEX.md",
                    "heading": "Archive Index",
                    "category": "archive-index",
                    "scope": "archive",
                    "text": "Checkpoint reports and handoffs.",
                },
            ]
        }

    def test_entry_intent_prefers_entry_points(self) -> None:
        result = search_entries(self.payload, "what should I read first", limit=1)
        self.assertEqual(result["results"][0]["category"], "entry-point")
        self.assertIn("entry", result["profile"]["intents"])

    def test_rule_scope_filter_isolates_rules(self) -> None:
        result = search_entries(self.payload, "memory protocol instructions", scope="rules", limit=5)
        self.assertEqual(len(result["results"]), 1)
        self.assertEqual(result["results"][0]["scope"], "rules")

    def test_decision_id_query_matches_memory_id(self) -> None:
        result = search_entries(self.payload, "DEC-004", limit=1)
        self.assertEqual(result["results"][0]["category"], "decision")
        self.assertTrue(result["profile"]["id_query"])

    def test_noise_only_query_returns_empty(self) -> None:
        result = search_entries(self.payload, "the and please", limit=5)
        self.assertEqual(result["results"], [])
        self.assertTrue(result["profile"]["noise_only"])

    def test_profile_marks_path_queries(self) -> None:
        profile = build_query_profile("MEMORY.md entry points")
        self.assertTrue(profile.path_query)


if __name__ == "__main__":
    unittest.main()
