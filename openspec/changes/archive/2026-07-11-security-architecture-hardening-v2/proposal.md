## Why

第三方審計報告（`docs/SECURITY_AND_ARCHITECTURE_AUDIT_REPORT_V2.md`）揭露 7 項繞過既有防線的架構與安全隱患（含 1 項 Critical 資料遺失風險、3 項 High）。經核實，現有 `vercel.json` 無任何伺服器端安全標頭、`window.__MINDSPARK_SYNC_LOCK__` 為單分頁記憶體鎖無法跨分頁、`refreshBanksData` 的「雲端為空」排他條件會讓本地新題庫被雲端覆蓋而遺失、FocusTimer 卸載時 AudioContext 永不關閉、`saveCloudQuestions` 在 upsert 成功後但仍未寫入 dirty-bank 前的中斷瞬間會產生雲端幽靈題目。此外核實過程補充發現：`index.html` 的 CSP `connect-src` 漏了 `https://api.openai.com`（自訂 OpenAI baseUrl 用戶會被阻擋）、`playCorrectSfx`/`playWrongSfx` 為死導出、`retryDirtyPracticeSessions` 為死代碼。本變更集中修補這些隱患並在 OpenSpec 留下明文邊界。

## What Changes

- **部署 5 個伺服器端安全標頭** 至 `vercel.json`（CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy），CSP `connect-src` 完整覆蓋 Supabase / Gemini / OpenAI / NVIDIA（修正 `index.html` meta CSP 漏掉 OpenAI 的問題）。
- **跨分頁 sync 鎖**：以 `navigator.locks` Web Locks API 為主、timestamped localStorage lock 為 fallback（30s 死鎖保護），取代 `window.__MINDSPARK_SYNC_LOCK__` 純記憶體鎖。
- **統一 `saveChunkDraftSafely`**：`useChunkedPractice` 的 `updateChunkDraft` 與 `beforeunload` effect 共用同一份防退步邏輯，消除重複與競態。
- **`refreshBanksData` 安全合併**：新增 `BankMetadata.cloudSyncedAt?: number` 欄位以辨識「未同步」本地題庫；不論雲端是否為空皆合併上傳；不採報告建議的 ID-比對寫法（會導致無限彈窗）。
- **FocusTimer `activeAudioContextsRef`**：追蹤所有活躍 AudioContext，卸載時強制 close 全部，防 `clearTimeout` 跳過 `close()`。
- **`useKeyboardShortcuts` ref 模式**：監聽器只綁定一次，回調透過 `handlersRef` 呼叫，獨立於回調參考變化。
- **`saveCloudQuestions` 預寫 dirty-bank**：upsert 前先 `addDirtyBank(bankId)`，全成功後 `removeDirtyBank`；將「極限中斷遺留幽靈題目」風險收斂至 < 1ms。
- **`docs/SECURITY_LIMITATIONS.md`**：明文記錄 API Key 前端加密的 XSS 邊界、Supabase 同步極限中斷風險、Web Locks 瀏覽器支援與 CSP 自訂網域限制。

不在範圍：
- **不**引入後端 Proxy 或 PBKDF2+密碼（與純前端架構衝突 / 破壞 UX）。
- **不**新增自訂 Supabase RPC 預存程序或 migration（秉持 YAGNI，前端繼續使用原生客戶端 API，不額外增加維護負擔與攻擊面）。
- **不**改變 `bgmInstance` 單例生命週期（避免設定頁切換破壞 BGM 重播）；僅針對死導出與 SFX unload。

## Capabilities

### New Capabilities
- `vercel-security-headers`: 部署 5 個伺服器端 HTTP 安全標頭至 `vercel.json`，並規範 CSP `connect-src` 白名單必須完整覆蓋本機 / Supabase / Gemini / OpenAI / NVIDIA。
- `bank-merge-sync`: 規範 `refreshBanksData` 的 Guest / Authenticated 合併同步邏輯，以 `BankMetadata.cloudSyncedAt` 辨識未同步本地題庫，禁止「雲端為空」排他條件造成資料遺失。
- `audio-resource-lifecycle`: 規範 FocusTimer 與 Howler 音效資源（AudioContext / Howl 單例）的生命週期與卸載關閉義務。
- `keyboard-shortcuts-stability`: 規範 `useKeyboardShortcuts` 以 `useRef` 模式綁定監聽器一次，回調參考變化不得觸發重新綁定。

