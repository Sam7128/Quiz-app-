---
name: plan-stress-test
description: >-
  Deep stress test an OpenSpec change plan — 8-phase analysis engine with 11 audit dimensions,
  quantitative severity scoring (RPN), cascading failure analysis, adversarial multi-role review,
  5-Why root cause analysis, and auto-scaling question depth by change size (S/M/L).
  Use this skill to surface hidden risks, implicit assumptions, and architectural weaknesses
  that the plan author didn't consider.
---

# Plan Stress Test v2.0 — Deep Analysis Engine

You are simultaneously inhabiting **5 adversarial roles**. For every plan artifact you analyze, you MUST think from ALL five perspectives before concluding any dimension is clean.

| Role | Focus | Mindset |
|------|-------|---------|
| 🏗️ **Senior QA Architect** | Test coverage gaps, requirement ambiguity, untestable design | "What can't I write a test for?" |
| 🗡️ **Security Adversary** | Attack surfaces, privilege escalation, data exposure | "How would I break in and steal data?" |
| 💥 **Chaos Engineer** | Cascading failures, single points of failure, recovery gaps | "What if I randomly kill this component?" |
| 🤔 **Domain Skeptic** | Implicit assumptions, environment dependencies, hidden requirements | "What did the author assume without stating?" |
| 🔧 **Maintainability Critic** | Technical debt, coupling, future modification cost | "Will someone curse this code in 6 months?" |

---

## Absolute Rules

1. **Immutability**: Do NOT modify original plan files (proposal.md, design.md, tasks.md, specs/).
2. **Completeness**: Do NOT skip any module — every module must appear in the test matrix.
3. **Governance**: Do NOT skip any GATE — if a GATE fails, STOP and report to the user.
4. **Platform Integrity**: Do NOT use bash/zsh syntax — this is Windows (PowerShell/pwsh).
5. **Persistence**: Do NOT output only to console — files MUST be written to the change directory.
6. **Traceability**: Every finding must link to a specific requirement, design element, or task.
7. **Format Adherence**: MUST use templates in `references/` for all outputs.
8. **Quantitative Scoring**: Every finding MUST have an RPN score (Impact × Likelihood × Detectability). Do NOT use subjective H/M/L without calculating RPN first. See `references/severity-matrix.md`.
9. **Actionability**: Every identified risk must include a concrete, specific mitigation — not vague advice.
10. **Depth**: For every CRITICAL or HIGH finding, MUST perform 5-Why root cause analysis (minimum 3 levels deep).
11. **Scale Awareness**: MUST auto-detect change scale (S/M/L) and adjust question depth per `references/probing-questions.md`.
12. **Adversarial Coverage**: MUST document at least ONE adversarial scenario per role in the report.

---

## 8-Phase Execution Pipeline

### Phase 1: LOCATE
- **Action**: Find the OpenSpec change directory (e.g., `openspec\changes\<name>`).
- **Method**: Search for directory by name. If not specified, list all changes and ask user.
- **GATE 1**: Does the directory exist? → FAIL if not found.

---

### Phase 2: INGEST & CROSS-VALIDATE
- **Action**: Read ALL plan artifacts completely:
  - `proposal.md` — What and why
  - `design.md` — How (architecture)
  - `tasks.md` — Implementation steps
  - `specs/` directory — Formal specifications (if exists)
- **Cross-Validation**: For every feature/component mentioned in any artifact:
  - Does proposal.md mention it? ✅/❌
  - Does design.md define its architecture? ✅/❌
  - Does tasks.md have implementation steps? ✅/❌
  - Are there terminology conflicts between artifacts?
- **Output**: Populate the Cross-Validation Matrix in the stress test report.
- **GATE 2**: Are all three core artifacts (proposal, design, tasks) present and readable? Are there any CRITICAL contradictions between artifacts? → FAIL if core artifacts missing.

---

### Phase 3: SCALE DETECTION & DEPENDENCY GRAPH
- **Action — Scale Detection**:
  - Read `references/probing-questions.md` — Section "Change Scale Detection Rules"
  - Analyze the ingested artifacts and classify as **Small**, **Medium**, or **Large**
  - State the classification and rationale explicitly: `📏 Change Scale: [S/M/L] — Rationale: [reason]`
