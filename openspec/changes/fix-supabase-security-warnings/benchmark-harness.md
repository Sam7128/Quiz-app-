# Performance Benchmark Harness Specification

**Change**: `fix-supabase-security-warnings`
**Generated**: 2026-03-01 21:21 (UTC+8)
**Tech Stack**: React 19 (TypeScript), Vite 6, Tailwind CSS, LocalStorage API, Supabase PostgreSQL
**Stress Test Reference**: `stress-test-report.md` (generated in Phase 3)

---

## Section 1: Performance Baselines

---

## Module: Verification Infrastructure
**Source**: Task Group 1 from tasks.md
**Category**: Business Logic

### Operations

| Operation | Input Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|--------------|-----|-----|-----|--------|------------|-------|
| `verify_rls_enabled` | Small (N=10) | 10ms | 20ms | 30ms | 5 MB | 500 ops/s | [ASSUMPTION] System checks |
| `verify_rls_enabled` | Medium (N=100) | 15ms | 30ms | 50ms | 5 MB | 300 ops/s | [ASSUMPTION] |
| `verify_rls_enabled` | Large (N=1000) | 30ms | 60ms | 80ms | 10 MB | 100 ops/s | [ASSUMPTION] |
| `verify_rls_enabled` | Stress (N=10000) | 80ms | 150ms | 250ms | 20 MB | 20 ops/s | [ASSUMPTION] |
| `verify_search_path` | Small (N=10) | 8ms | 15ms | 25ms | 5 MB | 600 ops/s | [ASSUMPTION] |

### Key Metrics
- **Critical Path Operations**: Checking schema configurations in CI/DB pipeline.
- **Bottleneck Risk**: Inefficient queries to `pg_class` or `pg_policies` without indexing.
- **Memory Sensitivity**: Low memory sensitivity for metadata queries.

---

## Module: RLS Implementation
**Source**: Task Group 2 from tasks.md
**Category**: Data/Storage

### Operations

| Operation | Input Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|--------------|-----|-----|-----|--------|------------|-------|
| `SELECT study_sessions` | Small (N=10) | 15ms | 30ms | 50ms | 5 MB | 200 ops/s | [ASSUMPTION] |
| `SELECT study_sessions` | Medium (N=100) | 25ms | 50ms | 80ms | 10 MB | 150 ops/s | [ASSUMPTION] |
| `SELECT study_sessions` | Large (N=1000) | 50ms | 100ms | 150ms | 20 MB | 100 ops/s | [ASSUMPTION] |
| `SELECT study_sessions` | Stress (N=10000) | 120ms | 250ms | 400ms | 50 MB | 50 ops/s | [ASSUMPTION] |

### Key Metrics
- **Critical Path Operations**: Fetching `study_sessions` and `user_study_stats_30day` on Dashboard load.
- **Bottleneck Risk**: RLS policy evaluation (`auth.uid() = user_id`) on large tables without `user_id` index.
- **Memory Sensitivity**: High memory usage on Supabase Postgres if Seq Scans are triggered.

---

## Module: Function Defenses
**Source**: Task Group 3 from tasks.md
**Category**: Data/Storage

### Operations

| Operation | Input Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|--------------|-----|-----|-----|--------|------------|-------|
| `handle_new_user` Trigger | Small (N=10) | 20ms | 40ms | 60ms | 5 MB | 100 ops/s | [ASSUMPTION] |
| `handle_new_user` Trigger | Medium (N=100) | 25ms | 50ms | 80ms | 10 MB | 80 ops/s | [ASSUMPTION] |
| `handle_new_user` Trigger | Large (N=1000) | 35ms | 70ms | 100ms | 15 MB | 50 ops/s | [ASSUMPTION] |
| `handle_new_user` Trigger | Stress (N=10000) | 80ms | 150ms | 200ms | 20 MB | 20 ops/s | [ASSUMPTION] |

### Key Metrics
- **Critical Path Operations**: Execution of `handle_new_user` triggered during `auth.users` insert.
- **Bottleneck Risk**: Concurrent user signups stalling due to trigger execution delay.
- **Memory Sensitivity**: Medium DB memory footprint per trigger execution.

