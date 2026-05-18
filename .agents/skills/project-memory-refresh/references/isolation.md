# Project Isolation

This skill must preserve project boundaries.

## Default rule

- One project root, one `MEMORY.md`, one `docs/INDEX.md`, one optional `.memory-index/`.
- Do not scan sibling projects.
- Do not build a combined index over `C:\Users\user\Desktop\` or similar parent directories.

## Safe search boundary

- Resolve the requested root to an absolute real path.
- Refuse files whose resolved path escapes that root.
- Ignore symlinks or junctions that point outside the root.
- When the user wants cross-project comparison, treat it as a separate explicit task.

## Why

Cross-project memory contamination is worse than missing memory:

- it pollutes search relevance,
- it leaks unrelated conventions,
- it can cause the agent to apply the wrong architecture or workflow.
