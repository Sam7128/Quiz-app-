## Verification Report: security-and-sync-hardening (Round 2)

### Summary
| Dimension | Status |
|---|---|
| Completeness | 62/62 tasks ✅, 9 requirements checked |
| Correctness | 9/9 scenarios aligned ✅ |
| Coherence | Design fully followed ✅ |

### Round 1 Issues — All Resolved

| # | Round 1 Issue | Status | Resolution |
|---|---|---|---|
| W1 | Cloud-only sessions 被回寫本機（違反 spec L27：不主動拉取雲端-only session） | ✅ FIXED | 移除了 `cloudStorage.ts:676-684` 中將 cloud-only sessions push 到 `updatedLocalSessions` 的邏輯。Cloud-only sessions 現在保留在雲端，不寫入 localStorage |
| S1 | `keepIds` 空集合使用 `console.error`（應為 `console.warn`，因為是預期的防禦性拒絕） | ✅ FIXED | `cloudStorage.ts:264` 已改為 `console.warn` |
| S2 | AI config oversized 使用 `console.error`（應為 `console.warn`） | ✅ FIXED | `ai.ts:79` 已改為 `console.warn` |

### Round 2: Additional Issues Found & Fixed

| # | Issue | Status | Resolution |
|---|---|---|---|
| A1 | `cloudStorage.ts:18` — `(error: any)` 違反 NO_ANY 規則 | ✅ FIXED | 改為 `(error: unknown)` + `Record<string, unknown>` type guard |
| A2 | `cloudStorage.ts:165` — `(q: any)` 違反 NO_ANY 規則 | ✅ FIXED | 改為 `(q: unknown)` |
| A3 | `storage.ts:265` — `(parsed as any).updatedAt` 違反 NO_ANY 規則 | ✅ FIXED | 使用 `Record<string, unknown>` 中間變數 |
| A4 | `storage.ts:314` — `catch (e: any)` 違反 NO_ANY 規則 | ✅ FIXED | 改為 `catch (e: unknown)` + `Record<string, unknown>` type guard |
| A5 | `useChunkedPractice.test.ts:193` — Flaky test 因 shuffle 隨機性 | ✅ FIXED | 改為斷言總題數減少（確定性），而非特定 chunk 題數 |

### CRITICAL
- 無

### WARNING
- 無

### SUGGESTION
- 無

### Evidence
- `saveCloudQuestions` 使用 upsert + cleanup 分批與失敗降級：`services/cloudStorage.ts:222-308`
- Banks/Questions RLS 政策已在 schema 定義：`docs/migrations/supabase_schema.sql:26-85`
- `syncLocalToCloud` 使用 `Promise.allSettled` + 並發上限 + failure summary：`services/cloudStorage.ts:314-363`
- `saveChunkDraft` updatedAt 守衛與 QuotaExceededError 降級：`services/storage.ts:290-342`
- `syncLocalPracticeSessions` 鎖機制 + 時鐘漂移防護 + 雲端較新回寫：`services/cloudStorage.ts:531-702`
- Cloud-only sessions 不再被拉回本機（符合 spec）：`services/cloudStorage.ts:677-686`
- 所有 `any` 已消除，改用 `unknown` + type guards
- 測試覆蓋：`src/__tests__/ai.config.test.ts`, `src/__tests__/syncLocalToCloud.test.ts`, `src/__tests__/saveChunkDraft.test.ts`, `src/__tests__/cloudStorage.test.ts`, `src/__tests__/practiceSessionStorage.test.ts`, `e2e/sync-and-settings-hardening.spec.ts`

### Verification Gates
- ✅ `npx tsc --noEmit` — 零錯誤
- ✅ `npm run build` — production build 成功
- ✅ `npm test -- --run` — 24 files, 146 tests 全部通過
- ✅ 無 `any` 型別違規

### Final Assessment
所有問題已修復。零 CRITICAL、零 WARNING、零 SUGGESTION。Ready for archive.