---

## Module: Auth Configuration
**Source**: Task Group 4 from tasks.md
**Category**: Network/API

### Operations

| Operation | Input Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|--------------|-----|-----|-----|--------|------------|-------|
| `Leaked Pwd Check` | Small (N=10) | 200ms| 400ms| 600ms| N/A | 50 ops/s | [ASSUMPTION] External Check |
| `Leaked Pwd Check` | Medium (N=100) | 300ms| 500ms| 800ms| N/A | 30 ops/s | [ASSUMPTION] |
| `Leaked Pwd Check` | Large (N=1000) | 400ms| 800ms| 1200ms|N/A | 15 ops/s | [ASSUMPTION] Check limits |
| `Leaked Pwd Check` | Stress (N=10000) | 800ms| 1500ms| 3000ms|N/A | 5 ops/s | [ASSUMPTION] Check limits |

### Key Metrics
- **Critical Path Operations**: User Registration flow.
- **Bottleneck Risk**: External call to HaveIBeenPwned API during leaked password check.
- **Memory Sensitivity**: Negligible on client side, dependent on Supabase.

---

## Module: Integration & Regression
**Source**: Task Group 5 from tasks.md
**Category**: Frontend UI

### Operations

| Operation | Input Profile | p50 | p95 | p99 | Memory | Throughput | Notes |
|-----------|--------------|-----|-----|-----|--------|------------|-------|
| `Dashboard Render` | Small (N=10) | 30ms | 50ms | 80ms | 30 MB | N/A | [ASSUMPTION] Stats items |
| `Dashboard Render` | Medium (N=100) | 45ms | 80ms | 120ms | 40 MB | N/A | [ASSUMPTION] |
| `Dashboard Render` | Large (N=1000) | 100ms | 200ms | 300ms | 60 MB | N/A | [ASSUMPTION] |
| `Dashboard Render` | Stress (N=10000) | 300ms | 500ms | 800ms | 100 MB| N/A | [ASSUMPTION] |

### Key Metrics
- **Critical Path Operations**: Dashboard rendering post-login.
- **Bottleneck Risk**: React virtual DOM rendering overhead if state is large.
- **Memory Sensitivity**: Heap size increases linearly with the number of fetched rows if pagination isn't used.

---

## Section 2: Benchmark Test Scenarios

---

## Benchmark Scenarios

### Scenario 1: Normal Load (Baseline)

| Attribute | Value |
|-----------|-------|
| **Duration** | 5 minutes |
| **Load Pattern** | Steady state: 10 concurrent operations per second |
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
| **Load Pattern** | 3x normal load: 30 concurrent operations per second |
| **Modules Under Test** | RLS Implementation, Auth Configuration |
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
| **Load Pattern** | Steady state: 10 concurrent operations per second |
| **Modules Under Test** | RLS Implementation, Function Defenses |
| **Input Profile** | Medium (N=100) |

**Success Criteria**:
- Memory usage stable over 30 minutes (no leaks in Postgres connection pool)
- Latency variance < 10% between first and last 5 minutes
- No resource exhaustion (file handles, connections, etc.)

**Failure Criteria**:
- Postgres memory growth > 50MB over 30 minutes
- Latency increases by > 20% over duration
- Any connection starvation event

---

### Scenario 4: Spike Test

| Attribute | Value |
|-----------|-------|
| **Duration** | 1 minute |
| **Load Pattern** | 0 → max load → 0 (ramp up in 10s, sustain 40s, ramp down in 10s) |
| **Modules Under Test** | Auth Configuration |
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
| **Failure Types** | HIBP API timeout, DB connection drop |
| **Modules Under Test** | Auth Configuration |

**Success Criteria**:
- Graceful degradation (no crashes)
- User receives clear error messages (e.g. "Registration currently unavailable")
- System recovers automatically within 5 seconds
- No data loss from transient failures

