## 1. AI 設定防護（RISK-006）— 低風險修復

- [x] 1.1 在 `services/ai.ts` 的 `getAIConfig()` 中，將 L66 的 `JSON.parse(data)` 包裝在 try-catch 中。catch 區塊中：(1) 呼叫 `console.error('[AI Config] Failed to parse config, clearing corrupted data')` (2) 清除 `sessionStorage` 和 `localStorage` 中的 `STORAGE_KEYS.AI_CONFIG` (3) 返回 `null`
- [x] 1.2 建立單元測試 `src/__tests__/ai.config.test.ts`，覆蓋三個場景：(1) 合法 JSON 正常解析 (2) 損壞 JSON 返回 null 且清除 storage (3) 空 storage 返回 null
- [x] 1.3 新增 AIConfig 尺寸上限與結構驗證：`data.length` 超過上限直接視為損壞並返回 `null`；解析後用 type guard 驗證結構，不合法則進入 catch
- [x] 1.4 清除 storage 的操作包裝 try-catch，若清除失敗改為 `console.warn` 並不中斷流程
- [x] 1.5 在 `components/Settings.tsx` 增加 AI API Key 安全警示與 `sessionStorage-only` 模式切換（若使用者選擇不持久化，禁止寫入 localStorage）
- [x] 1.6 擴充測試：新增「過大字串拒絕」、「結構不合法拒絕」、「清除 storage 失敗不拋錯」三個用例
- [x] 1.7 在 `docs/SECURITY_AND_LOGIC_AUDIT_REPORT.md` 補上 CSP 建議章節（含 report-only → enforce 的建議流程）
- [x] 1.8 若採用 report-only CSP，於 `index.html` 新增對應的 meta tag（並在文件中標註僅用於報告期）

**驗證方式**：執行 `npm test -- --run src/__tests__/ai.config.test.ts`，確認所有測試通過

## 2. syncLocalToCloud 改用 Promise.allSettled（RISK-007）

- [x] 2.1 在 `services/cloudStorage.ts` 的 `syncLocalToCloud()` (L200-212) 中，將 `await Promise.all(uploadPromises)` 替換為 `const results = await Promise.allSettled(uploadPromises)`
- [x] 2.2 遍歷 `results` 陣列，對 `status === 'rejected'` 的結果呼叫 `console.error`，錯誤原因需做型別守衛：`reason instanceof Error ? reason.message : String(reason)`
- [x] 2.3 加入並發上限（chunking 或 queue），限制同時同步的 bank 數量（例如 3~5）
- [x] 2.4 讓 `syncLocalToCloud` 回傳摘要（成功/失敗 IDs 與錯誤訊息），更新 caller 以顯示「部分失敗」與重試入口
- [x] 2.5 確認 `syncLocalToCloud` 的所有 caller（搜尋整個專案中的 `syncLocalToCloud` 呼叫），確保它們不依賴 Promise rejection 的行為
- [x] 2.6 建立單元測試 `src/__tests__/syncLocalToCloud.test.ts`，覆蓋三個場景：(1) 全部成功 (2) 部分失敗 (3) 全部失敗；並包含 reason 非 Error 的 case

**驗證方式**：執行 `npm test -- --run src/__tests__/syncLocalToCloud.test.ts`，確認所有測試通過

## 3. 同步並發鎖（RISK-001 部分 + RISK-003 部分）

- [x] 3.1 在 `services/cloudStorage.ts` 的模組頂層（約 L14 附近），新增 `let isSyncingPracticeSessions = false;` 變數
- [x] 3.2 在 `syncLocalPracticeSessions()` (L380) 的開頭加入守衛：`if (isSyncingPracticeSessions) { console.warn('[Sync] Already syncing practice sessions, skipping'); return EMPTY_SYNC_RESULT; }`
- [x] 3.3 將 `syncLocalPracticeSessions()` 的整個 try-catch 區塊包裝在 `isSyncingPracticeSessions = true; try { ... } finally { isSyncingPracticeSessions = false; }` 結構中
- [x] 3.4 建立單元測試，驗證：(1) 併發呼叫第二次返回 EMPTY_SYNC_RESULT (2) 失敗後鎖被釋放 (3) 成功後鎖被釋放
- [x] 3.5 在 UI/呼叫端明確處理 `EMPTY_SYNC_RESULT`（例如顯示「正在同步中」），避免 retry 端誤判成功

**驗證方式**：執行對應測試，確認並發鎖行為正確

## 4. 雲端較新 session回寫本機（RISK-002）

