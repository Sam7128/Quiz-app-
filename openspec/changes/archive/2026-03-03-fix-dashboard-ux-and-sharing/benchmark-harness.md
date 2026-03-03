# Benchmark Harness Specification

## Section 1: Performance Baselines

### Module: Social Sharing (RLS 403 Fix)
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| UUID Mapping | Small (N=10) | <2ms | <5ms | <10ms | <1 MB | >1,000 ops/sec |
| UUID Mapping | Medium (N=100) | <10ms | <20ms | <30ms | <2 MB | >500 ops/sec |
| UUID Mapping | Large (N=1000) | <50ms | <80ms | <100ms | <5 MB | >100 ops/sec |
| UUID Mapping | Stress (N=10000) | [ASSUMPTION] <250ms | [ASSUMPTION] <400ms | [ASSUMPTION] <600ms| <20 MB | >10 ops/sec |

### Module: Dark Mode QuizCard
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Hover Render | Standard UI Event | <16ms (1 frame) | <16ms | <32ms (2 frames)| negligible | 60 FPS repaints |
| Theme Toggle | Context Update | <50ms | <80ms | <120ms | negligible | N/A |

### Module: Mobile Settings Nav
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Modal Open | Click Event | <40ms | <80ms | <120ms | <2 MB | instantaneous display |
| Layout Calc | 5-item Flex | <5ms | <10ms | <20ms | negligible | 60 FPS |

### Module: Tablet Action Buttons
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Resize Event | Breakpoint Crossing | <30ms | <60ms | <100ms | negligible | 60 FPS (resize debounce) |
| List Render | 50 Bank Cards | <80ms | <150ms | <250ms | <10 MB | Initial load |

### Module: AbortError Silence
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Exception Catch | Single Throw | <1ms | <2ms | <5ms | negligible | >10,000 ops/sec |
| Rapid Mount | Switch Views 10x/sec | [ASSUMPTION] <100ms/mount | [ASSUMPTION] <200ms | <300ms | Stable Heap (Garbage Collects aborted requests) | N/A |

---

## Section 2: Benchmark Test Scenarios

| Scenario | Duration | Load Pattern | Success Criteria |
|----------|----------|-------------|-----------------|
| Normal Load | 5 min | Steady state (1 bank accept/sec) | All p95 < thresholds; clean console |
| Peak Load | 2 min | 3x normal (3 bank accepts/sec) | No crashes, UI unblocked, degradation < 50% |
| Sustained Load | 30 min | Steady state (Theme toggle loops) | No memory leaks, CSS parse time stable |
| Spike Test | 1 min | 0 → Max DOM Mounts → 0 | Fast GC recovery, memory returns to baseline < 5s |
| Failure Recovery | 5 min | Disconnect internet during accepts | Toast errors show; no corrupted broken state |

---

## Section 3: Benchmark Harness Setup

**Tooling Requirements**:
- `Lighthouse` / `Chrome DevTools Profiler` for rendering pipeline benchmarks.
- `Vitest` with native performance hooks (`performance.now()`) for synchronous UUID generation loops.

**Data Seeding**:
- Generate `mock_shared_bank.json` containing exactly 10,000 synthetic questions to stress test the UUID generation loops.

**Execution Commands (PowerShell)**:
```powershell
# 1. Test UUID mapping raw throughput
npx vitest run test/performance/uuid_mapping.bench.ts

# 2. Test rendering pipeline (simulating device widths via Playwright)
npx playwright test test/e2e/responsive_visibility.spec.ts --project=mobile
npx playwright test test/e2e/responsive_visibility.spec.ts --project=tablet
```

**Interpretation Rules**:
- **Pass**: All median (`p50`) metrics fall below target latency; RAM ceiling is unbroken.
- **Fail**: A metric exceeds the `p99` threshold on >1% of runs, indicating jitter or blocking thread operations.

---

## Section 4: Regression Gate

| Module | Regression Threshold | Rationale |
|--------|---------------------|-----------|
| Social Sharing (RLS Fix) | `>50ms` per 100 questions | Map parsing and UUID generation is purely CPU bound; high bounds indicate memory thrashing or massive GC pauses. |
| Dark Mode QuizCard | Framerate drops `< 55fps` | Hover interactions must be buttery smooth; Layout recalculations from missing CSS bounds block the main thread. |
| Mobile Settings Nav | TTI (Time to Interactive) `>300ms` | Tapping settings should feel native and instantaneous. |
| Tablet Action Buttons | LCP shift `>0.1` CLS | Changing opacity visibility rules must not induce Cumulative Layout Shifts pushing content down. |
| AbortError Silence | Memory baseline `+10MB` drift | Retained promises or unbound AbortControllers manifest as slow memory leaks over repeated navigations. |
