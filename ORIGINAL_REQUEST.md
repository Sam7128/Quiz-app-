# Original User Request

## Initial Request — 2026-06-09T07:39:12Z

本專案旨在透過 `openspec-apply-with-tests` 技能，將安全審計修補變更 (`security-audit-remediation`) 完整應用至 `Quiz-app--main` 專案中。實作過程中必須採取防禦性程式設計，徹底消除在 `stress-test-report.md` 中指出的 Critical 與 High 級安全漏洞及連鎖故障隱患，並透過單元測試與端對端 (E2E) 壓測確保系統的高健壯性。

Working directory: `c:\Users\user\Desktop\Quiz-app--main`
Integrity mode: development

【特別要求】：本次任務執行過程中，必須至少指派或分出一個獨立的子代理（例如 Audit Agent / Tester Agent），專門進行代碼審計、測試執行與結果驗證，確保實作的防禦性符合預期，且所有安全漏洞已被確實修補。

## Requirements

### R1. BOLA / IDOR 越權存取防護與 RPC 強制後端判定
- 在 `cloudStorage.ts` 的 `getCloudBanks()` 和 `deleteCloudBank()` 中加入 `user_id` 與 `auth.getUser()` 的過濾校驗。
- 在 `challenges.ts` 的 `submitChallengeScore()` 中，**完全移除前端勝負判定 fallback**，強制呼叫 Supabase RPC，並在 `docs/sql/` 下提供對應的 `submit_challenge_score.sql` 與 RLS Policy SQL 文件，內含調用者 `auth.uid()` 越權檢查及分數上限校驗。
- 在 `socialService.ts` 的 `acceptFriendRequest()` 中，將越權的 `.or()` 條件修改為嚴格的 `.eq('friend_id', userId)`。

### R2. AI 生成結果 XSS 消毒與 API Key 本地 Salt 加密儲存
- 在 `ai.ts` 的 `generateQuestionsFromPDF()` 回傳值中，對 `question`, `options`, `hint`, `explanation` 等文字欄位呼叫 `DOMPurify.sanitize()` 進行消毒，防止 XSS 漏洞。
- 建立 `utils/crypto.ts`，使用 AES-GCM 進行 API Key 加密。密鑰必須從本地生成的隨機 Salt (`mindspark_crypto_salt`) 派生，**不得使用 navigator.userAgent 等易變環境指紋**（防範瀏覽器升級造成密鑰遺失）。
- 將 `getAIConfig` 與 React 組件載入 API Key 流程改為非同步。在載入完成前，元件必須展示 Loading 狀態或 Skeleton 骨架屏，防止白屏崩潰。

### R3. LocalStorage 防篡改簽名與競態條件防範
- 建立 `utils/integrityCheck.ts`，使用 HMAC-SHA256 簽名。檔案頂部必須明確加上註解說明此防護為「防君子不防小人」。
- 修改 `useBattleSystem` 和 `achievements.ts`/`useAchievements`，在其狀態載入與儲存時加入簽名計算與校驗，驗證失敗時回退到初始狀態。
- 為防止快速連續變更狀態導致非同步寫入順序混亂，必須在 `useBattleSystem` 中實作 Promise 序列化寫入隊列 (Promise Queue)，對 localStorage 寫入進行序列化排隊。
- `useBattleSystem` 與 `useAchievements` 必須匯出 `isInitialized`/`isLoading` 狀態，以便 UI (如 `App.tsx`) 在非同步載入期間展示 Skeleton。

### R4. 健全性與異常控制流優化
- **雙擊與異常防死鎖**：`QuizCard.tsx` 的 `submitAnswer` 引入 `isSubmittingRef` 同步鎖，且提交邏輯必須包裹在 `try...catch...finally` 中，在 `finally` 中將鎖釋放，防止 API 拋錯時 UI 死鎖。
- **計時器洩漏**：`useBattleSystem.ts` 中的 `setTimeout` 調用均需以 `useRef` 進行追蹤，並在 Component 卸載時執行 `clearTimeout` 清理。
- **AudioContext 洩漏**：在 `FocusTimer.tsx` 的 `playNotificationSound()` 中，於 oscillator 停止後延遲呼叫 `audioContext.close()`。
- **TypeScript 型別安全**：消除 `cloudStorage.ts` 中 `(window as any)` 違規（改用 `types/global.d.ts` 宣告擴充），代碼中嚴禁殘留任何 `any` 型別。
- **邊界與成就錯誤修正**：修復 `useBattleSystem.ts` 的 `getNextMonster` 空陣列越界風險；修正 `night_owl` 成就的時間判斷為 `hour >= 22`；移除根目錄未引用的 `constants.ts` 廢棄檔案。

