# Native Automation

Use these as optional adapters when a tool has its own project instruction or memory automation. Keep `AGENTS.md`, `MEMORY.md`, and `docs/INDEX.md` as the canonical project memory.

## Gemini CLI

- Set `.gemini/settings.json` `context.fileName` to `["AGENTS.md"]` so Gemini reads the same root instructions as Codex.
- Use Gemini's memory refresh command after major project-structure changes.
- Keep project facts in the repo files, not in global Gemini memory.
- For legacy projects that still have `GEMINI.md`, migrate durable rules into `AGENTS.md`, move dynamic facts into `MEMORY.md`, preserve long chronological notes in `DEVELOPMENT_LOG.md` or `docs/`, then retire `GEMINI.md`.
- Keep `%USERPROFILE%\\.gemini\\GEMINI.md` minimal and global-only. It may hold user-wide preferences, but it should not hold project-specific history, bugs, or module maps.

## Claude Code

- Keep a short `CLAUDE.md` or imported instruction file that tells Claude to read `AGENTS.md` and `MEMORY.md`.
- If hooks are enabled, use a `PostToolUse` hook on write/edit operations to remind or run the memory refresh workflow.
- Optionally use a session-start reminder to read `MEMORY.md` before broad exploration.

## General Rule

- Native memory features are accelerators, not the source of truth.
- Never let tool-specific memories silently drift away from the repository files.
- Keep any cached search/index data project-local; do not build one shared memory cache across unrelated repositories by default.
