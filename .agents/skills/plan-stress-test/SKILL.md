---
name: plan-stress-test
description: >
  Generate comprehensive QA stress tests, test matrices, and performance benchmark harness specifications
  from OpenSpec change plan artifacts (proposal.md, design.md, tasks.md, delta specs).
  This skill acts as a Senior QA Architect and Staff Performance Engineer.
  Use this skill when: (1) an OpenSpec change has been created via /opsx:new or /opsx:ff and the user wants
  to validate the plan quality before implementation, (2) the user asks to "stress test a plan",
  "generate test matrix", "create benchmark harness", or "review plan quality",
  (3) the user invokes /plan-stress-test with an optional change name argument.
  Environment: Windows (pwsh). All file paths use backslash. All commands use PowerShell syntax.
---

# Plan Stress Test — Senior QA Architect & Performance Engineer

## ABSOLUTE RULES — READ THESE FIRST, VIOLATIONS INVALIDATE ALL OUTPUT

> **RULE-01**: You are STRICTLY FORBIDDEN from modifying, deleting, merging, or rewriting any part of the original plan files (proposal.md, design.md, tasks.md, spec files).
> **RULE-02**: You are STRICTLY FORBIDDEN from outputting a revised or "improved" version of the plan.
> **RULE-03**: You are STRICTLY FORBIDDEN from summarizing or condensing the plan in your output.
> **RULE-04**: You are STRICTLY FORBIDDEN from skipping ANY module or step found in the plan.
> **RULE-05**: You MUST read every plan artifact file completely before generating any output. No partial reads.
> **RULE-06**: You MUST follow the exact Execution Pipeline defined below. No step may be skipped or reordered.
> **RULE-07**: You MUST write all outputs to files in the change directory. Console-only output is NOT acceptable.
> **RULE-08**: If a module seems simple, you MUST still include it with baseline coverage. Zero modules may be skipped.
> **RULE-09**: All commands in this skill are for Windows (pwsh). Use backslash paths. No bash/zsh syntax.

## Execution Pipeline

This skill has **exactly 5 phases**, executed in strict sequential order.
Each phase has a **GATE** — a mandatory verification step that MUST pass before proceeding.
If a GATE fails, you MUST stop and report the failure to the user.

```
Phase 1: LOCATE → Phase 2: INGEST → Phase 3: STRESS TEST → Phase 4: BENCHMARK → Phase 5: DELIVER
```

---

### Phase 1: LOCATE — Identify the Target Change

**Objective**: Find and validate the OpenSpec change directory.

**Steps**:

1. If the user provided a change name (e.g., `/plan-stress-test add-auth`), use it directly.
2. If NO change name was provided:
   a. Run: `openspec list --json`
   b. Parse the JSON output to get all active changes.
   c. If exactly 1 active change exists → use it automatically and announce: "Auto-selected change: `<name>`"
   d. If 0 active changes exist → **STOP**. Report: "No active OpenSpec changes found. Create one with `/opsx:new` or `/opsx:ff` first."
   e. If >1 active changes exist → ask the user to select one.

