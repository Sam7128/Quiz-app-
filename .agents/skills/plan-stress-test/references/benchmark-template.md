# Performance Benchmark Harness — Output Template

## Purpose
This reference defines the EXACT output structure for Phase 4 of the plan-stress-test skill.
The executing agent MUST follow this template precisely. No sections may be omitted.

---

## File Header

```markdown
# Performance Benchmark Harness Specification

**Change**: `<change-name>`
**Generated**: <YYYY-MM-DD HH:MM> (UTC+8)
**Tech Stack**: <from project.md or config.yaml>
**Stress Test Reference**: `stress-test-report.md` (generated in Phase 3)

---
```

## Section 1: Performance Baselines

### Rules

1. Every module from the plan MUST have a baseline table. Zero modules may be skipped.
2. If thresholds are estimated (not measured), mark with `[ASSUMPTION]`.
3. For frontend/UI modules: measure render time, re-render count, DOM node count, bundle size impact.
4. For state management modules: measure state update latency, listener notification time.
5. For data/storage modules: measure CRUD operation latency, batch operation throughput.
6. For network/API modules: measure request latency, error rate, retry overhead.
7. Always include 4 input profiles: Small, Medium, Large, Stress.

### Template Per Module

```markdown
---

## Module: <Module Name>

**Source**: Task Group <N> from tasks.md
**Category**: <Frontend UI | State Management | Data/Storage | Network/API | Business Logic>

### Operations

| Operation | Input Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|--------------|-----|-----|-----|--------|------------|-------|
| <operation 1> | Small (N=10) | Xms | Xms | Xms | X MB | X ops/s | |
| <operation 1> | Medium (N=100) | Xms | Xms | Xms | X MB | X ops/s | |
| <operation 1> | Large (N=1000) | Xms | Xms | Xms | X MB | X ops/s | |
| <operation 1> | Stress (N=10000) | Xms | Xms | Xms | X MB | X ops/s | [ASSUMPTION] |
| <operation 2> | Small (N=10) | ... | ... | ... | ... | ... | |
| ... | ... | ... | ... | ... | ... | ... | |

### Key Metrics
- **Critical Path Operations**: <list operations on the user's critical path>
- **Bottleneck Risk**: <identify which operation is most likely to bottleneck>
- **Memory Sensitivity**: <how does memory usage scale with input size?>
```

---

## Section 2: Benchmark Test Scenarios

### Rules

1. ALL 5 scenario types MUST be defined. No scenario type may be skipped.
2. Each scenario must include: duration, load pattern, success criteria, and failure criteria.
3. Scenarios must reference specific modules and operations from Section 1.

### Template

```markdown
---

## Benchmark Scenarios

### Scenario 1: Normal Load (Baseline)

| Attribute | Value |
|-----------|-------|
| **Duration** | 5 minutes |
| **Load Pattern** | Steady state: <N> concurrent operations per second |
| **Modules Under Test** | All |
| **Input Profile** | Medium (N=100) |

**Success Criteria**:
- All p95 latencies below thresholds defined in Section 1
- Memory usage stable (no growth > 5% over duration)
- Zero error responses

**Failure Criteria**:
- Any p95 latency exceeds threshold by > 20%
- Memory grows by > 20% over duration
- Error rate > 0.1%

---

### Scenario 2: Peak Load

| Attribute | Value |
|-----------|-------|
| **Duration** | 2 minutes |
| **Load Pattern** | 3x normal load: <3N> concurrent operations per second |
| **Modules Under Test** | <list critical path modules> |
| **Input Profile** | Large (N=1000) |

**Success Criteria**:
- No crashes or unhandled exceptions
- Performance degradation < 50% compared to normal load
- All operations complete (no timeouts)

**Failure Criteria**:
- Any crash or unhandled exception
- Degradation > 50%
- Operation timeout rate > 5%

---

### Scenario 3: Sustained Load (Endurance)

| Attribute | Value |
|-----------|-------|
| **Duration** | 30 minutes |
| **Load Pattern** | Steady state: <N> concurrent operations per second |
| **Modules Under Test** | All |
| **Input Profile** | Medium (N=100) |

**Success Criteria**:
- Memory usage stable over 30 minutes (no leaks)
- Latency variance < 10% between first and last 5 minutes
- No resource exhaustion (file handles, connections, etc.)

**Failure Criteria**:
- Memory growth > 50MB over 30 minutes
- Latency increases by > 20% over duration
- Any resource exhaustion event

---

### Scenario 4: Spike Test

| Attribute | Value |
|-----------|-------|
| **Duration** | 1 minute |
| **Load Pattern** | 0 → max load → 0 (ramp up in 10s, sustain 40s, ramp down in 10s) |
| **Modules Under Test** | <list modules most sensitive to load spikes> |
| **Input Profile** | Stress (N=10000) |

**Success Criteria**:
- Recovery to baseline metrics within 5 seconds after ramp-down
- No data corruption during spike
- No user-visible errors during spike

**Failure Criteria**:
- Recovery time > 10 seconds
- Any data corruption
- Error rate > 1% during spike

---

### Scenario 5: Failure Recovery

| Attribute | Value |
|-----------|-------|
| **Duration** | 5 minutes |
| **Load Pattern** | Normal load with injected failures every 30 seconds |
| **Failure Types** | <list: network timeout, storage failure, state corruption, etc.> |
| **Modules Under Test** | All |

**Success Criteria**:
- Graceful degradation (no crashes)
- User receives clear error messages
- System recovers automatically within 5 seconds
- No data loss from transient failures

**Failure Criteria**:
- Any crash during failure injection
- Silent data corruption
- Recovery time > 15 seconds
- User receives no feedback about failure
```