- [x] 4.1 在 `services/cloudStorage.ts` 的 `syncLocalPracticeSessions()` 中，找到 L432-434 的 `if (!isLocalNewer) { skipped += 1; continue; }` 區塊
- [x] 4.2 將該區塊修改為：`if (!isLocalNewer) { skipped += 1; updatedLocalSessions.push(cloudSession!); continue; }` — 將雲端版本加入 `updatedLocalSessions`，使其在 L479 的 `replaceAllPracticeSessions` 中被寫入本機
- [x] 4.3 建立單元測試，覆蓋場景：(1) 雲端較新時 session 被回寫到本機 (2) 本機較新時正常上傳 (3) 兩者相同時保留雲端版本
- [x] 4.4 回寫雲端版本時，清理該 session 的 chunk drafts（避免狀態不一致）
- [x] 4.5 在回寫本機前強制遵守 `PRACTICE_ACTIVE_LIMIT`（保留最新 N 筆或定義裁切策略）
- [x] 4.6 加入 `updatedAt` 異常漂移防護（差距過大時偏向雲端並記錄警告）

**驗證方式**：執行測試，確認雲端較新的 session 不再被靜默丟棄

## 5. saveCloudQuestions cleanup 降級（RISK-001）

- [x] 5.1 在 `services/cloudStorage.ts` 的 `saveCloudQuestions()` 中，找到 L191-194 的 cleanup error 處理區塊
- [x] 5.2 將 `throw new Error(...)` 改為 `console.warn('Cloud question cleanup failed (non-fatal):', cleanupError.message)` — 保留日誌但不拋錯
- [x] 5.3 同樣處理 L176-179 的 `deleteAllError`：將 throw 改為 console.warn，因為空 questions 的全量刪除失敗也應該降級而非中斷
- [x] 5.4 在 L174 的 `if (keepIds.length === 0)` 區塊前，新增 `console.info('[CloudStorage] saveCloudQuestions: keepIds is empty, will delete all questions for bank:', bankId)`
- [x] 5.5 建立單元測試：(1) upsert 成功 + cleanup 失敗 → 不拋錯 (2) upsert 失敗 → 拋錯且不執行 cleanup
- [x] 5.6 `keepIds` 為空時需顯式 `forceDeleteAll` 或 UI 二次確認；若未授權則直接拒絕全量刪除並回傳可處理錯誤
- [x] 5.7 cleanup 失敗時記錄待清理 bankId（例如 `mindspark_dirty_banks`），下次同步或啟動時重試
- [x] 5.8 `keepIds` 過大時分批執行 cleanup（避免 `in` 條件過長）
- [x] 5.9 驗證 Supabase RLS/Policy 已保護 `questions`/`banks` 表（不足則補 migration 或文件化要求）

**驗證方式**：執行測試，確認 cleanup 失敗不再中斷用戶操作

## 6. saveChunkDraft 版本守衛（RISK-004）

- [x] 6.1 在 `services/storage.ts` 的 `saveChunkDraft()` (L250-252) 中，在 `localStorage.setItem` 之前加入版本比較邏輯：讀取現有草稿，比較 `updatedAt`，若現有草稿**嚴格較新**（`>`）則拒絕寫入並記錄 `console.warn`
- [x] 6.2 確認 `hooks/useChunkedPractice.ts` 中 `updateChunkDraft` (L394-421) 和 `beforeunload` (L423-449) 兩個路徑都經過 `saveChunkDraft`，確保版本守衛對兩者都生效
- [x] 6.3 確認 `updateChunkDraft` 在 L419 已正確設置 `updatedAt: Date.now()`
- [x] 6.4 確認 `beforeunload` 在 L444 已正確設置 `updatedAt: Date.now()`
- [x] 6.5 建立單元測試 `src/__tests__/saveChunkDraft.test.ts`，覆蓋四個場景：(1) 較新草稿覆蓋較舊草稿 (2) 較舊草稿被拒絕 (3) 無現有草稿允許寫入 (4) legacy 草稿（無 updatedAt）允許覆蓋
- [x] 6.6 `localStorage.setItem` 需捕捉 `QuotaExceededError`，並採取清理最舊草稿或回報警告的降級策略
- [x] 6.7 若偵測 `updatedAt` 回撥過大（例如 > 1 小時），允許強制覆蓋並記錄警告

**驗證方式**：執行 `npm test -- --run src/__tests__/saveChunkDraft.test.ts`，確認所有測試通過

## 7. 依賴項安全升級

