# Technical Design: P1 執行期防禦硬化與資料優化 (Final)

## Context

MindSpark 在完成 P0 核心體驗修復與安全隔離後，系統整體架構穩定度顯著提升。然而在底層架構、資源生命週期管理與資料邊界上，仍存在 4 項顯著的技術債與防禦缺陷（詳見 `docs/CODEBASE_REPORT_REVIEW.md`）：
1. **`BankManager.tsx` 檔案進出風險**：匯入解析缺少 UTF-8 BOM (`\uFEFF`) 前導清洗，Windows 記事本編輯之檔案匯入必拋出 `SyntaxError`；題庫匯出仍使用 `data:text/json;charset=utf-8,` Data URI 拼接 `encodeURIComponent`，大題庫極易超過瀏覽器 URL 上限並有 OOM 風險。
2. **音效架構雙軌分裂**：做題核心卡片 `QuizCard.tsx` 仍依賴過時的 `use-sound` 套件，且其靜音狀態孤立於本機 `useState(true)`，與戰鬥系統已統一的 Howler.js 單例及全域 `STORAGE_KEYS.SFX_ENABLED` 完全脫節。
3. **Storage 反序列化缺乏 Runtime Validation**：`services/storage.ts` 反序列化（特別是 `getQuestions`）盲目信任 `JSON.parse` 轉型，缺乏結構守衛。若遇 `options: null` 等損毀資料即引發未捕獲之 `null.map()` 或 `.join()` 白屏崩潰。
4. **深色模式首屏白閃 (FOUC)**：`index.html` 首頁缺少阻斷式主題識別腳本，深色樣式完全依賴 React 掛載後 `ThemeContext` 的 `useEffect` 異步寫入 `dark` 類別，造成首屏刺眼白閃。

本設計採「入口驗證、下游簡化、現有抽象重用」原則，全面消除技術債並構築防禦閉環。

---

## Goals / Non-Goals

**Goals:**
- **檔案處理耐久性**：在 `BankManager.tsx` 匯入時正則過濾 `\uFEFF+`，匯出轉向 `Blob` + `URL.createObjectURL`，並在 1000ms 延遲後調用 `URL.revokeObjectURL` 釋放記憶體。
- **音效架構單一化與全域靜音受控**：從專案依賴徹底拔除 `use-sound`，擴充 `useSoundEffects` 提供答對/答錯音效 `playQuizFeedback`，全面受控於 `STORAGE_KEYS.SFX_ENABLED`，並同步清理測試孤兒 Mock。
- **防禦性執行期驗證與資料隔離**：建立零額外套件負擔的 `utils/typeGuards.ts` 題目結構守衛（`isRecord`, `isQuestion`, `parseQuestions`），在 `getQuestions` 與題庫匯入時安全過濾隔離畸形題目，避免白屏並維持存量資料容錯。
- **首屏零白閃 (Zero-FOUC)**：在 `index.html` `<head>` 注入極簡防禦型 inline `<script>`，相容 CSP 與無痕模式，保證深色模式於 DOM 渲染前即刻生效。

**Non-Goals:**
- 不重構題庫 schema，不引入重型驗證套件（如 Zod、Yup、Valibot），維持既有 TypeScript Type Guard 輕量零負擔模式。
- 不新增任何未被生產代碼消費的孤兒端點（No Orphan APIs）。
- 不更動 Supabase 資料結構或進行後端架構重寫。
- 不執行破壞性存量資料清除或無通知刪庫。

---

## Decisions

### 1. UTF-8 BOM 清洗與 Blob Object URL 生命週期
- **決策**：
  - 匯入清洗：在 `components/BankManager.tsx` 的 `processJson(jsonString)` 入口，首先執行 `const sanitizedJson = jsonString.replace(/^\uFEFF+/, '');`，僅清洗開頭連續 BOM，不損壞題幹與選項內合法的 Unicode 字元。
  - 匯出耐久化：改用 `new Blob([JSON.stringify(currentQuestions, null, 2)], { type: 'application/json;charset=utf-8' })`，生成 Object URL 後模擬 `<a>` 標籤點擊下載，並透過 `setTimeout(() => URL.revokeObjectURL(url), 1000)` 延遲釋放。
- **替代方案與取捨**：
  - *Data URI 匯出*：代碼極簡，但現代瀏覽器對 Data URI URL 長度有 2MB~32MB 上限，千題匯出極易截斷或引發記憶體 OOM。
  - *立即同步 revokeObjectURL*：在觸發 `click()` 後立即 revoke，部分瀏覽器（Firefox / 舊版 WebKit）在非同步準備下載時會因 URL 已失效而下載失敗。1000ms 延遲釋放是工業界標準做法。

