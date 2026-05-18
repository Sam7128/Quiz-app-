# AGENTS.md Snippet

Add or adapt this block in the project root `AGENTS.md` so future agents self-maintain memory.

```markdown
## Memory Refresh Protocol

- This section is additive. Do not rewrite existing `/init` instructions, design system rules, or style guidance above.
- At task start, read `MEMORY.md` before broad exploration if the file exists.
- If a matching `project-memory` MCP server is available for this repository, use it proactively at task start to inspect `Entry Points`, `Hotspots`, or targeted memory search before broad recursive search.
- If `MEMORY.md` is missing, stale, or the project structure changed, refresh it before continuing.
- At task end, update `MEMORY.md` when you changed architecture, moved files, added new modules, or discovered durable constraints.
- Keep memory project-scoped: do not create `GEMINI.md`, dated memory logs, or duplicate note files unless explicitly requested.
- Prefer one canonical `MEMORY.md` plus nested `AGENTS.md` files for local routing.
- Keep `Aliases & Vocabulary`, `Entry Points`, and `Search Recipes` current so future agents can map user language to the right files quickly.
- If archived reports live under `docs/`, update `docs/INDEX.md` after moving or adding report files.
- If a local memory index is used, keep it under `.memory-index/` inside this project only and never merge it with other projects.
- Never consult another project's `MEMORY.md`, `docs/INDEX.md`, or `.memory-index/` unless the user explicitly asks for cross-project analysis.
- If multiple `project-memory`, `project-memory-*`, or `pm-*` servers are visible, use only the server whose wrapper path or declared root matches this repository. Ignore sibling project servers.
- If `project-memory` MCP wiring is missing for this project, install the local wrapper and project-local MCP config before relying on it.
- Codex: invoke `$project-memory-refresh` when memory needs to be created or refreshed.
- Other agents: follow the same protocol manually by updating the `MEMORY.md` auto-generated map, then curating `Aliases & Vocabulary`, `Entry Points`, `Stable Facts`, `Active Decisions`, `Hotspots`, `Search Recipes`, and `Open Risks`.
```

Adapt the wording to fit the project's existing style, but keep the protocol explicit and isolated from scaffolded `/init` content.