- [x] 7.1 執行 `npm audit` 記錄當前漏洞清單
- [x] 7.2 執行 `npm update vite` 升級到最新安全版本（patch/minor 升級優先，若需 major 升級則先查閱 changelog）
- [x] 7.3 執行 `npm update dompurify` 升級到最新版本
- [x] 7.4 執行 `npm audit` 確認漏洞數量減少
- [x] 7.5 執行 `npm run build` 確認 build 不受影響
- [x] 7.6 執行 `npm test` 確認所有測試通過
- [x] 7.7 若漏洞無法透過 `npm update` 消除，於 `package.json` 加入 `overrides`（必要時）
- [x] 7.8 檢查 `vite.config.ts` 中的 plugin 相容性與 HMR 行為（避免升級破壞開發流程）
- [x] 7.9 新增 DOMPurify 輸出回歸測試（涵蓋常見 HTML 標籤/屬性）

**驗證方式**：`npm audit` 漏洞減少 + `npm run build` 成功 + `npm test` 全部通過

## Traceability: Risk → Tasks → Tests

下表將 proposal 中已識別的 RISK 與 tasks.md 中的具體任務以及 benchmark/stress 測試對應起來，便於審查與驗證。

| Risk ID | Short description | Mapped Task(s) in tasks.md | Mapped Test/Benchmark |
|---------|-------------------|----------------------------|-----------------------|
| RISK-001 | saveCloudQuestions 非原子/cleanup 風險 | 5.1 - 5.9 (saveCloudQuestions cleanup 降級、keepIds 處理、記錄待清理 bankId) | M5 (saveCloudQuestions cleanup) + Unit tests (tasks 5.x) |
| RISK-002 | syncLocalPracticeSessions 被靜默丟棄 | 4.1 - 4.6 (雲端回寫到本機、清理 chunk drafts) | M4 (session write) + integration tests (tasks 4.x) |
| RISK-003 | syncLocalToCloud Promise.all 導致中斷 | 2.1 - 2.6 (Promise.allSettled、並發上限、返回摘要) | M2 (sync all) + syncLocalToCloud.unit tests (tasks 2.x) |
| RISK-004 | saveChunkDraft 版本回流/比較不完整 | 6.1 - 6.7 (版本守衛、QuotaExceeded 處理) | M6 (saveChunkDraft) + unit tests (tasks 6.x) |
| RISK-005 | 第三方套件 CVE（vite, dompurify） | 7.1 - 7.9 (依賴升級、audit、回歸測試) | M7 (dependency benchmarks) + CI `npm audit` gates (tasks 7.x) |
| RISK-006 | AI config JSON.parse 缺少容錯 | 1.1 - 1.6 (getAIConfig try-catch、尺寸上限、settings UI) | M1 (AI config parsing) + unit tests (tasks 1.x) |
| RISK-007 | syncLocalToCloud 全部失敗導致中斷 | 2.1 - 2.6 (Promise.allSettled 與結果摘要) | M2 (sync all) + unit/integration tests (tasks 2.x) |

(若有其他未映射的風險，請補充於此表格並指派負責人與測試案例)

## Immediate high-priority tasks

- [x] S1: Audit build artifacts for embedded credentials; revoke/rotate any found keys and record rotated key IDs in CHANGELOG.
- [x] S2: Add CI secret-scanning gate (fail on detected secrets) and run on PRs and main branch commits.
- [x] S3: Implement backend token-minting endpoint (short-lived tokens) and update clients to use scoped tokens instead of long-lived API keys.
- [x] S4: Add CI job that runs reproducible multi-client stress tests (subset of benchmark harness) and fail PRs if divergence/data-loss observed.
- [x] S5: Add dependency CVE enumeration task: list CVEs for vite/dompurify and assign upgrade/migration owners.

## 8. 全面驗證

- [x] 8.1 執行 `npx tsc --noEmit` 確認無型別錯誤
- [x] 8.2 執行 `npm run build` 確認 production build 成功
- [x] 8.3 執行 `npm test` 確認所有單元測試通過（包含新增的測試）
- [x] 8.4 新增 Playwright E2E：模擬同步部分失敗、重試、以及損壞 localStorage 的 AI 設定
- [x] 8.5 測試時間相關邏輯時使用 `vi.runAllTimersAsync()`，避免 fake timers 導致 Promise 無法結算
- [x] 8.6 在開發伺服器中手動驗證：(1) AI 設定頁面在損壞 config 後能正常載入 (2) 同步操作不會因部分失敗而完全中斷
- [x] 8.7 更新 `docs/DEVELOPMENT_LOG.md` 記錄此次安全修復的變更摘要