## Acceptance Criteria

### 1. 程式碼安全性與防禦性
- [ ] 所有的 API Key 加密使用 Web Crypto AES-GCM，且密鑰使用本地 random salt 派生（模擬 User-Agent 變更，解密不得損壞）。
- [ ] 當 Supabase RPC / API 呼叫失敗時，聯賽分數提交立即拋出 Error 中斷，不進行 any 前端勝負判定與 UPDATE 降級回退。
- [ ] 在 `QuizCard.tsx` 提交答案出錯後，鎖能正確釋放，按鈕仍可重新點擊。

### 2. 靜態編譯與型別檢查
- [ ] 專案中沒有 any 或 `(xxx as any)` 型別的使用。
- [ ] 執行 `npx tsc --noEmit` 回傳 0 錯誤。
- [ ] 執行 `npm run build` 能成功建置出 production 檔案且無 Error。

### 3. 自動化測試覆蓋率
- [ ] 實作針對 BOLA 防護 (`cloudStorage.test.ts`)、好友請求 (`socialService.test.ts`)、AI XSS 消毒 (`ai.test.ts`)、加解密工具 (`crypto.test.ts`)、HMAC 簽名 (`integrityCheck.test.ts`)、成就時間判定 (`useAchievementTracker.test.ts`) 的單元測試。
- [ ] 執行 `npm test -- --run` 所有單元測試皆順利通過。
- [ ] 依據 `benchmark-harness.md` 規範，執行 Playwright E2E 安全壓測與連鎖故障注入（包含連點防護壓測、RPC 阻斷測試、寫入競態測試），且測試完全通過。

### 4. 文件與記錄
- [ ] 更新 `docs/DEVELOPMENT_LOG.md` 記錄本次安全修復變更。

## Follow-up — 2026-06-12T02:56:25Z

# Teamwork Project Prompt

執行 `openspec\changes\dead-code-cleanup` 的死碼清理與重構，移除未使用的型別與 export，刪除廢棄函式，清理 package.json 未使用依賴，並移轉為具備 React.memo 優化的 named exports，確保整個系統 100% 通過型別檢查、Vite 構建與所有測試。

Working directory: c:\Users\user\Desktop\Quiz-app--main
Integrity mode: development

## Requirements

### R1. 死碼清理與匯出最佳化
- 按照 `openspec\changes\dead-code-cleanup\tasks.md` 的規劃，清理 unused types、將僅在檔案內使用的常數/函式取消 `export`。
- 物理刪除 5 個已確認無引用的廢棄函式，包括 `getMonsterByProgress`、`clearAIConfig`、`getPendingChallengesCount` (位於 `services/challenges.ts`)、`isQuestionIdUuid`、`isSingleAnswer`。

### R2. 元件 Export 重構與 Memoization
- 移除 React 元件檔案中多餘的 `export default`。
- 對於本來有 `export default React.memo(...)` 的元件（如 `AIPromptGuide`、`BankManager` , `QuizCard`、`Settings`），改寫為將 named export 元件包裝為 `React.memo`，避免效能退化。
- 將外部檔案的所有 default import 改為 named import，並移除不必要的 default exports.

### R3. 依賴與範例檔案清理
- 在 `package.json` 中移除 `classnames`、`@tailwindcss/postcss`、`autoprefixer`、`postcss`、`@testing-library/jest-dom` 等 5 個未使用之依賴，並保留 overrides 中 postcss 的安全條目，隨後執行 `npm install`。
- 刪除 `.agents/`、`.claude/`、`.continue/` 的 systematic-debugging 範例檔案。

