---
name: auto-verify
description: Automatically verify if implementation matches the OpenSpec change plan (specs, design, tasks). Triggers an iterative loop of verification and fixes to ensure 100% coverage.
---

# Auto-Verify

Iterative automated verification and implementation fix loop.

## 5-Phase Execution Pipeline

### Phase 1: Target Selection
- Identify the target change (specify name or select latest).
- **GATE**: Change directory must exist.

### Phase 2: Ingest Artifacts
- Read `proposal.md`, `design.md`, `specs/`, and `tasks.md`.
- **GATE**: Artifacts must be present to establish a baseline.

### Phase 3: Stress Test Detection (Optional)
- Check for `stress-test-report.md` and `benchmark-harness.md`.
- If found, include their findings in the verification scope.

### Phase 4: Subagent Verification Loop (Max 5 Rounds)
- **Action**: In each round, run **two independent reviewer subagents** to audit the codebase against the change artifacts:
  - Reviewer A: `gpt-5.2` (xhigh)
  - Reviewer B: `gpt-5.2-codex` (xhigh)
  - **Invocation note**: Spawn them via the subagent/task mechanism (two separate runs) with `model` overridden to the above; include artifacts plus any critical code excerpts in the prompt so reviewers do not need to fetch files themselves.
- **Rules**:
  1. Do NOT self-verify; all detected gaps must originate from subagent review reports.
  2. **IRON RULE**: Reviewer subagents must NOT invoke any "codex" tool/command or any external verifier. Prefer that reviewers use **no tools at all**; they must perform the review themselves based on the artifacts + code excerpts provided.
  3. If subagents report REAL gaps, immediately fix the code and/or update `tasks.md`.
  4. If subagents report FALSE gaps, include a clear, evidence-based refutation in the *next round* prompt so the reviewers can re-audit with that context.
- **GATE**: Loop continues until *both* reviewers report "0 issues found" (or equivalent) or the 5-round limit is reached. If still not perfect after 5 rounds, re-run this skill (start a new 5-round cycle) until perfect.

### Phase 5: Clean Up
- Remove temporary prompt/report files.

## Guardrails
- Issue detection must come from reviewer subagent reports (not from the main agent's self-audit).
- Max 5 rounds per run; if still not perfect, re-run the skill in another 5-round cycle until perfect.
- Reviewer subagents must not invoke any codex tool/command or external verifier.
- Prioritize HIGH risk items from stress test artifacts if present.
