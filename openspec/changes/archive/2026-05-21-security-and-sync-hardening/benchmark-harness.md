### Module: AI 設定防護 (M1)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Parse Config | Small (<1KB) | 1ms | 2ms | 5ms | 5MB | 1000 ops/sec |
| Parse Config | Malformed (10KB) | 2ms | 5ms | 10ms | 10MB | 500 ops/sec |
| Parse Config | Stress (1MB) | 10ms | [ASSUMPTION] 50ms | 100ms | 50MB | 50 ops/sec |

### Module: syncLocalToCloud 改用 Promise.allSettled (M2)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Sync All | Small (1 bank) | 500ms | 1000ms | 2000ms | 10MB | N/A (Network Bound) |
| Sync All | Medium (5 banks) | 1000ms | 2000ms | [ASSUMPTION] 4000ms | 30MB | N/A |
| Sync All | Stress (50 banks) | 5000ms | 10000ms | 20000ms | 100MB | N/A |

### Module: 同步並發鎖 (M3)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Acquire Lock | Normal | <1ms | <1ms | <1ms | 1MB | 10000 ops/sec |
| Reject Lock | High Contention | <1ms | <1ms | <1ms | 1MB | 10000 ops/sec |

### Module: 雲端較新 session 回寫本機 (M4)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Session Write | 1 Session | 2ms | 5ms | 10ms | 5MB | 100 ops/sec |
| Session Write | 10 Sessions | 5ms | [ASSUMPTION] 15ms | 30ms | 20MB | 50 ops/sec |

### Module: saveCloudQuestions cleanup 降級 (M5)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Cleanup | 10 Questions | 100ms | 200ms | 500ms | 10MB | N/A |
| Cleanup | 1000 Questions | 500ms | [ASSUMPTION] 1500ms | 3000ms | 50MB | N/A |

### Module: saveChunkDraft 版本守衛 (M6)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Write Draft | Standard | 1ms | 3ms | 5ms | 5MB | 500 ops/sec |
| Reject Draft | High Contention | <1ms | 1ms | 2ms | 5MB | 1000 ops/sec |

### Module: 依賴項安全升級 (M7)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| DOMPurify | Short text | 1ms | 2ms | 5ms | 5MB | 1000 ops/sec |
| DOMPurify | Long HTML | 5ms | [ASSUMPTION] 10ms | 20ms | 20MB | 200 ops/sec |
| Build Time | Full project | 10s | 15s | [ASSUMPTION] 20s | 1GB | N/A |

### Module: 全面驗證 (M8)

| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Unit Tests | All suites | 5s | 8s | 10s | 500MB | N/A |

---

#### Section 2: Benchmark Test Scenarios

| Scenario | Duration | Load Pattern | Success Criteria |
|----------|----------|-------------|-----------------|
| Normal Load | 5 min | Steady state | All p95 < thresholds |
| Peak Load | 2 min | 3x normal | No crashes, degradation < 50% |
| Sustained Load | 30 min | Steady state | No memory leaks, stable latency |
| Spike Test | 1 min | 0 → max → 0 | Recovery < 5 seconds |
| Failure Recovery | 5 min | Normal + injected failures | Graceful degradation |

#### Section 3: Benchmark Harness Setup

- **Tool/Framework**: `k6` (for API/sync mocking) and `Vitest` with performance profiling enabled (for frontend logic bounds).
- **Data Seeding**:
  - Pre-populate `localStorage` with 50 Banks and 1000 ChunkDrafts.
  - Mock Supabase endpoints to return random latencies between 100ms and 3000ms.
- **Environment Isolation**:
  - Run inside a headless Chromium instance via Playwright with CPU throttling (e.g., 4x slowdown) to simulate mid-tier mobile devices.
- **How to run**:
  ```powershell
  # Run memory footprint tests
  npx vitest run --coverage --reporter=html
  
  # Run Playwright stress tests (mocked offline & slow networks)
  npx playwright test --project=chromium --grep "STRESS"
  ```
- **How to interpret results**:
  - Fail if memory usage exceeds 150MB across any frontend trace.
  - Fail if UI blocks (Event Loop lag) for more than 50ms during Draft Saves.

#### Section 4: Regression Gate

| Module | Regression Threshold | Rationale |
|--------|---------------------|-----------|
| AI 設定防護 (M1) | > 5ms processing time | JSON Parsing is synchronous; >5ms causes visible UI stutter. |
| syncLocalToCloud (M2) | CPU Spike > 30% | Massive Promise processing could starve the JS engine. |
| 同步並發鎖 (M3) | Deadlock occurrences > 0 | A single deadlock requires a page refresh. Unacceptable. |
| saveCloudQuestions (M5) | Fail rate > 5% on 3G | Network degradation shouldn't cause permanent data loss. |
| saveChunkDraft (M6) | Write latency > 10ms | Runs frequently (on updates/unloads), must be near-instant. |
| 依賴項安全升級 (M7) | Bundle size +50KB | Updates should not heavily bloat the client application payload. |