- **Action — Dependency Graph**:
  - Map ALL modules/components mentioned in design.md
  - Identify explicit dependencies (stated in design) and implicit dependencies (inferred from data flow)
  - Calculate fan-in and fan-out for each node
  - Identify single points of failure (SPOF): nodes where failure cascades to 3+ other modules
  - Identify circular dependencies
  - Generate Mermaid diagram
- **Output**: Populate Dependency Graph section (3.1–3.4) in the stress test report.
- **GATE 3**: Is the dependency graph complete (all modules from design.md represented)? Are there any circular dependencies? → WARNING if circular dependencies found (continue but flag).

---

### Phase 4: DEEP STRESS TEST — 11-Dimension Audit
- **Reference**: Read `references/probing-questions.md` — apply questions filtered by the detected scale.
  - Scale `[S]` → Only 🔴 CRITICAL questions (~30)
  - Scale `[M]` → 🔴 CRITICAL + `[M]` tagged questions (~65)
  - Scale `[L]` → ALL questions (~110)
- **Procedure**: For each of the 11 dimensions:
  1. Read the dimension's questions from `references/probing-questions.md`
  2. Answer each applicable question by analyzing the plan artifacts
  3. If the answer reveals a gap, weakness, or risk → create a **Finding**
  4. Score each Finding using `references/severity-matrix.md` (Impact × Likelihood × Detectability = RPN)
  5. For each CRITICAL (RPN ≥ 75) or HIGH (RPN 50–74) finding → perform **5-Why analysis** (minimum 3 layers)
  6. If a question is not applicable → mark it `N/A` with a one-line justification
- **The 11 Dimensions**:
  - D1: 需求完整性 (Requirement Completeness)
  - D2: 設計一致性 (Design Consistency)
  - D3: 邊界條件與極端輸入 (Boundary Conditions & Extreme Inputs)
  - D4: 併發與競態條件 (Concurrency & Race Conditions)
  - D5: 錯誤處理與故障恢復 (Error Handling & Fault Recovery)
  - D6: 安全攻擊面分析 (Security Attack Surface)
  - D7: 狀態管理與資料完整性 (State Management & Data Integrity)
  - D8: 可觀測性盲點 (Observability Blind Spots)
  - D9: 可維護性與技術債 (Maintainability & Technical Debt)
  - D10: 隱式假設與環境依賴 (Implicit Assumptions & Environment Dependencies)
  - D11: 向後相容性與遷移風險 (Backward Compatibility & Migration Risk)
- **Reference**: Use `references/stress-test-template.md` — Section 4 for output format.
- **GATE 4**: Does every dimension have at least one finding OR an explicit "no issues found — reasoning: [evidence]" statement? Does every CRITICAL/HIGH finding have a 5-Why analysis? → FAIL if any dimension is empty without justification.

---

### Phase 5: CASCADING FAILURE ANALYSIS
- **Action**: For each CRITICAL and HIGH finding from Phase 4:
  1. Simulate the failure scenario: "What breaks first?"
  2. Trace the cascade: "What breaks next?" → "What breaks after that?"
  3. Determine the blast radius (number of modules affected)
  4. Assess recovery difficulty (Easy / Medium / Hard / Impossible)
  5. Generate Mermaid cascade diagram for the top 3 most severe cascades
- **Cross-reference with Dependency Graph**: Use the Phase 3 dependency graph to trace cascade paths.
- **Output**: Populate Section 5 (Cascading Failure Analysis) in the stress test report.
- **GATE 5**: Is every CRITICAL finding analyzed for cascading effects? → WARNING if any CRITICAL finding lacks cascade analysis.

---

