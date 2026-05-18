# Plan Stress Test Report & Test Matrix
**Change**: `chunked-practice-cloud-sync`

## Section A: Stress Test Report

### [ISSUE-001] Category: Edge Case
- **Affected Step**: 1.1 在 types/battleTypes.ts 新增 PracticeChunk 介面
- **Problem**: `completedAt` is optional, but there's no tracking for `startedAt` to measure how long a chunk took (which affects spaced repetition/analytics).
- **Risk Level**: LOW
- **Suggested Addition**: Add `startedAt?: number` to `PracticeChunk`.

### [ISSUE-002] Category: Logic Gap
- **Affected Step**: 1.2 在 types/battleTypes.ts 新增 ChunkedPracticeSession 介面
- **Problem**: The `questionIds` array stores ALL IDs, but doesn't map to which questions were originally from which `bankIds` if multiple banks are merged. Identifying which IDs to remove upon bank deletion requires parsing all remaining banks.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Assume all questions are validated globally during restore, or add a bank-to-question mapping.

### [ISSUE-003] Category: Missing Detail
- **Affected Step**: 1.2 在 types/battleTypes.ts 新增 ChunkedPracticeSession 介面
- **Problem**: Does not track the current active chunk index directly in the session state. We have to compute it by iterating over `chunks` to find the first non-completed chunk.
- **Risk Level**: LOW
- **Suggested Addition**: Explicitly document that active chunk index is derived dynamically.

### [ISSUE-004] Category: Edge Case
- **Affected Step**: 2.1 建立 practice_sessions 表
- **Problem**: JSONB `chunks` could exceed Postgres row size limits if a user creates a massive session (e.g., merging 20 banks with 10,000 questions).
- **Risk Level**: LOW
- **Suggested Addition**: Add an application-level limit on total questions per session (e.g., max 1000).

### [ISSUE-005] Category: Missing Detail
- **Affected Step**: 2.2 新增 idx_practice_sessions_user_status 索引
- **Problem**: No index on `updated_at`. Fetching active sessions sorted by `updated_at` (required by spec) might trigger a file sort for users with many active sessions.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Add `updated_at` to the index: `idx_practice_sessions_user_status_updated_at (user_id, status, updated_at DESC)`.

### [ISSUE-006] Category: Architecture
- **Affected Step**: 2.3 新增 RLS 政策
- **Problem**: RLS policies do not explicitly handle the `delete` operation for CASCADE scenarios if an `auth.users` row is deleted.
- **Risk Level**: LOW
- **Suggested Addition**: Ensure `user_id` foreign key has `ON DELETE CASCADE`.

### [ISSUE-007] Category: Logic Gap
- **Affected Step**: 3.3 實作 LocalStorageRepository 的 FIFO 5 限制邏輯
- **Problem**: When the 6th session is created, the oldest is marked `abandoned`. But if the user never logs in, the `abandoned` sessions pile up forever in `localStorage`, eventually causing quota exceeded errors.
- **Risk Level**: HIGH
- **Suggested Addition**: Physically delete `abandoned` sessions in Guest mode, or limit the total stored array length to 10.

### [ISSUE-008] Category: Logic Gap
- **Affected Step**: 3.6 新增 syncLocalPracticeSessions()
- **Problem**: Syncing local sessions to cloud on login does not merge progress if the same session UUID somehow exists on both. It might overwrite newer cloud progress if the local fallback had a stale `updated_at`.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Compare `updated_at` before overwriting cloud sessions during login sync.

### [ISSUE-009] Category: Edge Case
- **Affected Step**: 3.4 新增雲端 API 函式
- **Problem**: `saveCloudPracticeSession` could fail due to network, but if it fails repeatedly, the local fallback `updated_at` drifts from the cloud.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Add retry mechanism or dirty flag for syncing.

### [ISSUE-010] Category: Logic Gap
- **Affected Step**: 4.8 實作 question ID 驗證邏輯
- **Problem**: If a question is deleted from the bank, removing it from the chunk reduces `totalQuestions`. This breaks the chunk size expectation (e.g., chunk size 20 becomes 19), and UI progress math (score / total) might break.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Recalculate chunk `totalQuestions` dynamically upon restore.

### [ISSUE-011] Category: Edge Case
- **Affected Step**: 4.5 實作 completeChunk
- **Problem**: If user rapidly clicks "next" on the last question, `completeChunk` might be called twice due to React state lag, resulting in duplicate API calls or score anomalies.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Add a lock/ref or check `chunk.status === 'completed'` before processing completion.

