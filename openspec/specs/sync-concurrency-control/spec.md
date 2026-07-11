# sync-concurrency-control Specification

## Purpose
TBD - created by archiving change security-and-sync-hardening. Update Purpose after archive.
## Requirements
### Requirement: Sync concurrency lock prevents duplicate sync execution
系統 SHALL 在 `syncLocalPracticeSessions` 與 `syncLocalToCloud` 執行期間透過跨分頁安全鎖阻止並發調用。鎖的實作 SHALL 採 `navigator.locks` Web Locks API 為主（跨瀏覽器分頁共享、瀏覽器管理生命週期），並在 `navigator.locks` 不可用時降級為 timestamped localStorage lock（鎖鍵 `mindspark_sync_lock_ts`，30 秒過期防死鎖）。舊版 `window.__MINDSPARK_SYNC_LOCK__` 記憶體鎖 SHALL 被移除。`isSyncingPracticeSessions` 模組級旗標得以保留作為同分頁內第二重防護。鎖 SHALL 在同步與寫入的整個 lifecycle 中被持有，無論成功或失敗皆 SHALL 在執行完畢後釋放。當鎖不可得時，第二次呼叫 SHALL 立即返回空結果或拋出互斥錯誤並記錄 `console.warn`。

#### Scenario: Duplicate sync call is rejected
- **WHEN** `syncLocalPracticeSessions` 或 `syncLocalToCloud` 正在執行中
- **AND** 另一個調用者（例如 React Effect 重跑、路由切換、另一個分頁）再次呼叫同步
- **THEN** 第二次呼叫 SHALL 被拒絕或返回 `EMPTY_SYNC_RESULT`
- **AND** 系統 SHALL 記錄 console.warn 說明跳過原因
- **AND** 第一次呼叫 SHALL 不受影響，繼續正常執行

#### Scenario: Lock is released after sync completion
- **WHEN** 同步事務執行完畢（無論成功或失敗）
- **THEN** 鎖 SHALL 被釋放（Web Locks 的 callback resolve 或清除 localStorage 鎖鍵）
- **AND** 後續的 sync 呼叫 SHALL 能正常取得鎖並執行

#### Scenario: Web Locks unavailable falls back to 30s timestamped localStorage lock
- **WHEN** `navigator.locks.request` 不可用（例如舊版瀏覽器）
- **THEN** 系統 SHALL 嘗試取得 timestamped localStorage lock（`mindspark_sync_lock_ts`）
- **AND** 若 localStorage 中現存鎖值與當前時間差距 < 30000ms SHALL 視為被持有，拒絕此次併發
- **AND** 若鎖值 >= 30000ms 或不存在 SHALL 視為可取得，寫入當前 timestamp 並繼續執行

#### Scenario: Fallback lock self-clears after timeout
- **WHEN** fallback localStorage lock 被取得但同步在 30s 內未完成（例如瀏覽器凍結、OOM）
- **THEN** 後續呼叫在讀取鎖值時 SHALL 偵測到差距 >= 30000ms 並允許覆寫取得鎖
- **AND** SHALL 記錄 `console.warn` 報告已偵測到過期鎖

#### Scenario: Original memory lock is removed
- **WHEN** 讀取 `services/cloudStorage.ts`
- **THEN** 程式碼 SHALL NOT 包含 `window.__MINDSPARK_SYNC_LOCK__` 任何引用

### Requirement: syncLocalToCloud limits concurrent bank uploads
系統 SHALL 對 `syncLocalToCloud` 的 bank 上傳加入並發上限，避免一次性觸發大量請求造成 Rate Limit。

#### Scenario: Concurrency is capped
- **WHEN** 使用者有 50 個 bank 需要同步
- **THEN** 系統 SHALL 以固定並發上限分批處理（例如每批 3~5 個）
- **AND** 系統 SHALL 仍回傳完整的成功/失敗摘要

### Requirement: syncLocalToCloud returns failure summary
系統 SHALL 回傳同步摘要（成功/失敗 bank IDs 與錯誤訊息），供 UI 呈現部分失敗與重試入口。