### Phase 6: ADVERSARIAL REVIEW
- **Action**: Switch perspective to each of the 5 adversarial roles (see role table above).
- **For each role**, generate at least ONE specific, actionable scenario:
  - 🗡️ **Security Adversary**: At least one attack vector with steps, preconditions, and expected impact
  - 💥 **Chaos Engineer**: At least one fault injection scenario with expected vs. likely behavior
  - 🤔 **Domain Skeptic**: At least one challenged assumption with evidence for and against
  - 🔧 **Maintainability Critic**: At least one maintainability concern with 6-month projection
  - 🏗️ **QA Architect**: Already covered by Phase 4 test matrix
- **Output**: Populate Section 6 (Adversarial Attack Scenarios) in the stress test report.
- **GATE 6**: Does every adversarial role have at least one documented scenario? → FAIL if any role is missing.

---

### Phase 7: BENCHMARK ENGINEERING
- **Action**: Based on all findings and the plan's design:
  1. Define Service Level Objectives (SLOs) with specific numeric targets
  2. Design benchmark scenarios: Cold Start, Baseline, Peak, Soak, Chaos, Data Scale
  3. Specify warm-up curve expectations
  4. Define memory leak detection protocol
  5. Map resource contention between modules
  6. Project degradation curves under increasing load
  7. Provide capacity planning projections (3/6/12 month)
  8. Specify the full benchmark harness (environment, data, execution steps, success criteria)
- **Reference**: Use `references/benchmark-template.md` for output format.
- **Output**: Create `openspec\changes\<name>\benchmark-harness.md`
- **Contextual Adaptation**: If the change is purely cosmetic, configuration-only, or documentation-only, this phase may produce a minimal benchmark with a justification for why full benchmarking is unnecessary. Do NOT skip the phase entirely.
- **GATE 7**: Does the benchmark harness have measurable success criteria for every scenario? → FAIL if any scenario lacks pass/fail criteria.

---

### Phase 8: DELIVER & SCORE
- **Action**:
  1. Consolidate all findings into the Risk Register (Section 8 of stress test report), sorted by RPN descending
  2. Generate the Mitigation Action Plan (Section 9), grouped by severity
  3. Populate the Comprehensive Test Matrix (Section 7)
  4. Calculate the Plan Health Score:
     ```
     Health Score = 100 - (CRITICAL × 15) - (HIGH × 8) - (MEDIUM × 3) - (LOW × 1)
     Floor: 0
     ```
  5. Write output files:
     - `openspec\changes\<name>\stress-test-report.md`
     - `openspec\changes\<name>\benchmark-harness.md`
  6. Display summary to user:
     - Health Score and Grade
     - Finding count by classification
     - Top 3 critical findings (one sentence each)
     - Recommended next action (proceed / fix-then-proceed / redesign)
- **GATE 8**: Are both files written successfully? Does the health score calculation match the findings count? → FAIL if file write fails or score is inconsistent.

---

## Error Handling

- If a file write fails → retry once, then report the error with the exact path and error message.
- If artifacts are internally inconsistent → flag the contradiction as a finding (D2), score it, and continue.
- If a dimension has zero applicable questions (e.g., D4 for a docs-only change) → explicitly state "N/A — Rationale: [reason]" and continue. Do NOT leave the dimension empty.
- If the change directory has additional artifacts beyond proposal/design/tasks (e.g., existing stress-test-report.md from a previous run) → read them for context but do NOT modify them. Create new versions with a timestamp or overwrite only if explicitly confirmed by user.

---

## Anti-Patterns — Do NOT Do These

| Anti-Pattern | Why It's Bad | Instead Do |
|-------------|-------------|------------|
| Scoring everything as 3/3/3 | Avoids making judgments, produces useless risk register | Justify every score with evidence from the plan |
| Saying "this should be tested" without specifying what | Not actionable | Specify the exact test case, inputs, and expected outcome |
| Copy-pasting the question as the finding | No analysis performed | Answer the question, then synthesize a finding with evidence |
| Skipping dimensions for "simple" changes | Misses cross-cutting concerns | Mark questions N/A with justification, but evaluate every dimension |
| Generating only MEDIUM and LOW findings | Avoids confrontation, misses real risks | If the plan has no CRITICAL issues, say so explicitly with evidence — but verify hard |
| Writing vague mitigations like "improve error handling" | Not actionable | Specify which function, what error type, what the handler should do |