### [ISSUE-012] Category: Assumption Risk
- **Affected Step**: 4.2 實作 createSession
- **Problem**: Assumes `bankIds` and their metadata are synchronously available. If the bank data is still loading, shuffling will fail.
- **Risk Level**: LOW
- **Suggested Addition**: Ensure loading state is handled during creation.

### [ISSUE-013] Category: Logic Gap
- **Affected Step**: 5.3 新增 onChunkComplete callback
- **Problem**: If the quiz is aborted mid-chunk (user clicks "Back"), `useQuizEngine` doesn't notify `useChunkedPractice` to save partial mistake logs or analytics.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Trigger partial analytic saves even if chunk is not complete.

### [ISSUE-014] Category: Architecture
- **Affected Step**: 5.1 修改 startQuiz 參數
- **Problem**: Passing `chunkMeta` works, but it tightly couples the generic QuizEngine to chunked logic.
- **Risk Level**: LOW
- **Suggested Addition**: Treat `chunkMeta` as a generic `modeContext` to keep QuizEngine agnostic.

### [ISSUE-015] Category: Missing Detail
- **Affected Step**: 5.2 不寫入 mindspark_quiz_session
- **Problem**: If user refreshes the page mid-chunk, `useQuizEngine` usually restores from `mindspark_quiz_session`. If we skip writing to it, a refresh means starting the chunk from Q1 again. This contradicts standard quiz behavior.
- **Risk Level**: HIGH
- **Suggested Addition**: Allow writing to `mindspark_quiz_session` but namespace it or clear it on chunk complete, so mid-chunk refreshes are supported.

### [ISSUE-016] Category: Logic Gap
- **Affected Step**: 6.1 新增 resetForNewChunk()
- **Problem**: Resetting monster pool means the user might face the exact same sequence of monsters in Chunk 2 as Chunk 1, causing repetition.
- **Risk Level**: LOW
- **Suggested Addition**: Shuffle the monster pool differently per chunk.

### [ISSUE-017] Category: Edge Case
- **Affected Step**: 6.2 呼叫 resetForNewChunk()
- **Problem**: If GameMode is toggled ON mid-chunk, the streak and monster pool might initialize inconsistently with `questionsAnswered` inside the chunk.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Initialize battle state based on current chunk progress index.

### [ISSUE-018] Category: Missing Detail
- **Affected Step**: 6.3 確認 BattleState 不被包含在持久化資料中
- **Problem**: Since BattleState isn't saved, resuming a partially done chunk means battle state restarts at streak 0, mismatching chunk score.
- **Risk Level**: LOW
- **Suggested Addition**: Accept this tradeoff but document it clearly in user guides.

### [ISSUE-019] Category: Edge Case
- **Affected Step**: 7.1 ChunkedPracticePanel
- **Problem**: If user selects multiple massive banks, generating chunks might block the main thread.
- **Risk Level**: LOW
- **Suggested Addition**: Add a loading spinner during session creation.

### [ISSUE-020] Category: Logic Gap
- **Affected Step**: 7.3 ChunkCompleteSummary
- **Problem**: The "Rest" button goes to Dashboard, but doesn't explicitly tell the user their progress is saved, potentially causing anxiety.
- **Risk Level**: LOW
- **Suggested Addition**: Add "Progress Saved" indicator on the summary modal.

### [ISSUE-021] Category: Edge Case
- **Affected Step**: 7.2 ActiveSessionCard
- **Problem**: If a session's `bankNames` array has 10 banks, the UI card will overflow.
- **Risk Level**: LOW
- **Suggested Addition**: Truncate bank names with "+X more" in the UI.

### [ISSUE-022] Category: Assumption Risk
- **Affected Step**: 8.3 呼叫 syncLocalPracticeSessions
- **Problem**: If the user logs in but goes offline immediately, the sync might fail silently and the app won't retry until next full login.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Trigger sync on app load if auth token exists and there are pending local sessions.

### [ISSUE-023] Category: Logic Gap
- **Affected Step**: 8.1 初始化 useChunkedPractice
- **Problem**: Initializing at `App.tsx` level means the hook runs on every route change, potentially re-fetching cloud sessions unnecessarily.
- **Risk Level**: LOW
- **Suggested Addition**: Use SWR or React Query, or ensure `loadActiveSessions` is cached.

### [ISSUE-024] Category: Missing Detail
- **Affected Step**: 8.2 AppContent props
- **Problem**: Passing down chunked practice state via props to many nested components causes prop drilling.
- **Risk Level**: LOW
- **Suggested Addition**: Consider moving chunked state to a Context if it gets too deep.

### [ISSUE-025] Category: Missing Detail
- **Affected Step**: 9.3 測試 question ID 驗證邏輯
- **Problem**: Needs a test case for when ALL questions in the ENTIRE session are deleted (edge case).
- **Risk Level**: LOW
- **Suggested Addition**: Add a test asserting the session is marked completed/abandoned with score 0.