### 2. 徹底割除 `use-sound`，將答題音效收斂至 `useSoundEffects`
- **決策**：
  - 擴充 `hooks/useSoundEffects.ts` 的 `UseSoundEffectsReturn` 介面，導出 `playQuizFeedback: (result: 'correct' | 'wrong') => void`。
  - 內部維護 `/sounds/correct.mp3`（volume: 0.5）與 `/sounds/wrong.mp3`（volume: 0.3）之 Howler 單例，播放前嚴格檢查 `isSfxEnabled`；若為 `false` 則立即返回（no-op）。
  - `components/QuizCard.tsx` 移除 `import useSound` 與孤立的 `const [soundEnabled, setSoundEnabled] = useState(true)`，改為解構調用 `useSoundEffects().playQuizFeedback`。
  - 卸載依賴：從 `package.json` 與 `package-lock.json` 徹底移除 `use-sound`。
  - 測試清理：同步更新既有單元測試（`autoAdvance.test.tsx`、`remediateBypass.challenger.test.ts`），全面替換原先對 `use-sound` 的孤兒 mock，改為 mock `useSoundEffects`。
- **端到端消費閉環 (E2E Consumer Closure)**：
  - 新增之 `playQuizFeedback` 介面直接由 `QuizCard.tsx` 消費，無孤兒 API。
  - 刪除舊有未被消費的死代碼與孤兒 mock。
  - 相容性標註：`// ponytail: [Sunset: v2.0 - Howler.js 單例若未來重構為 Web Audio AudioContext 音訊節點圖，本 hook 介面將統一套用 AudioGraphManager]`。

### 3. 基於 Type Guard 的防禦性反序列化與全生命週期隔離
- **決策**：
  - 在 `utils/typeGuards.ts` 擴充守衛函式（入參均為 `unknown`，禁止 `any`）：
    - `isRecord(value: unknown): value is Record<string, unknown>`：排除 `null` 與陣列。
    - `isQuestion(value: unknown): value is Question`：嚴格校驗 `id`（string/number）、非空 `question`（string）、`options`（非空 string 陣列）、`answer`（非空 string 或非空 string 陣列）。
    - `parseQuestions(value: unknown, source: string): Question[]`：對陣列進行逐項驗證，合法者收錄，損毀者記錄 `console.warn('[QuestionGuard] Quarantined corrupted question', { source, index })` 並過濾剔除；若 root 非陣列則直接返回 `[]`。
  - 在 `services/storage.ts` 的 `getQuestions(bankId)` 中，將原先直接 cast 的語法替換為 `parseQuestions(JSON.parse(data), \`bank:\${bankId}\`)`。
  - 在 `components/BankManager.tsx` 的 `normalizeImportedQuestions` 中，不再僅檢查第一項，而是使用 `parseQuestions` 進行逐題防禦；若結果為空則阻止進入確認與寫入流程。
- **全生命週期數據流追溯 (Data Flow Tracing)**：
  ```mermaid
  flowchart LR
    A[檔案上傳/文字貼上] --> B[BOM清洗: sanitizeJson]
    B --> C[JSON.parse: unknown]
    C --> D[utils/typeGuards: parseQuestions]
    D --> E[BankManager: normalizeImportedQuestions]
    E --> F[planQuestionImport: 題目合併運算]
    F --> G[ConfirmDialog: 使用者確認]
    G --> H[repository.saveQuestions: 儲存至 Storage]
    H --> I[localStorage / Supabase]
    I --> J[services/storage: getQuestions]
    J --> D2[utils/typeGuards: parseQuestions]
    D2 --> K[QuizContext / Domain Hooks]
    K --> L[useQuizEngine / QuizCard / BattleArena]
  ```
  - **入口阻斷 (Source Barrier)**：損毀資料在 Import 與 Storage 反序列化兩大入口處即被截斷或安全降級。
  - **下游保護 (Downstream Immunity)**：下游 `QuizContext`、`useQuizEngine`、`QuizCard` 與 `BattleArena` 接收到的永遠是型別保證的合法 `Question[]`，彻底杜絕 `options.map()` 或 `options.join()` 白屏崩潰。

### 4. `<head>` 阻斷式主題初始化消除 FOUC
- **決策**：
  - 在 `index.html` 的 `<head>` 結尾（`</head>` 前）注入輕量級 inline `<script>`：
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
  - 符合現有 CSP：`script-src 'self' 'unsafe-inline'`。
  - 與 `contexts/ThemeContext.tsx` 狀態完美銜接：React mount 後由 `ThemeContext` 監聽系統變化與切換事件，無閃爍亦無衝突。