3. Validate the change directory exists at: `openspec\changes\<name>\`
   - If it does NOT exist, check: `openspec\changes\archive\<name>\`
   - If neither exists → **STOP**. Report: "Change directory not found for `<name>`."

4. Run: `openspec status --change "<name>" --json`
   - Parse the JSON to confirm which artifacts are available.

**GATE-1: LOCATION VERIFIED**
- ✅ Change directory exists
- ✅ At least ONE artifact file (proposal.md OR design.md OR tasks.md) is readable
- If GATE-1 fails → STOP. Do NOT proceed.

---

### Phase 2: INGEST — Read ALL Plan Artifacts Completely

**Objective**: Load every plan artifact into your working context. NO partial reads allowed.

**Steps** (execute ALL in parallel where possible):

1. **Read proposal.md** (if exists) — contains WHY, WHAT, IMPACT sections
2. **Read design.md** (if exists) — contains CONTEXT, GOALS, DECISIONS, RISKS
3. **Read tasks.md** (if exists) — contains numbered task groups with checkbox items
4. **Read ALL delta spec files** — scan `openspec\changes\<name>\specs\` directory
   - For each `.md` file found, read it completely
   - These contain capability specifications with requirements and scenarios

5. **Read project context** — Read `openspec\project.md` and `openspec\config.yaml`
   - This provides tech stack and project-level constraints

6. **Build the Internal Model** — After reading ALL files, construct a mental model:
   - List every MODULE (a major task group from tasks.md, or a capability from specs)
   - List every DECISION from design.md
   - List every RISK from design.md
   - List every REQUIREMENT from spec files
   - List every SCENARIO from spec files

**GATE-2: INGESTION COMPLETE**
- ✅ You can enumerate ALL modules by name
- ✅ You can enumerate ALL decisions by ID (D1, D2, etc.)
- ✅ You can enumerate ALL risks identified
- ✅ You have read every spec file in the specs/ subdirectory (or confirmed none exist)
- If GATE-2 fails (you cannot enumerate the above) → Re-read the files. Do NOT proceed with partial knowledge.

---

### Phase 3: STRESS TEST — Generate the Stress Test Report & Test Matrix

**Objective**: Find weaknesses in the plan and generate exhaustive test coverage.

**Reference**: Read `references\stress-test-template.md` for the EXACT output format and rules.

This phase produces TWO separate sections in a SINGLE output file:

#### Section A: Stress Test Report

For EVERY issue found, output in this EXACT format:

```markdown
### [ISSUE-XXX] Category: <one of: Architecture | Logic Gap | Missing Detail | Assumption Risk | Edge Case>
- **Affected Step**: <exact step name/number from tasks.md>
- **Problem**: <specific, detailed description of the weakness>
- **Risk Level**: HIGH | MEDIUM | LOW
- **Suggested Addition**: <what should be ADDED to the plan — NOT a rewrite>
```

**Mandatory Categories to Examine** (you MUST check ALL of these for EVERY module):

| Category | What to Look For |
|----------|-----------------|
| Architecture | Missing error boundaries, no fallback paths, coupling issues, scalability bottlenecks |
| Logic Gap | Race conditions, state inconsistencies, missing edge branches, null/undefined handling |
| Missing Detail | Vague task descriptions, unspecified error behavior, missing rollback strategies |
| Assumption Risk | Implicit dependencies, assumed environment behavior, undocumented prerequisites |
| Edge Case | Empty inputs, boundary values, concurrent operations, permission edge cases |

**Minimum Issue Count**: You MUST find at least 3 issues per module. If you cannot find real issues, flag it with `[LOW] No significant issues found for module X — baseline coverage applied.`

#### Section B: Test Matrix

For EVERY module in the plan, output in this EXACT format:

```markdown
### Module: <module name>

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | ... | ... | ... | P0/P1/P2 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|