### [ISSUE-026] Category: Edge Case
- **Affected Step**: 9.4 測試 Guest 模式 FIFO 限制
- **Problem**: The test doesn't verify if `abandoned` sessions are actually cleaned up physically over time.
- **Risk Level**: LOW
- **Suggested Addition**: Add a garbage collection test if physical deletion is added.

### [ISSUE-027] Category: Logic Gap
- **Affected Step**: 9.5 測試 CloudRepo CRUD
- **Problem**: Missing tests for network failure (mocking fetch/Supabase error) and fallback behavior.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Add error boundary mocking tests for CloudRepo.

### [ISSUE-028] Category: Missing Detail
- **Affected Step**: 10.1 建立 chunked-practice.spec.ts
- **Problem**: Doesn't test the cross-device scenario (login -> do chunk 1 -> open incognito -> login -> see chunk 2 ready).
- **Risk Level**: HIGH
- **Suggested Addition**: Add a multi-browser context test in Playwright to verify cloud sync.

### [ISSUE-029] Category: Edge Case
- **Affected Step**: 10.2 測試 session 放棄流程
- **Problem**: Needs to test what happens if you click abandon, but the network fails.
- **Risk Level**: LOW
- **Suggested Addition**: Mock network failure during abandon and verify UI feedback.

### [ISSUE-030] Category: Edge Case
- **Affected Step**: 10.3 測試小題庫場景
- **Problem**: What if chunk size is 20, but the bank has exactly 20 questions? Does it show the chunked UI or normal UI?
- **Risk Level**: LOW
- **Suggested Addition**: Clarify and test the boundary exactly at chunk size.

### [ISSUE-031] Category: Missing Detail
- **Affected Step**: 11.2 更新 docs/DEVELOPMENT_LOG.md
- **Problem**: Log doesn't capture the Supabase DB schema change for future reference.
- **Risk Level**: LOW
- **Suggested Addition**: Paste the final schema in the log.

### [ISSUE-032] Category: Assumption Risk
- **Affected Step**: 11.3 更新 MEMORY.md
- **Problem**: Forgets to update aliases for the new DB table.
- **Risk Level**: LOW
- **Suggested Addition**: Add `practice_sessions` to aliases.

### [ISSUE-033] Category: Edge Case
- **Affected Step**: 11.4 執行 npm run build
- **Problem**: Build succeeds, but doesn't guarantee bundle size hasn't ballooned due to new states.
- **Risk Level**: LOW
- **Suggested Addition**: Check bundle size output in the build script.


---

## Section B: Test Matrix

### Module: 1. 類型定義與資料模型 (Type First)
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Chunk creation typing | Valid practice chunk object | TypeScript compiles | P0 |
| 2 | Session status union | Session with invalid status | TypeScript error | P0 |
| 3 | ChunkMeta struct | Valid chunk meta | TypeScript compiles | P1 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Global mode usage | App, QuizEngine | `chunked` mode is accepted without errors |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Empty wrongIds | Tracks perfect scores | Type accepts empty array |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Missing required fields | Instantiating without bankIds | Compile error blocks build |
#### Expected Outcomes
- TypeScript builds pass with `npx tsc --noEmit` and zero `any` types.

### Module: 2. 資料庫 Migration
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Table creation | Run SQL | Table exists with correct columns | P0 |
| 2 | Index creation | Run SQL | `idx_practice_sessions_user_status` exists | P1 |
| 3 | RLS enable | Run SQL | RLS is active on table | P0 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | RLS filtering | Supabase Client, Auth | Query only returns own records |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Repeated migration | Multiple deploys | `IF NOT EXISTS` prevents crash |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Insert w/o user_id | Unauthenticated user | Postgres throws RLS violation |
#### Expected Outcomes
- Supabase schema is ready to accept JSONB chunks safely.

### Module: 3. Storage Layer 擴展
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Local save session | Valid session | Saved in localStorage | P0 |
| 2 | Local FIFO limit | Add 6th session | Oldest abandoned, new saved | P0 |
| 3 | Cloud abandon | session ID | Status updated to abandoned | P1 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Cloud fallback | CloudRepo, LocalRepo | Cloud save fails, saves locally |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Sync with local conflict | Login with same IDs | LWW logic resolves conflicts |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Quota exceeded | Storage full | Graceful error, cleanup |
#### Expected Outcomes
- Dual-track persistence works transparently for Guest/Auth users.

