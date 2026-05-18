# Report Organization

Use this optional step when the project root is cluttered with completed-task or report-style Markdown files.

Keep at root:

- `README.md`
- `AGENTS.md`
- `MEMORY.md`
- `GEMINI.md` if still used by the project
- `CHANGELOG.md`
- `CHECKLIST.md`
- `CONTRIBUTING.md`
- `DEVELOPMENT_LOG.md`
- main product or overview docs that still serve as entry points

Archive patterns:

- `docs/reports/`
  - `CHANGE-REPORT*.md`
  - `*REPORT*.md`
  - exploration, optimization, audit, safety, and risk writeups
- `docs/checkpoints/`
  - `CHECKPOINT*.md`
  - `*followup*.md`
  - `*progress*.md`
  - `*status*.md`
  - milestone status notes
- `docs/handoffs/`
  - `SESSION_HANDOFF*.md`
  - `SESSION-SUMMARY*.md`

Rules:

- Do not touch `openspec/`.
- Do not move files that are still active source-of-truth docs.
- Prefer deterministic folder names over ad hoc archive names.
- Rebuild `docs/INDEX.md` after moving files so archived reports remain searchable.
