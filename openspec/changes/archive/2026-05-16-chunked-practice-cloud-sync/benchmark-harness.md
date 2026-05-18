# Benchmark Harness Specification
**Change**: `chunked-practice-cloud-sync`

## Section 1: Performance Baselines

### Module: 1. 類型定義與資料模型 (Type First)
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| TS Compile | Source Code | 1s [ASSUMPTION] | 3s [ASSUMPTION] | 5s [ASSUMPTION] | < 500MB | N/A |

### Module: 2. 資料庫 Migration
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Execute Migration | Empty DB | 500ms | 1s | 2s | N/A | N/A |
| JSONB Query | 10k sessions | 50ms [ASSUMPTION] | 100ms [ASSUMPTION] | 200ms [ASSUMPTION] | N/A | 500 queries/sec |

### Module: 3. Storage Layer 擴展
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| LocalStorage Write | 5 Sessions (~10KB) | 2ms | 5ms | 10ms | < 5MB | N/A |
| Cloud Upsert | 1 Session | 100ms | 300ms | 800ms | N/A | 100 ops/sec |
| Cloud Fetch | 10 Sessions | 150ms | 400ms | 1000ms | N/A | 150 queries/sec |

### Module: 4. 核心 Domain Hook: `useChunkedPractice`
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Chunk Generation | 1000 Questions | 5ms | 15ms | 30ms | < 10MB | N/A |
| Restore Validation | 500 IDs vs Bank | 2ms | 8ms | 20ms | < 5MB | N/A |

### Module: 5. QuizEngine 整合
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Subset Initialization | Chunk of 20 Qs | 10ms | 25ms | 50ms | < 20MB | N/A |

### Module: 6. 戰鬥系統適配
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| State Reset | 1 Chunk boundary | 2ms | 5ms | 10ms | < 5MB | N/A |

### Module: 7. UI 元件
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Render Dashboard | 10 Active Sessions | 30ms | 60ms | 100ms | < 30MB | N/A |
| Render Progress Bar | 1 update tick | 16ms | 16ms | 32ms | N/A | 60 FPS |

### Module: 8. App 層整合
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Login Sync | 5 Local Sessions | 200ms | 600ms | 1500ms | N/A | N/A |

### Module: 9. 單元測試
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Run Suite | All tests | 2s | 4s | 6s | < 500MB | N/A |

### Module: 10. E2E 測試
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Run E2E | Chunked flow | 15s | 30s | 45s | < 1GB | N/A |

### Module: 11. 文件與清理
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Build Web | Vite Build | 10s | 15s | 20s | < 1GB | N/A |


## Section 2: Benchmark Test Scenarios

| Scenario | Duration | Load Pattern | Success Criteria |
|----------|----------|-------------|-----------------|
| Normal Load | 5 min | Steady state (10 users/sec creating sessions) | All p95 < 500ms |
| Peak Load | 2 min | 3x normal (30 users/sec) | No crashes, DB CPU < 80%, degradation < 50% |
| Sustained Load | 30 min | Steady state (10 users/sec) | No memory leaks in Supabase, stable query latency |
| Spike Test | 1 min | 0 → 100 users/sec → 0 | Recovery < 5 seconds |
| Failure Recovery | 5 min | Normal + injected Supabase timeouts | Graceful degradation (fallback to localStorage), no data loss |

## Section 3: Benchmark Harness Setup

**Tooling Requirements**:
- **Backend/API Testing**: k6 (open-source load testing tool)
- **Frontend Profiling**: Lighthouse CI & React Profiler
- **Database Profiling**: Supabase Studio pg_stat_statements

**Data Seeding**:
- Generate 10 mock user accounts.
- Seed each account with 5 active `practice_sessions` via SQL script to bypass auth overhead during data setup.
- Insert 5 massive question banks (1000+ questions each) into `mindspark_banks` to test JSONB parsing limits.

**Environment Isolation**:
- Run benchmarks against a dedicated Supabase staging project, NOT production.
- Use a headless browser setup for frontend rendering benchmarks.

**Runnable Commands**:
```powershell
# 1. Start local k6 load test for API endpoints
k6 run .\tests\benchmarks\api-load.js

# 2. Run React component render profiling
npm run test:perf

# 3. Check Vite build size regression
npx size-limit
```

**Interpretation of Results**:
- If API p95 > 500ms -> FAIL (Database indexing issue or RLS inefficiency).
- If LocalStorage size > 4MB after 5 sessions -> FAIL (JSON payload is too bloated).
- If React frame drops > 10% during Chunk transition -> FAIL (Render blocking).

## Section 4: Regression Gate

| Module | Regression Threshold | Rationale |
|--------|---------------------|-----------|
| 1-3. Data & Storage | Cloud Save > 800ms (p95) | Delays chunk transition UX |
| 4. useChunkedPractice | Hook mount > 50ms | Blocks initial render on Dashboard |
| 5-6. Engine & Battle | Transition gap > 100ms | Breaks the flow of consecutive questions |
| 7. UI Components | Re-renders > 2 per question | Unnecessary virtual DOM diffing causes lag |
| 8. App Integration | Login Sync > 2s | Delays the user from seeing their dashboard upon login |
| 11. Build Size | JS Bundle increase > 50KB | Mobile loading time constraint |
