# 執行任務：P1 執行期防禦硬化與資料優化 (Final)

> **架構原則**：遵循「型別契約 → 儲存與守衛 → 前端消費對接 → 清理與解耦 → 全生命週期驗證」嚴格依賴鏈。
> **鐵規遵循**：禁止 `any`、禁止跳過測試斷言、全面落實 DoD、全端點閉環消費、標記 Sunset Policy。

---

## 1. JSON Runtime Validation 與存量安全隔離 (Type & Storage Core)

- [ ] **1.1 擴充 `utils/typeGuards.ts` 輕量執行期型別守衛**
  - **依賴**：無（作為最底層基礎模組）。
  - **範圍**：
    - 實作 `isRecord(value: unknown): value is Record<string, unknown>`（排除 `null` 與陣列）。
    - 實作 `isQuestion(value: unknown): value is Question`：嚴格校驗 `id`（字串或有限數值）、非空 `question` 字串、`options` 為非空字串陣列、`answer` 為字串或字串陣列；其餘非核心欄位（`hint`, `explanation`, `tags`, `type`）若存在必須符合其型別，不存在則容錯。
    - 實作安全集合解析器 `parseQuestions(value: unknown, source: string): Question[]`：若 value 非陣列直接返回 `[]`；陣列成員逐項過濾，畸形題目以 `console.warn('[QuestionGuard] Quarantined corrupted question', { source, index })` 隔離警示，不外洩答案敏感資訊，確保下游永遠取得型別保證之合法 `Question[]`。
  - **全自動驗證**：新增單元測試 `src/__tests__/typeGuards.test.ts`，覆蓋合法人機題、單選/多選題、`options: null`、非字串選項、缺少 question、缺少 answer、非陣列 root、混雜畸形陣列等場景，並斷言 warn 格式。
  - **DoD**：全入參為 `unknown`，無 `any` 型別，單元測試 100% 通過。
  - **回滾**：若歷史題庫有合法未知欄位被誤殺，縮窄必要檢查欄位範圍並保留測試，禁止使用 `as Question` 盲目轉型。

- [ ] **1.2 改造 `services/storage.ts` 反序列化防禦與存量隔離**
  - **依賴**：任務 1.1。
  - **範圍**：
    - 改造 `getQuestions(bankId: string): Question[]`：將原本 `data ? JSON.parse(data) : []` 的直接轉型替換為 `parseQuestions(JSON.parse(data), \`storage:bank:\${bankId}\`)`。
    - 保留語法錯誤 `try-catch` 返回 `[]` 之防禦機制。
    - 檢查 `getBanksMeta()` 中的舊版題目計數讀取，確保題數統計以合法題目數為準，不被損毀資料污染。
  - **全生命週期追溯 (Data Flow)**：`localStorage raw JSON → JSON.parse → parseQuestions 結構過濾 → 返回純淨 Question[] → 注入 QuizContext / RepositoryContext`。入口阻斷畸形題目，保證下游 `.map()`、`.join()` 免疫。
  - **全自動驗證**：擴充 `src/__tests__/storage.test.ts`（或新增 `src/__tests__/storageValidation.test.ts`），驗證存量損毀題目被隔離降級、有效題目全數保留、完全損毀/非陣列 JSON 返回 `[]` 且不引發未捕獲例外。
  - **DoD**：呼叫端元件接收到的題庫資料保證無 `null` 或殘缺 options，單元測試綠燈通過。
  - **回滾**：若存量讀取異常，可獨立還原 `services/storage.ts` 中 `getQuestions` 的接線。

- [ ] **1.3 改造 `components/BankManager.tsx` 題庫匯入逐題校驗與入口阻斷**
  - **依賴**：任務 1.1。
  - **範圍**：
    - 改造 `BankManager.tsx` 中的 `normalizeImportedQuestions(value: unknown): Question[]`。
    - 廢除原本僅檢查第 0 項（`value[0]`）的粗篩邏輯，改為使用 `parseQuestions(value, 'import:normalize')` 進行全陣列逐題結構守衛。
    - 若經過校驗後有效題目數量為 0，則拋出友善錯誤提示（`"匯入資料中無任何有效題目"`），立即阻斷後續的 `planQuestionImport`、`confirmImportSummary` 以及 `repository.saveQuestions`，防止空題庫或垃圾資料寫入。
  - **全生命週期追溯 (Data Flow)**：`上傳檔案/貼上文字 → parseQuestions 入口守衛 → normalizeImportedQuestions → planQuestionImport 衝突計算 → 使用者確認 → repository.saveQuestions`。整批無效時前置阻斷，不觸發任何狀態修改。
  - **全自動驗證**：新增/更新 `src/__tests__/bankManagerImportValidation.test.tsx`，模擬整批畸形、部分畸形、全有效 JSON 匯入，斷言錯誤阻斷與合法題目保留行為。
  - **DoD**：無法匯入包含 `options: null` 或缺欄位的壞題目，單元測試通過。
  - **回滾**：可獨立還原 `BankManager.tsx` 匯入解析函式。