#### Scenario: Partial failure summary is returned
- **WHEN** 同步過程中有部分 bank 失敗
- **THEN** 回傳結果 SHALL 包含失敗 bank 的識別與錯誤訊息

### Requirement: syncLocalToCloud uses Promise.allSettled for fault isolation
系統 SHALL 在 `syncLocalToCloud` 中使用 `Promise.allSettled` 替代 `Promise.all`，以確保單一 bank 的同步失敗不會中斷其他 bank 的同步。

#### Scenario: One bank fails while others succeed
- **WHEN** 使用者有 3 個本機 bank 需要同步
- **AND** 第 2 個 bank 的 `createCloudBank` 失敗（例如網路超時）
- **THEN** 第 1 個和第 3 個 bank 的同步 SHALL 正常完成
- **AND** 系統 SHALL 記錄第 2 個 bank 的失敗原因至 console.error
- **AND** 函式 SHALL NOT 拋出 unhandled rejection

#### Scenario: All banks fail
- **WHEN** 所有 bank 的同步都失敗（例如 Supabase 完全不可用）
- **THEN** 系統 SHALL 記錄所有失敗原因
- **AND** 函式 SHALL 正常返回（不拋錯）
- **AND** 本機資料 SHALL 不受影響

#### Scenario: All banks succeed
- **WHEN** 所有 bank 的同步都成功
- **THEN** 行為 SHALL 與使用 `Promise.all` 時完全一致

### Requirement: Sync lock uses typed Window interface extension
若 NavigatorLocks 在專案 TypeScript lib.dom.d.ts 中型別不完整，`types/global.d.ts` SHALL 補充 `NavigatorLocks` 介面擴充以避免 `as any`。`navigator.locks.request` 的存取 SHALL 通過 TypeScript 編譯不需 `as any`。

#### Scenario: Sync lock access with typed interface
- **WHEN** `syncLocalPracticeSessions` 讀寫 `navigator.locks.request`
- **THEN** 存取 SHALL 通過 `navigator.locks.request`（無需 `as any` 轉型）
- **AND** TypeScript 編譯 SHALL 通過 `npx tsc --noEmit` 無型別錯誤

#### Scenario: global.d.ts declares fallback lock types as needed
- **WHEN** TypeScript 編譯器處理 `cloudStorage.ts`
- **THEN** 若 lib.dom.d.ts 的 `NavigatorLocks` 型別不完整，`types/global.d.ts` SHALL 包含補充宣告
- **AND** 專案中 SHALL 不存在 any `as any` 表達式用於 sync lock 存取

### Requirement: Cross-tab sync lock via Web Locks API
`syncLocalPracticeSessions` 與 `syncLocalToCloud` SHALL 透過 `navigator.locks.request(SYNC_LOCK_NAME, { mode: 'exclusive' }, callback)` 取得跨分頁排他鎖。`SYNC_LOCK_NAME` 為模組常數 `'mindspark_practice_sync'`。Callback SHALL 傳入非同步邏輯，且鎖的持有期 SHALL 完整包覆 Supabase 雲端請求與本地寫入，直至 Promise resolve。

#### Scenario: Web Locks acquired successfully
- **WHEN** `navigator.locks.request` 可用且鎖為空閒
- **THEN** Web Locks API SHALL 執行 callback
- **AND** 同步邏輯 (包含網路與本地 I/O) SHALL 在 callback 內執行
- **AND** Promise resolve 後鎖 SHALL 自動釋放

#### Scenario: BANKS_META updates protected by lock
- **WHEN** `syncLocalToCloud` 觸發
- **THEN** 其讀取與更新本地 `BANKS_META` (寫入 `cloudSyncedAt`) 的全部非同步操作 SHALL 完整在 `runWithSyncLock` 封裝中被執行
- **AND** 多個分頁同時登入時，對 `BANKS_META` 的讀寫會依序序列化執行，無法並發 Race。

