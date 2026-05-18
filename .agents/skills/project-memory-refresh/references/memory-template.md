# MEMORY.md Template

Use this structure for project memory. Keep the whole file concise and rewrite stale sections instead of appending endless history.

```markdown
# MEMORY.md

## Purpose Snapshot
- [FACT-001] Project goal in one or two lines.
- [FACT-002] Primary stack and runtime.

## Source of Truth
- [PATH-001] `AGENTS.md`: global project rules and routing.
- [PATH-002] `README.md`: setup, commands, and user-facing overview.
- [PATH-003] `src/` or equivalent: actual implementation.

## Aliases & Vocabulary
- [ALIAS-001] "engine" -> `server/strategy_engine.py`, `src/hooks/trading/`
- [ALIAS-002] "dashboard" -> `src/webview/`, `components/dashboard/`

## Entry Points
- [ENTRY-001] `package.json`: primary npm commands and version truth.
- [ENTRY-002] `src/extension.ts`: VS Code extension activation entry.
- [ENTRY-003] `server/app.py`: backend API or orchestration entry.

<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->
## Auto-Generated Memory Map
This block is owned by `refresh_memory_map.py`.
<!-- END AUTO-GENERATED: MEMORY MAP -->

## Stable Facts
- [FACT-010] `services/storage.ts`: local persistence entry point. Tags: storage, persistence
- [FACT-011] `contexts/AuthContext.tsx`: authentication state boundary. Tags: auth, context

## Active Decisions
- [DEC-001] `AGENTS.md`: prefer project-scoped memory only; avoid global project rules.
- [DEC-002] `MEMORY.md`: keep one canonical memory file, not daily fragments.

## Hotspots
- [HOT-001] `services/ai.ts`: prompt/schema changes affect parsing and downstream UI.
- [HOT-002] `hooks/`: feature hooks often encode real business behavior.

## Search Recipes
- [RG-001] `rg -n "Strategy|Trade|Order" src server`
- [RG-002] `rg -n "persist|storage|session" src services stores`

## Archive Index
- [DOC-001] `docs/INDEX.md`: archive overview for reports, checkpoints, and handoffs.

## Open Risks
- [RISK-001] Missing test coverage around sync and persistence merges.
- [RISK-002] Nested `AGENTS.md` can become stale after directory moves.

## Next Refresh Triggers
- Rename or move a top-level module.
- Add or remove a nested `AGENTS.md`.
- Change the main architecture, persistence flow, or integration boundary.
- Finish a task that materially changes the project's hotspots or known risks.
```

Guidelines:

- Start bullets with the ID, then the main path, then the fact.
- Prefer short bullets over prose paragraphs.
- Use `Hotspots` for files worth checking first during future edits.
- Use `Source of Truth` for documents or directories a future agent should read first.
- Use `Aliases & Vocabulary` to map user language or business/domain terms to actual files.
- Use `Entry Points` for the first files an agent should open before broad search.
- Use `Search Recipes` for the smallest set of recurring `rg` patterns that reliably find the right code.