---

## 2. UTF-8 BOM 清洗與 Blob 匯出耐久化 (File I/O)

- [ ] **2.1 在 `components/BankManager.tsx` 的 `processJson` 加入前導 BOM 清洗**
  - **依賴**：無（可與 1.x 同步實作）。
  - **範圍**：
    - 在 `BankManager.tsx` 的 `processJson(jsonString: string)` 第一行加入前導 BOM 清洗：
      `const sanitizedJson = jsonString.replace(/^\uFEFF+/, '');`
    - 將 `sanitizedJson` 傳遞給後續 `JSON.parse`。
    - 僅移除字串最開頭的 `\uFEFF`，不替換題目內容正文中合法的 Unicode 字符。
  - **全自動驗證**：新增單元測試，傳入帶有 `\uFEFF` 前導 Byte Order Mark 的 JSON 字串，斷言解析成功且無 `SyntaxError`，匯入對話框順利觸發。
  - **DoD**：Windows 記事本匯出之 UTF-8 BOM 題庫無痛正常匯入。
  - **回滾**：若正則造成問題，可獨立恢復 `jsonString` 原樣。

- [ ] **2.2 改造 `components/BankManager.tsx` 的 `handleExport` 為 Blob + 延遲 Revocation**
  - **依賴**：任務 1.1。
  - **範圍**：
    - 廢除 `components/BankManager.tsx:370` 的 `data:text/json;charset=utf-8,` Data URI 拼接字串。
    - 改為建立二進位 Blob：`new Blob([JSON.stringify(currentQuestions, null, 2)], { type: 'application/json;charset=utf-8' })`。
    - 透過 `URL.createObjectURL(blob)` 建立下載 URL，並掛載 `<a>` 標籤觸發 `downloadAnchorNode.click()` 後立即從 DOM 移除。
    - 採用標準延遲釋放模式：`setTimeout(() => URL.revokeObjectURL(url), 1000)`，兼顧 Firefox / WebKit 非同步下載啟動與徹底回收記憶體。
  - **全自動驗證**：新增單元測試 `src/__tests__/bankManagerExport.test.tsx`，spy `URL.createObjectURL` 與 `URL.revokeObjectURL`，斷言產生正確 Blob 參數、觸發下載點擊、並在計時器到期後執行 revoke，斷言 href 不包含 `data:text/json`。
  - **DoD**：千題大題庫匯出無 URL 溢出與 OOM 風險，記憶體及時釋放，單元測試綠燈通過。
  - **回滾**：可獨立回退 `handleExport` 實作。

---

## 3. 音效架構統一至 Howler.js 與 `use-sound` 拔除 (Audio Architecture)

