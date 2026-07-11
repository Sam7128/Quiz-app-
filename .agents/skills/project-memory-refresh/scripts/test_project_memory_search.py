from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import sys
import tempfile
import unittest
from pathlib import Path

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
                {
                    "path": "MEMORY.md",
                    "heading": "Aliases & Vocabulary",
                    "category": "alias",
                    "scope": "memory",
                    "text": "We store aliases vocabulary for mapping terms.",
                },
                {
                    "path": "MEMORY.md",
                    "heading": "Hotspots",
                    "category": "hotspot",
                    "scope": "memory",
                    "text": "List hotspots and fragile code sections.",
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

    def test_unknown_query_returns_zero_results(self) -> None:
        import uuid
        q = f"__unknown_query_{uuid.uuid4().hex}__"
        result = search_entries(self.payload, q)
        self.assertEqual(len(result["results"]), 0)

    def test_cjk_query_tokenizes(self) -> None:
        from project_memory_search import tokenize
        tokens = tokenize("入口 技能管理器 entry")
        self.assertIn("入口", tokens)
        self.assertIn("技能管理器", tokens)
        self.assertIn("entry", tokens)

    def test_cjk_query_matches_entry(self) -> None:
        payload = {
            "entries": [
                {
                    "path": "MEMORY.md",
                    "heading": "Entry Points",
                    "category": "entry-point",
                    "scope": "memory",
                    "text": "這是入口檔案 GUI entrypoint。",
                }
            ]
        }
        result = search_entries(payload, "入口")
        self.assertEqual(len(result["results"]), 1)
        self.assertEqual(result["results"][0]["heading"], "Entry Points")

    def test_word_boundary_prevents_substring_match(self) -> None:
        payload = {
            "entries": [
                {
                    "path": "MEMORY.md",
                    "heading": "Active Decisions",
                    "category": "decision",
                    "scope": "memory",
                    "text": "We use digital tools for communication.",
                }
            ]
        }
        result = search_entries(payload, "git")
        self.assertEqual(len(result["results"]), 0)

    def test_category_boost_alone_insufficient(self) -> None:
        payload = {
            "entries": [
                {
                    "path": "MEMORY.md",
                    "heading": "Aliases & Vocabulary",
                    "category": "alias",
                    "scope": "memory",
                    "text": "Some text unrelated to our query.",
                }
            ]
        }
        result = search_entries(payload, "unrelated-key")
        self.assertEqual(len(result["results"]), 0)

    def test_code_fence_hash_not_heading(self) -> None:
        from build_project_memory_index import split_markdown_sections
        md = """# Parent Heading
Some description.
```python
# This is a comment, not a markdown heading
x = 1
```
"""
        sections = split_markdown_sections(md)
        self.assertEqual(len(sections), 1)
        self.assertEqual(sections[0][0], "Parent Heading")
        self.assertIn("# This is a comment", sections[0][1])

    def test_index_preserves_line_breaks(self) -> None:
        from build_project_memory_index import split_markdown_sections
        md = """# Heading
Line 1.
Line 2.
"""
        sections = split_markdown_sections(md)
        self.assertIn("\n", sections[0][1])

    def test_chunk_body_preserves_long_single_paragraph_tail(self) -> None:
        from build_project_memory_index import chunk_body
        body = ("A" * 2500) + "TAIL"
        chunks = chunk_body(body, "Long Section", max_chars=1000)
        self.assertGreater(len(chunks), 2)
        self.assertEqual("".join(chunk_text for _, chunk_text in chunks), body)
        self.assertTrue(chunks[-1][1].endswith("TAIL"))

    def test_getter_sections_strip_auto_generated_markers(self) -> None:
        from project_memory_mcp_server import read_memory_sections_for_root
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "MEMORY.md").write_text(
                "\n".join(
                    [
                        "# MEMORY.md",
                        "",
                        "## Entry Points",
                        "- [ENTRY-001] keep this.",
                        "<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->",
                        "## Generated",
                        "generated content",
                        "<!-- END AUTO-GENERATED: MEMORY MAP -->",
                        "## Hotspots",
                        "- [HOT-001] keep this too.",
                    ]
                ),
                encoding="utf-8",
            )
            sections = read_memory_sections_for_root(root)
            self.assertIn("Entry Points", sections)
            self.assertNotIn("BEGIN AUTO-GENERATED", sections["Entry Points"])
            self.assertEqual(sections["Entry Points"], "- [ENTRY-001] keep this.")

    def test_timestamp_has_timezone(self) -> None:
        from build_project_memory_index import build_index
        res = build_index(Path(__file__).resolve().parents[4])
        built_at = res["built_at"]
        self.assertTrue("+" in built_at or "Z" in built_at or built_at.endswith("+00:00"))

    def test_health_reports_hash_stale_warning(self) -> None:
        from build_project_memory_index import INDEX_DIR, INDEX_FILE, build_index, write_index_atomic
        from project_memory_mcp_server import get_memory_health_for_root, ProjectMemoryMCP
        import asyncio
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "MEMORY.md").write_text("## Entry Points\n- old entry\n", encoding="utf-8")
            index_dir = root / INDEX_DIR
            index_dir.mkdir()
            write_index_atomic(index_dir / INDEX_FILE, build_index(root))
            (root / "MEMORY.md").write_text("## Entry Points\n- changed entry\n", encoding="utf-8")

            class MockServer:
                _last_checked_time = 0.0
                _last_health_result = None

            server = MockServer()
            health = asyncio.run(get_memory_health_for_root(root, server))
            self.assertTrue(any("index is stale" in warning for warning in health["warnings"]))

    def test_corrupted_index_recovers(self) -> None:
        from build_project_memory_index import INDEX_DIR, INDEX_FILE
        from project_memory_mcp_server import load_index
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "MEMORY.md").write_text("## Entry Points\n- available after rebuild\n", encoding="utf-8")
            index_dir = root / INDEX_DIR
            index_dir.mkdir()
            (index_dir / INDEX_FILE).write_text("{ invalid json", encoding="utf-8")

            payload = load_index(root)
            self.assertGreater(payload["entry_count"], 0)

    def test_concurrent_ensure_index_uses_safe_writer(self) -> None:
        from build_project_memory_index import INDEX_DIR, INDEX_FILE
        from project_memory_mcp_server import ensure_index, load_index
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "MEMORY.md").write_text("## Entry Points\n- concurrent rebuild\n", encoding="utf-8")

            with ThreadPoolExecutor(max_workers=5) as executor:
                paths = list(executor.map(lambda _: ensure_index(root), range(5)))

            self.assertTrue(all(path == root / INDEX_DIR / INDEX_FILE for path in paths))
            self.assertFalse((root / INDEX_DIR / (INDEX_FILE + ".lock")).exists())
            self.assertGreater(load_index(root)["entry_count"], 0)

    def test_wrapper_and_codex_config_are_portable(self) -> None:
        from install_project_mcp_configs import codex_block, wrapper_content
        wrapper = wrapper_content()
        self.assertNotIn("C:\\Users\\user\\skill manager", wrapper)
        self.assertNotIn("GENERATED_FROM_SKILL_SCRIPTS", wrapper)

        block = codex_block(Path("C:/tmp/project"), Path("C:/tmp/project/.project-memory/project_memory_mcp_entry.py"))
        self.assertIn(sys.executable, block)
        self.assertNotIn("command = 'python'", block)

    def test_golden_queries_top1_accuracy(self) -> None:
        golden = {
            "entry points": "entry-point",
            "hotspots": "hotspot",
            "aliases vocabulary": "alias",
            "active decisions": "decision",
        }
        for q, expected_cat in golden.items():
            result = search_entries(self.payload, q, limit=1)
            self.assertEqual(result["results"][0]["category"], expected_cat, f"Query '{q}' failed to get top-1 category '{expected_cat}'")


if __name__ == "__main__":
    unittest.main()