### Module: 4. 核心 Domain Hook: `useChunkedPractice`
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Create chunks (even) | 60 questions, size 20 | 3 chunks (20,20,20) | P0 |
| 2 | Create chunks (odd) | 55 questions, size 20 | 3 chunks (20,20,15) | P0 |
| 3 | Restore validation | 3 missing questions | Total questions reduced, skipped | P1 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | End-to-end chunk lifecycle | useChunkedPractice, Repo | Pending -> In Progress -> Completed |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Resume abandoned | User tries to resume | Blocked by hook logic |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Start locked chunk | Attempt chunk N+1 early | Throws/returns error state |
#### Expected Outcomes
- State machine correctly governs chunk progression.

### Module: 5. QuizEngine 整合
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Chunk mode start | chunkIds passed | Engine loads only subset | P0 |
| 2 | Chunk complete callback | Reached last question | Triggers `onChunkComplete` | P0 |
| 3 | Skip session save | mode === 'chunked' | Does not overwrite normal session | P1 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | QuizCard displays chunk meta | QuizEngine, QuizCard | Chunk context provided via hook |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Mode change mid-quiz | State corruption | Prevented by App state logic |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Missing chunkMeta | Mode is chunked | Throws descriptive error |
#### Expected Outcomes
- Engine supports chunk subsets without breaking standard modes.

### Module: 6. 戰鬥系統適配
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Reset boundary | `resetForNewChunk()` | streak=0, answered=0 | P0 |
| 2 | Pool respawn | `resetForNewChunk()` | `monsterPool` is refilled | P1 |
| 3 | Skill clear | `resetForNewChunk()` | `pendingSkill` is null | P2 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Chunk transition | useChunkedPractice, useBattleSystem | UI shows new monster spawn |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | GameMode off | User disabled RPG | Functions bypass reset safely |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | State desync | Resume partially completed chunk | Streak starts from 0 |
#### Expected Outcomes
- Battle state feels fresh at the start of every chunk.

### Module: 7. UI 元件
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Panel render | bank count = 2 | Shows valid size options | P0 |
| 2 | Card progress | 1/3 completed | Progress bar at 33% | P1 |
| 3 | QuizCard header | chunkIndex 1 | Shows "階段 2 / X" | P0 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Summary action | ChunkCompleteSummary, App | Clicking 'Next' starts new chunk |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Long bank names | UI overflow | Text is truncated with ellipsis |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Missing props | Render w/o data | Fallback skeleton/error boundary |
#### Expected Outcomes
- UI correctly communicates chunk milestones to the user.

### Module: 8. App 層整合
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Sync on login | Auth state changes | `syncLocalPracticeSessions` fires | P0 |
| 2 | Routing switch | Click 'New Session' | AppContent shows Panel | P1 |
| 3 | Action dispatch | Chunk complete event | Updates global view state | P2 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Guest to Auth migration | AuthContext, CloudRepo | Sessions upload and local clears |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Rapid route switches | Memory leaks | Effects cleanup properly |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Unhandled dispatch | Invalid action | Reducer throws safely |
#### Expected Outcomes
- End-to-end integration works smoothly across view states.

### Module: 9. 單元測試
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Test runner | `npm test` | All chunked practice tests pass | P0 |
| 2 | ID Validation | Missing ID | Tests assert ID is filtered | P1 |
| 3 | FIFO Limits | 6 sessions | Tests assert oldest is dropped | P0 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | DB Mocking | Vitest, MSW | API failures mocked successfully |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Full deletion test | All IDs deleted | Session completes immediately |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Test suite hangs | async await missing | Test timeout catches error |
#### Expected Outcomes
- High coverage on core chunking algorithms and edge cases.

### Module: 10. E2E 測試
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Full happy path | chunked-practice.spec.ts | Test passes | P0 |
| 2 | Abandon flow | chunked-practice.spec.ts | Session disappears | P1 |
| 3 | Small bank flow | chunked-practice.spec.ts | Directly completes | P1 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Browser context sync | Playwright pages | Progress syncs across tabs |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Mobile viewport | Responsive UI | Elements remain clickable |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | DOM element missing | Slow render | Playwright auto-waits |
#### Expected Outcomes
- Critical user journeys are protected from regressions.

### Module: 11. 文件與清理
#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Build check | `npm run build` | Exits 0 | P0 |
| 2 | Linter check | `npm run lint` | Zero errors/warnings | P1 |
| 3 | Docs check | MEMORY.md diff | Aliases correctly added | P2 |
#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Artifact cleanup | opsx | Archiving leaves clean tree |
#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Bundle size | Performance | Under limit |
#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Build breaks | TS errors | Pipeline halts |
#### Expected Outcomes
- Codebase is clean, typed, documented, and production-ready.
