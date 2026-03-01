---
name: review-check
description: Iteratively review OpenSpec change plans (proposal, specs, design, tasks) for feasibility, logical conflicts, implementation overlap, and code-quality risk. Use when the user asks for plan audit, says `/review check`, mentions `$review-check`, or requests pre-implementation review of a new OpenSpec plan.
---

# Review Check

Run a two-role review loop on OpenSpec planning artifacts and stop only when no unresolved CRITICAL or WARNING issues remain, or when progress stalls and blockers are explicit.

## Workflow

1. Identify target change.
- If the user names a change, use it.
- If no change is named, run `openspec list --json` and select the most recently modified change.
- Run `openspec status --change "<name>" --json` to confirm artifact state.

2. Collect artifacts and context.
- Run `python C:/Users/user/.codex/skills/review-check/scripts/collect_openspec_artifacts.py --root "<project-root>" --change "<name>"`.
- Read each listed artifact that exists: `proposal.md`, `design.md`, `tasks.md`, and `specs/*/spec.md`.
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

4. Execute iterative review loop (max 5 rounds).
- **MANDATORY**: You MUST use `codex exec` (external AI) for the reviewer pass. If the command fails, DO NOT skip or fallback to manual review. You must retry or report the error to the user.
- Round structure:
  1. **Reviewer Pass (Codex)**: Ask codex to produce findings based on current artifacts (and any refutations).
     - **If stress test artifacts were detected**: Include the stress test issues in the Codex prompt and ask Codex to also validate: "The following stress test issues were identified for this plan. Please check if the plan adequately addresses these HIGH-priority issues, or if they represent real gaps that should be resolved before implementation."
  2. **Validation & Fix Pass (You)**: Read the codex report and validate each finding.
     - If the issue is **REAL**: Modify the files immediately.
     - If the issue is **NOT REAL**: Note down a refutation (e.g., "Finding X is invalid because...").
     - **If stress test issues were included**: Also validate whether Codex agrees/disagrees with the stress test findings. Update the assessment accordingly.
  3. **Re-review Pass**: If there were issues, construct a new prompt with the updated artifacts AND your refutations, and send it back to Codex.
- **Completion Condition**: Stop the loop ONLY when the Codex report shows absolutely NO issues, warnings, items to modify, or suggestions.
- **Limit Condition**: If you reach the maximum of 5 iterations and Codex still reports multiple issues, you MUST STOP and report the status to the user. Do not try to continue on your own. The user will review and manually restart the skill if needed.

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
- Never claim a duplicate implementation without showing search evidence from the codebase.
- The stress test detection is NON-DESTRUCTIVE: if no artifacts exist, the entire workflow behaves identically to the original version.
