---
name: openspec-apply-with-tests
description: Implement tasks from an OpenSpec change and run associated tests. Automatically integrates stress test findings into the implementation flow.
---

# OpenSpec: Apply with Tests

Implementation flow with proactive testing and stress-test awareness.

## Pipeline

### Phase 1: SELECT
Identify target change.

### Phase 2: DETECT
Check for `stress-test-report.md` or `benchmark-harness.md`.
Enable **TEST MODE** if found.

### Phase 3: INGEST
Read context artifacts (standard + stress data).

### Phase 4: IMPLEMENT
- Process `tasks.md` sequentially.
- Address stress test findings proactively (defensive coding, P0 scenarios).
- **Validation**: Run relevant unit/integration tests after each task.

### Phase 5: REPORT
Summarize progress and test coverage.

## Guardrails
- Stress test artifacts are read-only references.
- `tasks.md` takes priority over advisory findings.
- Use `pwsh` syntax for all commands.