---

## Section 3: Benchmark Harness Setup

### Rules

1. Recommend tools based on the ACTUAL tech stack of the project (not generic suggestions).
2. All commands MUST be PowerShell (pwsh) syntax — this is Windows.
3. Include data seeding scripts that create realistic test data.
4. Environment isolation must prevent test pollution of development/production data.

### Template

```markdown
---

## Harness Setup

### Recommended Tools

| Tool | Purpose | Install Command (pwsh) |
|------|---------|----------------------|
| <tool 1> | <purpose> | `npm install -D <package>` |
| <tool 2> | <purpose> | `npm install -D <package>` |

### Data Seeding

```powershell
# Create realistic test data
# <script content or reference to seeding script>
```

**Seed Data Requirements**:
- <data type 1>: <quantity> records with <characteristics>
- <data type 2>: <quantity> records with <characteristics>

### Environment Isolation

```powershell
# Isolate test environment
$env:NODE_ENV = "test"
$env:TEST_STORAGE = "memory"  # Or isolated directory
# <additional isolation steps>
```

**Isolation Checklist**:
- [ ] Test uses separate storage from development
- [ ] Test data is cleaned up after each scenario
- [ ] No network calls to production services during tests
- [ ] Browser state (localStorage, sessionStorage) is isolated

### How to Run

```powershell
# Step 1: Install dependencies
npm install

# Step 2: Seed test data
<seeding command>

# Step 3: Run benchmark suite
<benchmark command>

# Step 4: Generate report
<report command>
```

### How to Interpret Results

| Metric | Pass | Warn | Fail |
|--------|------|------|------|
| p95 Latency | < threshold | < threshold * 1.2 | ≥ threshold * 1.2 |
| Memory Growth | < 5% | < 20% | ≥ 20% |
| Error Rate | 0% | < 0.1% | ≥ 0.1% |
| Recovery Time | < 5s | < 10s | ≥ 10s |
```

---

## Section 4: Regression Gate

### Rules

1. Every module MUST have a regression threshold.
2. Thresholds should be based on the criticality of the module.
3. Include rationale for each threshold choice.

### Template

```markdown
---

## Regression Gate — Release Criteria

### Policy
Any benchmark regression exceeding the threshold for a module BLOCKS the release.
Regressions must be investigated and either:
1. Fixed before release, OR
2. Explicitly approved with documented justification

### Thresholds by Module

| Module | Metric | Baseline | Regression Threshold | Rationale |
|--------|--------|----------|---------------------|-----------|
| <module 1> | p95 Latency | <X ms> | +10% blocks release | Critical user-facing path |
| <module 1> | Memory | <X MB> | +20% blocks release | Memory-sensitive mobile users |
| <module 2> | p95 Latency | <X ms> | +15% blocks release | Background operation, less sensitive |
| ... | ... | ... | ... | ... |

### Threshold Guidelines

| Module Criticality | Latency Threshold | Memory Threshold | Throughput Threshold |
|-------------------|-------------------|------------------|---------------------|
| Critical Path (user-facing) | +10% blocks | +15% blocks | -10% blocks |
| Important (background) | +15% blocks | +20% blocks | -15% blocks |
| Supporting (utilities) | +25% blocks | +30% blocks | -20% blocks |

### CI Integration (Recommended)

```powershell
# Add to CI pipeline
# Step 1: Run benchmarks
<benchmark command>

# Step 2: Compare with baseline
<comparison command>

# Step 3: Gate check
# if any regression > threshold → exit 1 (fail pipeline)
```
```

---

## File Footer

```markdown
---

## Coverage Summary

| Metric | Count |
|--------|-------|
| Modules Benchmarked | X / X |
| Operations Measured | X |
| Scenarios Defined | 5 / 5 |
| Regression Gates Set | X / X |
| Assumptions Flagged | X |

## Assumptions Log

| # | Assumption | Where Used | Risk If Wrong |
|---|------------|-----------|---------------|
| 1 | <assumption> | Module X, Operation Y | <impact> |
```
