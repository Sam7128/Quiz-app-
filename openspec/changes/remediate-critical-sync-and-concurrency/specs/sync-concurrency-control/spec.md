## MODIFIED Requirements

### Requirement: Sync concurrency lock prevents duplicate sync execution
系統 SHALL 在 `syncLocalPracticeSessions` 與 `syncLocalToCloud` 執行期間透過跨分頁安全鎖阻止並發調用。鎖的實作 SHALL 採 `navigator.locks` Web Locks API 為主（跨瀏覽器分頁共享、瀏覽器管理生命週期），並在 `navigator.locks` 不可用時降級為 timestamped localStorage lock（鎖鍵 `mindspark_sync_lock_ts`，30 秒過期防死鎖）。舊版 `window.__MINDSPARK_SYNC_LOCK__` 記憶體鎖 SHALL 被移除。`isSyncingPracticeSessions` 模組級旗標得以保留作為同分頁內第二重防護。鎖 SHALL 在同步與寫入的整個 lifecycle 中被持有，無論成功或失敗皆 SHALL 在執行完畢後釋放。當鎖不可得時，第二次呼叫 SHALL 立即返回空結果或拋出互斥錯誤並記錄 `console.warn`。

**新增行為 (H3 修復)**：在 localStorage fallback 路徑中，寫入 token 後 SHALL 等待 30~70ms 的隨機延遲，然後重新讀取 localStorage 驗證 token 是否仍為自己的值。若驗證失敗（token 被另一分頁覆寫），系統 SHALL 拋出 `Error('Sync lock held by another tab')` 而非繼續執行，以防止 TOCTOU 競態。

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

#### Scenario: Fallback lock double-check prevents TOCTOU race
- **WHEN** localStorage fallback 路徑寫入 token 至 `mindspark_sync_lock_ts`
- **THEN** 系統 SHALL 等待 30~70ms 的隨機延遲
- **AND** 系統 SHALL 重新讀取 `localStorage.getItem(fallbackKey)` 驗證值是否仍等於自己的 token
- **AND** 若驗證通過，系統 SHALL 繼續執行同步回調
- **AND** 若驗證失敗（token 已被另一分頁覆寫），系統 SHALL 拋出 `Error('Sync lock held by another tab')`

#### Scenario: Fallback lock self-clears after timeout
- **WHEN** fallback localStorage lock 被取得但同步在 30s 內未完成（例如瀏覽器凍結、OOM）
- **THEN** 後續呼叫在讀取鎖值時 SHALL 偵測到差距 >= 30000ms 並允許覆寫取得鎖
- **AND** SHALL 記錄 `console.warn` 報告已偵測到過期鎖

#### Scenario: Original memory lock is removed
- **WHEN** 讀取 `services/cloudStorage.ts`
- **THEN** 程式碼 SHALL NOT 包含 `window.__MINDSPARK_SYNC_LOCK__` 任何引用
