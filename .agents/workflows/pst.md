---
description: 對 OpenSpec 變更計畫執行深度壓力測試（8 階段管線、11 審計維度、量化嚴重度評分、連鎖故障分析、對抗性多角色審查、5-Why 根因追問）。自動偵測變更規模並按 S/M/L 分級套用追問深度。
---

Deep stress test an OpenSpec change plan — 8-phase analysis engine with 11 audit dimensions.

**Input**: Optionally specify a change name after `/plan-stress-test` (e.g., `/plan-stress-test add-auth`).

**IMPORTANT**: This workflow invokes the `plan-stress-test` skill. You MUST read the skill's SKILL.md file at `.agents\skills\plan-stress-test\SKILL.md` BEFORE proceeding. The SKILL.md defines the ABSOLUTE RULES and the 8-phase EXECUTION PIPELINE that you MUST follow without exception.

**Steps**

1. **Read the skill definition**
   Read `.agents\skills\plan-stress-test\SKILL.md` completely. This is NON-NEGOTIABLE.
   The skill defines:
   - 5 adversarial roles that you must inhabit simultaneously
   - 12 ABSOLUTE RULES (that CANNOT be violated)
   - An 8-phase pipeline: LOCATE → INGEST & CROSS-VALIDATE → SCALE DETECTION & DEPENDENCY GRAPH → DEEP STRESS TEST → CASCADING FAILURE → ADVERSARIAL REVIEW → BENCHMARK → DELIVER & SCORE
   - GATES between each phase (mandatory pass/fail checkpoints)
   - Anti-patterns to avoid
   - Error handling procedures

2. **Read reference files as needed during pipeline execution**
   The following reference files in `.agents\skills\plan-stress-test\references\` are used:
   - `probing-questions.md` — 11-dimension deep question bank with S/M/L scale filtering (read in Phase 3–4)
   - `severity-matrix.md` — Quantitative RPN scoring framework (read in Phase 4)
   - `stress-test-template.md` — Output format for the stress test report (read in Phase 4–8)
   - `benchmark-template.md` — Output format for the benchmark harness (read in Phase 7)

3. **Execute the skill pipeline exactly as defined**
   Follow the SKILL.md pipeline from Phase 1 through Phase 8, checking each GATE.

   - **Phase 1: LOCATE** — Find the OpenSpec change directory
   - **Phase 2: INGEST & CROSS-VALIDATE** — Read ALL plan artifacts + cross-consistency check
   - **Phase 3: SCALE DETECTION & DEPENDENCY GRAPH** — Auto-classify change as S/M/L + build dependency map
   - **Phase 4: DEEP STRESS TEST** — 11-dimension audit with scale-filtered probing questions + RPN scoring + 5-Why analysis
   - **Phase 5: CASCADING FAILURE ANALYSIS** — Trace failure cascades for CRITICAL/HIGH findings
   - **Phase 6: ADVERSARIAL REVIEW** — Multi-role attack scenarios (Security, Chaos, Skeptic, Maintainability)
   - **Phase 7: BENCHMARK ENGINEERING** — Deep performance specification with 6 scenario types
   - **Phase 8: DELIVER & SCORE** — Consolidate risk register + health score + write files

4. **Output files**
   Two files will be created in the change directory:
   - `openspec\changes\<name>\stress-test-report.md` — Cross-validation + dependency graph + 11-dimension audit + cascading failures + adversarial scenarios + test matrix + risk register + mitigation plan
   - `openspec\changes\<name>\benchmark-harness.md` — SLOs + 6 benchmark scenarios + warm-up curve + leak detection + resource contention + degradation curves + capacity planning + harness spec

**Guardrails**
- Do NOT modify any original plan files (proposal.md, design.md, tasks.md, specs/)
- Do NOT skip any modules — every module must have test coverage
- Do NOT skip any GATE — if a GATE fails, STOP and report to the user
- Do NOT skip any dimension — if N/A, state the justification explicitly
- Do NOT use subjective H/M/L risk labels — MUST calculate RPN scores
- Do NOT use bash/zsh syntax — this is Windows (pwsh)
- Do NOT output only to console — files MUST be written
- Do NOT score everything as 3/3/3 — justify every score with evidence
- Do NOT write vague mitigations — every mitigation must be specific and actionable
