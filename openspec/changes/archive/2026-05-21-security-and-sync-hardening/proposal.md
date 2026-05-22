## Why

MindSpark 的安全與邏輯審計報告（2026-05-21）揭示了 7 項風險，涵蓋雲端同步競態條件、資料完整性漏洞、API 金鑰洩露風險以及第三方套件漏洞。這些問題在多裝置/多分頁場景下可能導致用戶學習進度遺失、資料不一致甚至經濟損失。專案目前架構在單機場景穩定，但在雲端同步與多端操作的情境下存在系統性風險，必須在功能擴展前解決。

## What Changes

### 同步可靠性修復
- 將 `syncLocalToCloud()` 從 `Promise.all` 改為 `Promise.allSettled`，個別 bank 失敗不中斷整批同步
- 為 `syncLocalToCloud` 加入並發上限與失敗摘要回傳（成功/失敗清單），UI 可顯示部分失敗與重試入口
- 在 `syncLocalPracticeSessions()` 中，當雲端 session 較新時回寫本機（而非跳過丟棄），防止本地資料靜默消失
- 為 `syncLocalPracticeSessions` 引入 `isSyncing` 單分頁並發鎖，跨分頁僅提供 best-effort 防護（不保證全域排他）

### 資料完整性強化
- 將 `saveCloudQuestions()` 的「先 upsert 後 delete」非原子流程改為防禦性設計：upsert 失敗時跳過 cleanup，cleanup 失敗時不拋例外僅記錄警告並保留雲端 fallback
- 增加 `keepIds` 空陣列防護：預設禁止全量刪除，需顯式 `forceDeleteAll` 或 UI 二次確認才允許清空

### 草稿保存穩健性
- 在 `saveChunkDraft()` 中加入 `updatedAt` 時間戳比較，確保只有較新的草稿能覆蓋現有草稿
- 統一 `updateChunkDraft` 與 `beforeunload` 兩個寫入路徑的防回流邏輯

### AI 設定安全強化
- 為 `getAIConfig()` 的 `JSON.parse` 加入 try-catch 防護，解析失敗時回傳 `null` 並清理損壞設定（清理失敗需容錯）
- 新增 AIConfig 结构驗證與大小上限（避免過大/不合法 JSON 造成阻塞或崩潰）
- 新增 AI API Key 存儲安全警示 UI 與 sessionStorage-only 模式引導
- 為敏感設定頁面新增 CSP meta tag 建議文件（補進現有安全報告）

### 依賴項安全更新
- 升級 `vite` 與 `dompurify` 至安全版本以修復已知 CVE

## Capabilities

### New Capabilities
- `sync-concurrency-control`: 同步並發控制機制，包含 isSyncing 鎖、Promise.allSettled 改造、個別 bank 失敗隔離與重試佇列
- `draft-version-guard`: 草稿版本守衛機制，基於 updatedAt 時間戳比較的防回流寫入保護

### Modified Capabilities
- `cloud-data-integrity`: 新增 saveCloudQuestions 防禦性非原子流程保護，keepIds 空值守衛，cleanup 失敗降級策略
- `practice-session-storage`: 新增雲端較新 session 回寫本機邏輯，同步時間戳衝突處理策略
- `chunked-practice`: 強化 chunk draft 的 updatedAt 版本比較，統一多來源寫入防護

## Impact

### 受影響的檔案
| 檔案 | 影響範圍 |
|------|---------|
| `services/cloudStorage.ts` | syncLocalToCloud, syncLocalPracticeSessions, saveCloudQuestions 邏輯重構 |
| `services/storage.ts` | saveChunkDraft 新增版本比較邏輯 |
| `services/ai.ts` | getAIConfig 新增 try-catch 防護 |
| `hooks/useChunkedPractice.ts` | updateChunkDraft / beforeunload 統一防回流邏輯 |
| `components/Settings.tsx` | AI 設定安全警示與持久化模式引導 |
| `package.json` | vite, dompurify 版本升級 |
| `index.html` | 可選 CSP meta tag |
| `src/__tests__/` | 新增同步/AI 設定/DOMPurify 測試 |
| `e2e/` | 新增同步與損壞 storage 的 E2E 驗證 |

### 風險評估
- **回歸風險**：同步邏輯修改可能影響現有登入後的自動同步流程，需全面 E2E 測試覆蓋
- **Breaking Change**：無 — 所有修改為向後相容的防禦性加強
- **效能影響**：`Promise.allSettled` 可能略慢於 `Promise.all`（需等待所有結果），但提供了更好的容錯性
- **資料安全**：saveChunkDraft 的版本比較新增可能導致極端情況下拒絕合法寫入，需設計 fallback