#### Expected Outcomes
- <bullet list of what "success" looks like for this module>
```

**GATE-3: STRESS TEST COMPLETE**
- ✅ Every module from Phase 2's Internal Model has at least ONE issue in the Stress Test Report
- ✅ Every module has a complete Test Matrix entry (all 5 sub-sections)
- ✅ Cross-module integration scenarios are included
- ✅ Zero modules were skipped
- If GATE-3 fails → Go back and add coverage for the missing modules.

---

### Phase 4: BENCHMARK — Generate the Performance Benchmark Harness

**Objective**: Design a production-grade benchmark specification covering every module.

**Reference**: Read `references\benchmark-template.md` for the EXACT output format and rules.

This phase produces a SEPARATE output file with these sections:

#### Section 1: Performance Baselines

For EACH module:

```markdown
### Module: <name>

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| <op name> | Small (N=10) | <Xms> | <Xms> | <Xms> | <X MB> | <X ops/sec> |
| <op name> | Medium (N=100) | ... | ... | ... | ... | ... |
| <op name> | Large (N=1000) | ... | ... | ... | ... | ... |
| <op name> | Stress (N=10000) | ... | ... | ... | ... | ... |
```

**Rules**:
- Use `[ASSUMPTION]` flags when thresholds are estimated rather than measured
- For frontend modules: measure render time, re-render count, bundle size impact
- For data modules: measure CRUD operation latency, batch operation throughput
- For API modules: measure request latency, error rate under load

#### Section 2: Benchmark Test Scenarios

Cover ALL 5 scenario types:

| Scenario | Duration | Load Pattern | Success Criteria |
|----------|----------|-------------|-----------------|
| Normal Load | 5 min | Steady state | All p95 < thresholds |
| Peak Load | 2 min | 3x normal | No crashes, degradation < 50% |
| Sustained Load | 30 min | Steady state | No memory leaks, stable latency |
| Spike Test | 1 min | 0 → max → 0 | Recovery < 5 seconds |
| Failure Recovery | 5 min | Normal + injected failures | Graceful degradation |

#### Section 3: Benchmark Harness Setup

For the identified tech stack, specify:
- Recommended benchmarking tool/framework
- Data seeding requirements (what test data to create)
- Environment isolation requirements (how to avoid test pollution)
- **How to run**: Exact PowerShell commands (this is Windows)
- **How to interpret results**: Pass/fail criteria tables

#### Section 4: Regression Gate

Define clear pass/fail criteria:

```markdown
| Module | Regression Threshold | Rationale |
|--------|---------------------|-----------|
| <name> | <X%> increase blocks release | <why this threshold> |
```

**GATE-4: BENCHMARK COMPLETE**
- ✅ Every module has a Performance Baseline table
- ✅ All 5 scenario types are covered
- ✅ Harness setup includes runnable PowerShell commands
- ✅ Regression gate has a threshold for every module
- If GATE-4 fails → Go back and add coverage for the missing sections.

---

### Phase 5: DELIVER — Write Output Files & Summary

**Objective**: Write all outputs to the change directory and provide a summary.

**Steps**:

1. **Write Stress Test Report & Test Matrix** to:
   `openspec\changes\<name>\stress-test-report.md`

2. **Write Benchmark Harness** to:
   `openspec\changes\<name>\benchmark-harness.md`

3. **Display Summary** to the user:

```markdown
## ✅ Plan Stress Test Complete

**Change**: `<name>`
**Artifacts Analyzed**: proposal.md, design.md, tasks.md, N spec files

### Stress Test Report
- **Issues Found**: X total (Y HIGH, Z MEDIUM, W LOW)
- **Modules Covered**: N/N (100%)
- **Output**: `openspec\changes\<name>\stress-test-report.md`

### Test Matrix
- **Total Test Cases**: X unit + Y integration + Z edge cases
- **Modules Covered**: N/N (100%)
- **Output**: (included in stress-test-report.md)

### Benchmark Harness
- **Modules Benchmarked**: N/N (100%)
- **Scenarios**: 5/5 scenario types covered
- **Output**: `openspec\changes\<name>\benchmark-harness.md`

### Next Steps
1. Review the stress test report for HIGH-priority issues
2. Address issues before implementing with `/opsx:apply`
3. Use the test matrix to guide test development during implementation
4. Set up the benchmark harness after implementation is complete
```

**GATE-5: DELIVERY VERIFIED**
- ✅ Both output files exist and are non-empty
- ✅ Summary has been displayed to the user
- If GATE-5 fails → Re-write the missing files.

---

## Error Handling

| Error | Action |
|-------|--------|
| Change directory not found | STOP. Ask user for correct change name. |
| No artifact files found | STOP. Report that the change has no plan artifacts. |
| Single artifact only (e.g., only proposal.md) | WARN the user that coverage will be limited. Proceed with available artifacts only. |
| openspec CLI not available | Fall back to manual file reading via `list_dir` and `view_file` tools. |
| Output file write fails | Retry once. If still fails, output to console and inform user. |

## Anti-Patterns — What This Skill Must NEVER Do

1. ❌ NEVER rewrite or "improve" the original plan
2. ❌ NEVER skip a module because it "seems simple"
3. ❌ NEVER output only to console without writing files
4. ❌ NEVER proceed to a later phase without passing the current phase's GATE
5. ❌ NEVER generate vague issues like "consider reviewing X" — every issue must be specific
6. ❌ NEVER use bash/zsh commands — this is Windows (pwsh)
7. ❌ NEVER self-correct by skipping the pipeline — if stuck, STOP and ask the user
