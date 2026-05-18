---
name: review-check
description: Iteratively review OpenSpec change plans (proposal, specs, design, tasks) for feasibility, logical conflicts, implementation overlap, and code-quality risk. Use when the user asks for plan audit, says `/review check`, mentions `$review-check`, or requests pre-implementation review of a new OpenSpec plan.
---

# Review Check

Run an orchestrated multi-reviewer loop on OpenSpec planning artifacts using 3 internal review sub-agents, and stop only when no unresolved CRITICAL or WARNING issues remain, or when progress stalls and blockers are explicit.

## Workflow

1. Identify target change.
- If the user names a change, use it.
- If no change is named: select the most recently modified folder under `openspec\changes\`.
- Confirm artifact state by reading files directly from the change folder (no external CLI required).

2. Collect artifacts and context.
- Collect artifacts by enumerating and reading the full contents of: `proposal.md`, `design.md`, `tasks.md`, and `specs\**\spec.md` (if present) under the change folder.
- (Optional) You may run `python .\\.agents\\skills\\review-check\\scripts\\collect_openspec_artifacts.py --root "<project-root>" --change "<name>"` to list artifact paths + metadata.
- If an artifact is missing, log it as a potential planning gap, not an automatic failure.

3. **[Stress Test Detection — Optional Step]**
- Check if `stress-test-report.md` exists in `openspec\changes\<name>\stress-test-report.md`.
- Check if `benchmark-harness.md` exists in `openspec\changes\<name>\benchmark-harness.md`.
- **If EITHER file exists**:
  - Read them completely.
  - Announce: `🧪 Stress test artifacts detected. Review will include stress test issue validation.`
  - Extract all `[ISSUE-XXX]` entries from `stress-test-report.md`.
  - Add a supplementary review dimension: **Stress Test Validation** (see Section below).
- **If NEITHER file exists**:
  - Announce: `📋 No stress test artifacts found. Standard review only.`
  - Skip all stress test related steps below. The rest of the workflow is UNCHANGED.

4. Execute iterative review loop (max 5 rounds per cycle; repeat cycles until PASS or BLOCKED).
- **MANDATORY**: The reviewer pass MUST be performed by 3 internal review sub-agents (no external Codex CLI):
  - `gpt-5.3-codex` (xhigh)
  - `gpt-5.2` (xhigh)
  - `gpt-5.2-codex` (xhigh)
- Review sub-agents **MUST NOT** call any Codex tool or external CLI. They must review strictly from the provided review packet (rubric + full artifact text + backlog + refutations).
- Round structure:
  1. **Reviewer Pass (3 sub-agents in parallel)**: each produces a structured report with CRITICAL/WARNING/SUGGESTION findings and citations.
     - **If stress test artifacts were detected**: include stress test issues in the review packet and require explicit validation coverage.
  2. **Validation & Fix Pass (You / Orchestrator)**: validate each finding against artifacts.
     - If **REAL**: modify artifacts immediately.
     - If **NOT REAL**: add a refutation with citations (quotes + artifact path/anchor).
     - If **NEEDS-INFO**: update artifacts to remove ambiguity; do not leave it implicit.
  3. **Re-review Pass**: rebuild the review packet with updated artifacts + backlog + refutations and repeat.
- **Completion Condition**: stop only when the aggregated report has no unresolved CRITICAL/WARNING actionable issues (SUGGESTION-only is acceptable for PASS_WITH_WARNINGS).
- **Cycle Limit**: if you reach 5 rounds and CRITICAL/WARNING issues still remain, restart the skill (new cycle) with the updated artifacts and continue until you reach PASS/PASS_WITH_WARNINGS or a true BLOCKED state (e.g., missing user decision/requirements). If the same issues repeat with no progress across cycles, declare BLOCKED and ask the user for the missing decision/info.

5. Audit with rubric from `references/review-rubric.md`.
- Check feasibility and missing dependencies.
- Check logic consistency across artifacts.
- Check whether solutions already exist in code with different implementations.
- Check code quality, testability, and rollout risk.
- Check traceability from capabilities/requirements to tasks.

6. Produce actionable report.
- Include exact file references and concrete corrections.
- Distinguish confirmed issues from hypotheses.
- Provide prioritized next actions.
- **If stress test artifacts were detected**: Include a dedicated section "Stress Test Cross-Reference" in the report.

## Output Format

1. `Target`: change name + reviewed artifacts.
2. `Round History`: per-round findings and what was resolved.
3. `Open Issues`: grouped by CRITICAL, WARNING, SUGGESTION.
4. `Stress Test Cross-Reference` (only if artifacts detected): Which stress test issues were validated, which were dismissed, which require plan changes.
5. `Fix Plan`: concrete file-level edits.
6. `Verdict`: `PASS`, `PASS_WITH_WARNINGS`, or `BLOCKED`.

## Stress Test Validation Dimension (Only Active When Artifacts Detected)

When `stress-test-report.md` is found, add this review dimension:

| Check | What to Validate |
|-------|-----------------|
| HIGH Issues Addressed | Does the plan have explicit steps to handle each HIGH-risk issue? |
| Architecture Issues | Are error boundaries and fallback paths defined? |
| Logic Gap Issues | Are race conditions and state inconsistencies accounted for? |
| Edge Case Issues | Are boundary values and concurrent operations handled? |
| Test Matrix Coverage | Do the tasks create enough test cases to cover the Test Matrix? |

## Notes

- Treat proposals without specs/design/tasks as in-progress plans and review what exists.
- Never claim a duplicate implementation without concrete citations; if search is available, reference results from built-in grep/search tools (not external CLI).
- The stress test detection is NON-DESTRUCTIVE: if no artifacts exist, the entire workflow behaves identically to the original version.
