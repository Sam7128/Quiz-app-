<!-- >>> project-memory antigravity rules >>> -->
## Project Memory Tool Routing

- This block is additive. Do not rewrite existing project rules above.
- In this repository, use `pm-quiz-app-b6bb035e` for project memory tasks.
- Do not use other `project-memory`, `project-memory-*`, or `pm-*` servers unless the user explicitly asks for cross-project analysis.
- Before broad search, prefer `get_entry_points`, `get_hotspots`, or `search_memory` from the matching project memory server.
- If memory is missing, stale, or the root has scattered report markdown, trigger the project memory refresh workflow before broad exploration.
- This repository root is `C:\Users\user\Desktop\Quiz-app-`. Only use memory files, docs archives, and indexes inside this root.
- Dual MCP Tool Routing Guidance:
  - For call-chain analysis, impact analysis, or low-level AST/symbol discovery, invoke codebase-memory-mcp tools directly (e.g., search_graph, trace_path).
  - For project memory, stable facts, entry points, hotspots, or search recipes, invoke pm-quiz-app-b6bb035e tools (e.g., search_memory, get_entry_points, get_hotspots).
<!-- <<< project-memory antigravity rules <<< -->
