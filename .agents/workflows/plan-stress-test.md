---
description: 對 OpenSpec 變更計畫執行壓力測試、生成測試矩陣和效能基準規格。以 Senior QA Architect 和 Staff Performance Engineer 的角色，找出計畫弱點並產生完整的測試覆蓋。
---

Stress test an OpenSpec change plan — generate a comprehensive QA report.

**Input**: Optionally specify a change name after `/plan-stress-test` (e.g., `/plan-stress-test add-auth`).

**IMPORTANT**: This workflow invokes the `plan-stress-test` skill. You MUST read the skill's SKILL.md file at `.agents\skills\plan-stress-test\SKILL.md` BEFORE proceeding. The SKILL.md defines the ABSOLUTE RULES and the 5-phase EXECUTION PIPELINE that you MUST follow without exception.

**Steps**

1. **Read the skill definition**
   Read `.agents\skills\plan-stress-test\SKILL.md` completely. This is NON-NEGOTIABLE.
   The skill defines:
   - ABSOLUTE RULES (9 rules that CANNOT be violated)
   - A 5-phase pipeline: LOCATE → INGEST → STRESS TEST → BENCHMARK → DELIVER
   - GATES between each phase (mandatory pass/fail checkpoints)
   - Anti-patterns to avoid
   - Error handling procedures

2. **Execute the skill pipeline exactly as defined**
   Follow the SKILL.md pipeline from Phase 1 through Phase 5, checking each GATE.

   - **Phase 1: LOCATE** — Find the OpenSpec change directory
   - **Phase 2: INGEST** — Read ALL plan artifacts completely
   - **Phase 3: STRESS TEST** — Generate stress test report + test matrix
     - Read `references\stress-test-template.md` for the exact output format
   - **Phase 4: BENCHMARK** — Generate performance benchmark harness specification
     - Read `references\benchmark-template.md` for the exact output format
   - **Phase 5: DELIVER** — Write output files and display summary

3. **Output files**
   Two files will be created in the change directory:
   - `openspec\changes\<name>\stress-test-report.md` — Stress test issues + test matrix
   - `openspec\changes\<name>\benchmark-harness.md` — Performance benchmark specification

**Guardrails**
- Do NOT modify any original plan files (proposal.md, design.md, tasks.md)
- Do NOT skip any modules — every module must have test coverage
- Do NOT skip any GATE — if a GATE fails, STOP and report to the user
- Do NOT use bash/zsh syntax — this is Windows (pwsh)
- Do NOT output only to console — files MUST be written