- [ ] **3.1 擴充 `hooks/useSoundEffects.ts` 導出 `playQuizFeedback`**
  - **依賴**：無（作為音效核心服務層）。
  - **範圍**：
    - 在 `types/battleTypes.ts` 或 `hooks/useSoundEffects.ts` 定義 `type QuizFeedbackKind = 'correct' | 'wrong';`。
    - 擴充 `UseSoundEffectsReturn` 介面，導出 `playQuizFeedback: (result: QuizFeedbackKind) => void`。
    - 在 `useSoundEffects.ts` 內部維護 `/sounds/correct.mp3`（音量 0.5）與 `/sounds/wrong.mp3`（音量 0.3）之 Howler 單例或映射實例。
    - 播放前嚴格檢查 `isSfxEnabled`；若為 `false` 則直接 return（保持靜音）；所有 play 呼叫均以 `try-catch` 包裹防禦。
    - 元件 unmount 時適當管理資源生命週期，不破壞全域 BGM 單例。
    - 標註 Sunset Policy：`// ponytail: [Sunset: v2.0 - Howler.js 單例若未來重構為 Web Audio AudioContext 音訊節點圖，本 hook 介面將統一套用 AudioGraphManager]`。
  - **端到端閉環 (E2E Consumer)**：此介面專門提供給任務 3.2 的 `QuizCard.tsx` 消費，嚴禁成為孤兒端點。
  - **全自動驗證**：撰寫 `src/__tests__/useSoundEffectsQuiz.test.ts`，測試在 `isSfxEnabled=true` 時正確呼叫 Howl play、`isSfxEnabled=false` 時靜音（no-op）、音效檔案載入/播放例外時優雅降級不崩潰。
  - **DoD**：導出方法完全由 TypeScript 型別定義保護，單元測試通過。
  - **回滾**：可獨立還原 `useSoundEffects.ts`。

- [ ] **3.2 改造 `components/QuizCard.tsx` 接入全域 Howler SFX**
  - **依賴**：任務 3.1。
  - **範圍**：
    - 刪除 `import useSound from 'use-sound';`。
    - 刪除元件內部孤立的 `const [soundEnabled, setSoundEnabled] = useState(true);`。
    - 刪除原先透過 `useSound` 建立的 `playCorrect` 與 `playWrong`。
    - 引入 `const { playQuizFeedback } = useSoundEffects();`。
    - 在答對分支調用 `playQuizFeedback('correct')`，在答錯分支調用 `playQuizFeedback('wrong')`。
    - 確保原先的作答狀態、自動切題、解析顯示與戰鬥演出時序維持 100% 一致。
  - **端到端閉環 (E2E Consumer)**：完全消費任務 3.1 導出之 `playQuizFeedback`，消除孤立狀態，全域靜音切換立即在做題時生效。
  - **全自動驗證**：更新 `src/__tests__/autoAdvance.test.tsx`，驗證答對與答錯時正確觸發 `playQuizFeedback`，且自動切題流程原樣通過。
  - **DoD**：做題介面無孤立音效 state，答題提示音完全受控於全域 SFX 開關，單元測試通過。
  - **回滾**：可獨立還原 `QuizCard.tsx`。

- [ ] **3.3 拔除 `package.json` 中的 `use-sound` 依賴並清理孤兒 Mock (Pruning Task)**
  - **依賴**：任務 3.2。
  - **範圍**：
    - 執行 `npm uninstall use-sound`，確保從 `package.json` 與 `package-lock.json` 徹底移除。
    - 清理決策變更殘留：移除 `src/__tests__/autoAdvance.test.tsx` 中的 `vi.mock('use-sound', ...)`。
    - 清理決策變更殘留：移除 `src/__tests__/remediateBypass.challenger.test.ts` 中的 `vi.mock('use-sound', ...)`。
    - 全庫搜尋確認無任何生產代碼、測試代碼或設定檔參照 `use-sound`。
  - **全自動驗證**：
    - PowerShell 執行 `Select-String -Path package.json,package-lock.json,components\*,src\__tests__\* -Pattern 'use-sound'`，驗證結果為 0 筆命中。
    - 執行 `npm test -- --run`，確認受影響之測試全部綠燈。
  - **DoD**：專案零死依賴、零孤兒 mock，打包與測試乾淨透明。
  - **回滾**：若 lockfile 解析出錯，以 git checkout 恢復後重新精準 uninstall。

---

## 4. 深色模式首屏白閃 (Zero-FOUC) 阻斷式預載 (Theme Bootstrap)