### R4. 「防自證幻覺與對抗性協作憲章」守則
- 任務執行期間，每完成一個階段必須提出明確的 Git Diff 實體變更說明。
- 必須透過實際的測試與型別檢查來核實。未提供實體 Code Diff、未通過故障注入測試、且主代理未進行手動 Double-check 前，禁止標記任務為已完成。

## Acceptance Criteria

### Verification & Correctness
- [ ] 執行 `npx tsc --noEmit` 回傳零型別錯誤。
- [ ] 執行 `npm run build` 能成功將產物編譯至 `dist/` 目錄。
- [ ] 執行 `npm test -- --run` 所有測試均能正常通過。
- [ ] `docs/reports/DEAD_CODE_REPORT_2026_06_10.md` 及 `docs/DEVELOPMENT_LOG.md` 均已更新清理完成狀態與摘要。

## Follow-up — 2026-07-12T06:22:41Z

你已被指派實作知識圖增強功能 (knowledge-graph-enhancements)。

請注意，你必須使用位於 `.agents/skills/openspec-apply-with-tests` 中的 skill 進行實施，並嚴格遵守專案根目錄下 `universal_remediation_prompt.md` 中規定的《防自證幻覺與對抗性協作憲章》。

以下是本次實作任務的完整 Prompt 與規格要求：

# 任務描述
本項目旨在重構與升級現有 React 知識圖（Knowledge Graph）模組。引入 Markdown 列表代碼編輯器（即時解析、放射狀佈局、層級配色）、TipTap 富文本筆記面板、獨立便利貼系統與跨節點筆記搜尋，並整合 Fail-fast 儲存安全防禦。

Working directory: c:\Users\user\Desktop\Quiz-app-
Integrity mode: development

## Requirements

### R1. Markdown 列表代碼編輯模式 (Code Mode)
- 提供 Markdown 列表文字編輯器，支援行號，並透過 500ms debounce 強制即時解析為心智圖。
- 實作自定義 BFS 放射狀佈局（radial layout）與層級配色（不同縮排層級不同顏色）。
- 提供視覺模式（畫布 + 筆記面板）與代碼模式（左側編輯器 + 右側唯讀預覽畫布）的雙向切換。

### R2. TipTap WYSIWYG 富文本筆記面板與搜尋 (Notes Panel)
- 整合 TipTap 編輯器（支援 H1/H2、粗體、斜體、底線、刪除線、清單等），筆記獨立以節點 title 作為 key 儲存於 document 級別的 `notes` 字典中。
- 提供跨節點筆記內容搜尋功能，點擊搜尋結果自動跳轉並聚焦。支援「未歸檔筆記」檢視與重聯/清除。

### R3. 便利貼節點系統 (Sticky Notes)
- 支援在畫布新增獨立黃色便利貼（`type: 'sticky'`），代碼模式解析/序列化時忽略，但切換回視覺模式時需與結構節點合併顯示。

### R4. 儲存安全與 Fail-fast 防禦 (Storage Safety)
- 升級 Schema Version 至 2。若 getGraphs 偵測到 v1 則執行自動遷移（將舊節點筆記合併至 `notes` 字典）。
- 遷移失敗或寫入配額不足時，執行 Fail-fast 拋出 Fatal Error 並由 ErrorBoundary 阻斷載入，防範清空舊資料。

## Acceptance Criteria

### Automated Tests
- 執行 `npm test -- --run src/__tests__/graphStorage.test.ts` 通過。
- 執行 `npm test -- --run src/__tests__/radialLayout.test.ts` 通過。
- 執行 `npm test -- --run src/__tests__/markdownGraphBridge.test.ts` 通過。
- 執行 `npx tsc --noEmit` 無 TypeScript 編譯錯誤（無 any 型別）。
- 執行 `npm run build` 通過生產環境編譯。

### Manual Verification
- 雙模式切換順暢，便利貼在代碼模式不丟失，切回視覺模式仍存在。
- 節點改名後筆記不丟失，舊 title 的筆記可透過未歸檔筆記重新連結。
- 富文本編輯器功能正常，且 500ms 自動儲存。