---

## Risks / Trade-offs

| 風險項目 | 影響評估 | 預防與緩解措施 (Mitigation) |
|:---|:---|:---|
| **[Risk 1] 存量歷史題庫可能缺少非核心可選欄位** | 若 guard 過於嚴格可能導致使用者正常題目被過濾 | `isQuestion` 僅將 `id`, `question`, `options`, `answer` 設為必要，其餘 `hint`, `explanation`, `tags`, `type` 設為可選容錯。 |
| **[Risk 2] Blob Object URL 在極端瀏覽器下載中斷** | 若過早 revoke 可能導致下載失敗 | 採 1000ms 延遲 `setTimeout` 釋放，兼顧記憶體回收與非同步下載啟動。 |
| **[Risk 3] 無痕模式存取 localStorage 拋出 SecurityError** | 阻斷首屏載入導致整個 HTML 崩潰 | inline `<script>` 嚴格以 `try-catch` 包裹，存取失敗時降級使用 OS 偏好或預設 light。 |
| **[Risk 4] Howler 在無音效硬體或測試環境拋錯** | 造成做題流程被中斷 | `useSoundEffects` 內部所有播放呼叫皆以 `try-catch` 包裹，播放失敗僅 `console.warn`，不阻礙答題狀態流轉。 |

---

## Migration & Rollback Strategy

### 遷移步驟 (Migration Plan)
1. **階段 1 (型別與守衛)**：於 `utils/typeGuards.ts` 實作守衛並撰寫單元測試驗證邊界。
2. **階段 2 (資料層接軌)**：於 `services/storage.ts` 接管 `getQuestions`，在 `BankManager.tsx` 加入 BOM 清洗與 Blob 匯出。
3. **階段 3 (音效收斂)**：擴充 `useSoundEffects` 導出 `playQuizFeedback`，改造 `QuizCard.tsx`，移除 `use-sound` 依賴與測試孤兒 Mock。
4. **階段 4 (FOUC 消除)**：在 `index.html` 注入阻斷腳本，驗證深色切換無閃爍。
5. **階段 5 (品質閘門與閉環)**：執行全量 `tsc`、`knip`、單元測試與構建。

### 回滾策略 (Rollback Strategy)
- 本次重構完全向後相容，不牽涉 Supabase schema 變更或 LocalStorage 破壞性重構。
- 若任一模組出現未預期回歸，可獨立透過 Git revert 該模組之變更，各模組之間具備低耦合隔離性：
  - BOM/Blob 異常：可獨立回退 `BankManager.tsx`。
  - 音效異常：可先將 `playQuizFeedback` 內部設為 no-op，不影響做題流程。
  - FOUC 異常：可直接移除 `index.html` 中的 inline `<script>`，系統將自動回退至 React `ThemeContext` 原生行為。

---

## Design ↔ Tasks 雙向覆蓋核查表

| 設計模組與決策點 | 對應任務 ID | 覆蓋狀態 |
|:---|:---:|:---:|
| 1.1 BOM 清洗 (`processJson` 正則清洗 `\uFEFF+`) | 2.1 | ✅ 100% 覆蓋 |
| 1.2 Blob 匯出與 1000ms 延遲 Revocation | 2.2 | ✅ 100% 覆蓋 |
| 2.1 `useSoundEffects` 導出 `playQuizFeedback` | 3.1 | ✅ 100% 覆蓋 |
| 2.2 `QuizCard` 廢除孤立 state 接入全域 SFX | 3.2 | ✅ 100% 覆蓋 |
| 2.3 拔除 `use-sound` 依賴與測試孤兒 Mock | 3.3 | ✅ 100% 覆蓋 |
| 3.1 `utils/typeGuards.ts` 擴充 `isQuestion` 等 | 1.1 | ✅ 100% 覆蓋 |
| 3.2 `services/storage.ts` `getQuestions` 接入驗證與隔離 | 1.2 | ✅ 100% 覆蓋 |
| 3.3 `BankManager.tsx` 題庫匯入逐題校驗與入口阻斷 | 1.3 | ✅ 100% 覆蓋 |
| 4.1 `index.html` 注入防禦型 FOUC inline `<script>` | 4.1 | ✅ 100% 覆蓋 |
| 4.2 `ThemeContext.tsx` 與 inline script 狀態對齊驗證 | 4.2 | ✅ 100% 覆蓋 |
| 5.1 全生命週期數據流防禦整合驗證 | 5.1 | ✅ 100% 覆蓋 |
| 5.2 全量品質閘門審計 (TSC, Knip, Vitest, Build) | 5.2 | ✅ 100% 覆蓋 |