- [ ] **4.1 在 `index.html` 的 `<head>` 注入防禦型 inline `<script>`**
  - **依賴**：無（可獨立實作）。
  - **範圍**：
    - 在 `index.html` 的 `</head>` 標籤前注入極簡 IIFE inline script：
      ```html
      <script>
        (function() {
          try {
            var stored = localStorage.getItem('mindspark_theme');
            var theme = stored || 'light';
            var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (isDark) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch (e) {
            // Graceful fallback on Storage/SecurityError in Incognito mode
          }
        })();
      </script>
      ```
    - 確保完全符合 `index.html` CSP 政策（`script-src 'self' 'unsafe-inline'`）。
    - 嚴格包裹 `try-catch`，防範無痕瀏覽模式或隱私限制環境下讀取 `localStorage` 拋出 `SecurityError` 阻斷首屏載入。
  - **全自動驗證**：新增測試 `src/__tests__/themeFoucBootstrap.test.ts`，以 JSDOM 模擬執行該 script 邏輯，驗證在 `'dark'`、`'light'`、`'system'`（match/mismatch）、未設置、無痕模式 Storage 拋出例外等各種情境下，`<html>` class 正確反映且不拋出例外。
  - **DoD**：首屏 DOM 渲染前即確定 theme 樣式，消除夜間模式刺眼白閃。
  - **回滾**：可直接自 `index.html` 移除該 inline `<script>`，自動回歸 React 延遲生效機制。

- [ ] **4.2 驗證 `ThemeContext.tsx` 與 inline script 狀態對齊**
  - **依賴**：任務 4.1。
  - **範圍**：
    - 檢核 `contexts/ThemeContext.tsx`，確認其從 `localStorage.getItem(STORAGE_KEYS.THEME)` 初始化之邏輯與 inline script 完全對齊（同為 `mindspark_theme` 鍵值，同為 `light/dark/system` 語意）。
    - 驗證 React 元件 mount 後接管切換與 `matchMedia` 監聽時無衝突或二次重繪閃爍。
  - **全自動驗證**：執行既有主題切換測試（`src/__tests__/theme*.test.*` 若有），確保切換主題時 localStorage 與 DOM class 正確連動。
  - **DoD**：前置 inline 腳本與 React Context 雙向無縫銜接。
  - **回滾**：若有衝突，微調 `ThemeContext.tsx` 初始化時序。

---

## 5. 全生命週期整合驗證與品質閘門審計 (Verification & Quality Gates)

- [ ] **5.1 執行全生命週期數據流防禦整合驗證**
  - **依賴**：任務 1.2, 1.3, 2.1, 2.2, 3.2, 4.1。
  - **範圍**：
    - 建立端到端整合測試：從包含 UTF-8 BOM 與殘缺題目的 JSON 匯入，驗證 BOM 被清洗、殘缺題目被隔離、有效題目正常儲存至 Storage；再從 Storage 讀取進入做題卡，做題時驗證 Howler 音效受全域開關控制，首屏主題無白閃。
    - 嚴格檢查全生命週期數據流：
      `Source (BOM File) → Cache/Guard (parseQuestions) → Context (QuizContext) → Engine (QuizEngine/QuizCard) → Storage (LocalStorage)`。
  - **全自動驗證**：執行新增的整合測試套件，確保整條鏈路暢通。
  - **DoD**：所有 P1 級防禦點在端到端串連下 100% 正常運作，無漏網之魚。
  - **回滾**：若整合測試暴露問題，回溯至對應子模組微任務進行針對性修復。

- [ ] **5.2 全量品質閘門審計與文檔同步 (Quality Gate & DoD Audit)**
  - **依賴**：所有前置任務（1.1 ~ 5.1）。
  - **範圍**：
    - 執行 TypeScript 靜態編譯檢查：`npx tsc --noEmit`。
    - 執行代碼乾淨度審計：`npx knip --reporter compact`，確保 0 孤兒 export、0 未使用死代碼。
    - 執行全量單元測試：`npm test -- --run`，確保 100% 綠燈通過。
    - 執行生產打包構建：`npm run build`，確保 Vite + Tailwind 生產包建置順利。
    - 檢查代碼庫確認無 `any` 型別新增、無 `use-sound` 殘留、無測試 `.skip()` / `.only()` 繞過。
    - 同步更新 `docs/DEVELOPMENT_LOG.md` 與 `CHECKLIST.md`，並將本 `tasks.md` 所有項目標記為完成。
  - **全自動驗證**：
    ```powershell
    npx tsc --noEmit
    npx knip --reporter compact
    npm test -- --run
    npm run build
    Select-String -Path package.json,package-lock.json,components,hooks,services,utils,src,index.html -Pattern 'use-sound|\.skip\(|\.only\(' -AllMatches
    ```
  - **DoD**：全量命令零報錯退出，文檔狀態保持最新，OpenSpec ready to apply/archive。
  - **回滾**：若品質閘門失敗，依錯誤日誌精準修復，嚴禁放寬檢查標準。
