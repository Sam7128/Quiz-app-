# Stress Test Report & Test Matrix — Output Template

## Purpose
This reference defines the EXACT output structure for Phase 3 of the plan-stress-test skill.
The executing agent MUST follow this template precisely. No sections may be omitted.

---

## File Header

```markdown
# Stress Test Report & Test Matrix

**Change**: `<change-name>`
**Generated**: <YYYY-MM-DD HH:MM> (UTC+8)
**Artifacts Analyzed**: <comma-separated list of files read>
**Tech Stack**: <from project.md or config.yaml>

---
```

## Part 1: Stress Test Report

### Rules for Issue Generation

1. **Exhaustiveness**: Every task group in tasks.md MUST have at least 1 issue. Zero-issue modules are NOT acceptable.
2. **Specificity**: "Consider reviewing X" is NOT an issue. Issues must describe a CONCRETE problem.
3. **No Rewrites**: The "Suggested Addition" field must describe what to ADD, not how to rewrite.
4. **Reference Precision**: Always reference the EXACT step number (e.g., "Task 3.2") and file name.
5. **Risk Calibration**:
   - **HIGH**: Could cause data loss, security breach, or production outage
   - **MEDIUM**: Could cause incorrect behavior, poor UX, or maintenance burden
   - **LOW**: Optimization opportunity, style concern, or minor improvement

### Issue Template

```markdown
---

### [ISSUE-XXX] Category: <Architecture | Logic Gap | Missing Detail | Assumption Risk | Edge Case>

- **Affected Step**: Task <N.M>: "<exact task description from tasks.md>"
- **Affected File(s)**: `<file path>` (if identifiable from context)
- **Problem**: <2-4 sentence description of what's wrong or missing>
- **Evidence**: <quote or reference from the plan that reveals this issue>
- **Risk Level**: HIGH | MEDIUM | LOW
- **Impact If Ignored**: <what happens if this issue is NOT addressed>
- **Suggested Addition**: <specific addition to the plan, e.g., "Add a try-catch block around the upsert operation with a fallback to delete+insert if the upsert fails">
```

### Mandatory Cross-Cutting Checks

After all per-module issues, add a section for cross-cutting concerns:

```markdown
## Cross-Cutting Issues

### Security
- [ ] Are all user inputs validated before processing?
- [ ] Are API keys / secrets handled securely?
- [ ] Are database operations protected by RLS / auth checks?
- <add specific findings>

### Performance
- [ ] Are there any unbounded loops or recursive operations?
- [ ] Are large data sets handled with pagination or streaming?
- [ ] Are expensive operations debounced or throttled?
- <add specific findings>

### Error Recovery
- [ ] Does every async operation have error handling?
- [ ] Are there rollback strategies for multi-step operations?
- [ ] Are users notified of failures with actionable messages?
- <add specific findings>

### Data Integrity
- [ ] Are there race conditions in concurrent state updates?
- [ ] Is data validated at both input and output boundaries?
- [ ] Are there orphaned data risks (parent deleted, child remains)?
- <add specific findings>
```

---

## Part 2: Test Matrix

### Rules for Test Matrix Generation

1. **Complete Coverage**: Every module MUST have ALL 5 sub-sections filled. No empty sections.
2. **Minimum Counts**:
   - Unit Test Cases: minimum 3 per module
   - Integration Test Scenarios: minimum 1 per module
   - Edge Cases: minimum 2 per module
   - Error/Failure Scenarios: minimum 2 per module
3. **Priority Rules**:
   - P0: Critical path, must pass for release
   - P1: Important, should pass for release
   - P2: Nice to have, can be deferred
4. **Naming Convention**: Test names should be descriptive: `should_<action>_when_<condition>`

### Module Template

```markdown
---

## Module: <Module Name>

**Source**: Task Group <N> from tasks.md
**Primary Files**: `<file1.ts>`, `<file2.ts>` (if identifiable)

### Unit Test Cases

| # | Test Name | Input | Expected Output | Priority | Notes |
|---|-----------|-------|----------------|----------|-------|
| 1 | should_<action>_when_<condition> | <specific input> | <specific output> | P0 | <context> |
| 2 | should_<action>_when_<condition> | <specific input> | <specific output> | P1 | <context> |
| 3 | should_<action>_when_<condition> | <specific input> | <specific output> | P1 | <context> |

### Integration Test Scenarios

| # | Scenario | Components Involved | Preconditions | Steps | Expected Behavior |
|---|----------|--------------------|-|-------|-------------------|
| 1 | <scenario> | <comp1> ↔ <comp2> | <setup> | 1. ... 2. ... | <expected> |

### Edge Cases

| # | Edge Case | Why It Matters | Input Condition | Expected Handling |
|---|-----------|---------------|-----------------|-------------------|
| 1 | <edge case> | <impact> | <when this happens> | <system should...> |
| 2 | <edge case> | <impact> | <when this happens> | <system should...> |

### Error / Failure Scenarios

| # | Failure | Trigger Condition | Symptoms | Expected Recovery |
|---|---------|-------------------|----------|-------------------|
| 1 | <failure type> | <what causes it> | <user-visible effect> | <recover strategy> |
| 2 | <failure type> | <what causes it> | <user-visible effect> | <recover strategy> |

### Expected Outcomes (Definition of Done)

- [ ] <outcome 1>
- [ ] <outcome 2>
- [ ] <outcome 3>
```

### Cross-Module Integration Tests

After all per-module sections, add:

```markdown
---

## Cross-Module Integration Tests

These test interactions BETWEEN modules that individual module tests cannot cover.

| # | Scenario | Modules Involved | Flow | Expected Behavior | Risk If Untested |
|---|----------|-----------------|------|-------------------|-----------------|
| 1 | <scenario> | Module A → B → C | 1. ... 2. ... | <expected> | <risk> |
```

---

## File Footer

```markdown
---

## Coverage Summary

| Metric | Count |
|--------|-------|
| Modules Analyzed | X |
| Issues Found (HIGH) | X |
| Issues Found (MEDIUM) | X |
| Issues Found (LOW) | X |
| Unit Test Cases | X |
| Integration Scenarios | X |
| Edge Cases | X |
| Error Scenarios | X |
| Cross-Module Scenarios | X |

## Appendix: Artifact-to-Module Mapping

| Module | proposal.md | design.md | tasks.md | Spec Files |
|--------|-------------|-----------|----------|------------|
| <name> | Section X | Decision DX | Task N | spec-name.md |
```