**Failure Criteria**:
- Any crash during failure injection
- Silent data corruption
- Recovery time > 15 seconds
- User receives no feedback about failure

---

## Section 3: Benchmark Harness Setup

---

## Harness Setup

### Recommended Tools

| Tool | Purpose | Install Command (pwsh) |
|------|---------|----------------------|
| k6 | API Load Testing | `winget install k6` or `choco install k6` |
| pgbench | Database Benchmarking | N/A (Included with Postgres tools ecosystem) |
| React Profiler | Frontend benchmarking | N/A (Built-in via Chrome extensions / React tools) |

### Data Seeding

```powershell
# Create realistic test data using a secure test token
# Generate 1000 fake study sessions
Get-Random -Minimum 1 -Maximum 10000 | ForEach-Object {
    $body = @{ session_id = [guid]::NewGuid().ToString(); user_id = "test-uuid" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:54321/rest/v1/study_sessions" -Method Post -Body $body -Headers @{ "Authorization" = "Bearer TEST_TOKEN"; "apikey" = "TEST_PUBLIC_KEY"; "Content-Type" = "application/json" }
}
```

**Seed Data Requirements**:
- `study_sessions`: 1000 records
- `test_users`: 5 unique authenticated identities for cross-user RLS testing.

### Environment Isolation

```powershell
# Isolate test environment
$env:NODE_ENV = "test"
$env:SUPABASE_URL = "http://localhost:54321" # Local Supabase Instance
# Reset DB before tests
supabase db reset
```

**Isolation Checklist**:
- [x] Test uses separate storage from development
- [x] Test data is cleaned up after each scenario
- [x] No network calls to production services during tests
- [x] Browser state (localStorage, sessionStorage) is isolated

### How to Run

```powershell
# Step 1: Install dependencies
# Assume k6 is installed on Windows

# Step 2: Seed test data
supabase db reset

# Step 3: Run benchmark suite
k6 run .\scripts\benchmark.js

# Step 4: Generate report
# k6 outputs to console by default, or HTML if configured
```

### How to Interpret Results

| Metric | Pass | Warn | Fail |
|--------|------|------|------|
| p95 Latency | < threshold | < threshold * 1.2 | ≥ threshold * 1.2 |
| DB Memory Growth | < 5% | < 20% | ≥ 20% |
| Error Rate | 0% | < 0.1% | ≥ 0.1% |
| Recovery Time | < 5s | < 10s | ≥ 10s |

---

## Section 4: Regression Gate

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
| Verification Inst. | p95 Latency | < 30ms | +20% blocks release | Background verification step, less sensitive |
| RLS Implementation | p95 Latency | < 50ms | +10% blocks release | Fast data retrieval is critical for the React frontend UX |
| Function Defenses | p95 Latency | < 50ms | +15% blocks release | Small slowdowns on signup trigger are acceptable |
| Auth Config (Signups) | p95 Latency | < 500ms| +20% blocks release | External network call adds variance; signups are less frequent |
| Integration UI | Memory | < 40 MB | +15% blocks release | Critical for application stability in low-memory browsers |

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
k6 run --out json=result.json bench.js

# Step 2: Gate check
# if latency >= threshold -> exit 1
```

---

## Coverage Summary

| Metric | Count |
|--------|-------|
| Modules Benchmarked | 5 / 5 |
| Operations Measured | 10+ |
| Scenarios Defined | 5 / 5 |
| Regression Gates Set | 5 / 5 |
| Assumptions Flagged | 16 |

## Assumptions Log

| # | Assumption | Where Used | Risk If Wrong |
|---|------------|-----------|---------------|
| 1 | Baseline Query Latency | RLS Implementation | Bad performance leads to poor UX if RLS takes longer |
| 2 | Auth Check Latency | Auth Configuration | High timeout rate during user registration if HIBP is slow |
| 3 | Memory per Trigger | Function Defenses | Triggers consume excessive DB RAM causing OOM |
| 4 | Dashboard Memory Use | Integration UI | Out of Memory exceptions in browser |