### Modified Capabilities
- `sync-concurrency-control`: Sync lock SHALL 採 `navigator.locks` 跨分頁；fallback 為 30s timestamped localStorage lock；`finally` 釋放保證；移除 `window.__MINDSPARK_SYNC_LOCK__` 記憶體鎖依賴。
- `draft-version-guard`: `useChunkedPractice` SHALL 透過統一 `saveChunkDraftSafely` 寫草稿；`updateChunkDraft` 與 `beforeunload` 不得存在重複防退步邏輯。
- `cloud-data-integrity`: `saveCloudQuestions` SHALL 在 upsert **之前** 預寫 `mindspark_dirty_banks`；upsert+cleanup 全成功後 SHALL clear；接線 dirty-bank retry 進入同步流程。
- `api-key-protection`: 新增 Known Limitation 段，明文記錄前端 AES-GCM 加密的 XSS 邊界與緩解措施。

## Impact

**程式碼（10 檔案修改 + 3 新增）**：
- 修改：`vercel.json`、`index.html`、`services/cloudStorage.ts`、`hooks/useChunkedPractice.ts`、`hooks/useBankManager.ts`、`components/FocusTimer.tsx`、`hooks/useKeyboardShortcuts.ts`
- 新增：`docs/SECURITY_LIMITATIONS.md`、4 個 OpenSpec spec 檔案、5 個新單元測試檔案（`useBankManager.test.ts`、`focusTimer.audio.test.tsx`、`useKeyboardShortcuts.test.tsx`、`useSoundEffects.test.ts`，及強化 `cloudStorage.test.ts` / `syncLocalToCloud.test.ts` / `useChunkedPractice.draft.test.ts`）

**API / Dependencies**:
- `vercel.json` headers 區塊在 production 部署生效；CSP 過嚴可能擋住未來新增的外部連線（自訂 AI Proxy 用戶需手動加白名單）
- `navigator.locks` Web Locks API 在所有現代瀏覽器可用；IE / 舊版 Safari 走 30s 過期 fallback lock
- `BankMetadata.cloudSyncedAt?: number` 新欄位向後相容；升級時既有題庫無此欄位會自動觸發一次同步（可接受遷移）

**系統面**:
- 登入 sync 流程（`App.tsx:121`、`useAppDataLoader` init effect）同步邏輯外觀不變
- `e2e/sync-and-settings-hardening.spec.ts` 與 `e2e/mindspark.spec.ts` 需回歸通過
- 既有 7 個 spec 受影響（4 MODIFIED + 4 ADDED），歸檔後將同步至 `openspec/specs/`

## Rollback

本變更全在 git 控管下，每完成一個 Phase 建議 commit。若需回滾：

| 失敗 Phase | 回滾動作 |
|-----------|---------|
| T1（vercel.json / index.html） | `git checkout vercel.json index.html` |
| T2（sync lock） | `git checkout services/cloudStorage.ts types/global.d.ts`；既有 `window.__MINDSPARK_SYNC_LOCK__` 仍可恢復 |
| T3（saveChunkDraftSafely） | `git checkout hooks/useChunkedPractice.ts` ; 原版邏輯完整可恢復 |
| T4（cloudSyncedAt） | **Critical**：執行前先備份 `localStorage.getItem('mindspark_banks_meta')` 寫到檔案；`git checkout types.ts hooks/useBankManager.ts services/cloudStorage.ts services/storage.ts` 恢復排他條件 |
| T5（FocusTimer） | `git checkout components/FocusTimer.tsx` |
| T6（KeyboardShortcuts） | `git checkout hooks/useKeyboardShortcuts.ts` |
| T7（Howler） | `git checkout hooks/useSoundEffects.ts components/BattleArena.tsx` |
| T8（dirty-bank 預寫） | `git checkout services/cloudStorage.ts`；既有 `addDirtyBank` 只在失敗路徑恢復 |
| T9（docs/SECURITY_LIMITATIONS.md） | `Remove-Item docs/SECURITY_LIMITATIONS.md` |

**全域回滾**：`git reset --hard <pre-task-commit>`。

**資料安全**（依 AGENTS.md 鐵規 4）：T4 執行前必須備份當前 `mindspark_banks_meta` localStorage；禁止對真實用戶 localStorage 進行 T4.5 合併測試；測試一律在 jsdom 隔離環境。
