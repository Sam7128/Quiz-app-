# Proposal: P1 執行期防禦硬化與資料優化 (Final)

## Why

根據 `docs/CODEBASE_REPORT_REVIEW.md` 獨立第三方審查報告，MindSpark 在完成 P0 核心體驗修復後，仍存在 4 項具體的 P1 級底層技術債與防禦架構缺陷：
1. **UTF-8 BOM 清洗缺位與 Data URI 匯出極限**：
   - 證據：`components/BankManager.tsx:329` 直接對字串執行 `JSON.parse(jsonString)`，Windows 記事本產生的前導 Byte Order Mark (`\uFEFF`) 會直接觸發 `SyntaxError` 導致匯入失敗。
   - 證據：`components/BankManager.tsx:370` 使用 `data:text/json;charset=utf-8,` 拼接 `encodeURIComponent(JSON.stringify(...))`，大型題庫（如數百題至千題）會因超出瀏覽器 URL 長度上限（2MB~32MB）而被截斷，並造成大量記憶體開銷。
2. **音效雙軌分裂與全域靜音脫節**：
   - 證據：`components/QuizCard.tsx:3` 仍依賴額外的 `use-sound` 套件，且在第 63 行維護孤立的 `const [soundEnabled, setSoundEnabled] = useState(true)`。
   - 證據：全域音效系統已在 `hooks/useSoundEffects.ts` 統一由 Howler.js 管理並由 `STORAGE_KEYS.SFX_ENABLED` 控制。QuizCard 脫節導致使用者在全域設定關閉音效後，做題依然發出答題提示音。
   - 證據：`package.json` 仍依賴 `use-sound`，且 `src/__tests__/autoAdvance.test.tsx` 與 `src/__tests__/remediateBypass.challenger.test.ts` 存在孤兒 mock。
3. **JSON Runtime Validation 缺失與白屏崩潰風險**：
   - 證據：`services/storage.ts:555-561` 的 `getQuestions` 將 `JSON.parse` 結果直接 cast 為 `Question[]`，缺乏結構守衛。一旦儲存資料缺損（例如 `options` 為 `null` 或非字串），下游執行 `.map()` 或 `.join()` 時將引發未捕獲錯誤致白屏崩潰。
   - 證據：`utils/typeGuards.ts` 僅有 `isMultipleAnswer`，缺少題目執行期結構守衛；`components/BankManager.tsx:215-226` 的 `normalizeImportedQuestions` 僅粗略檢查首題，無法阻擋陣列中途的畸形題目。
4. **深色模式首屏白閃 (FOUC)**：
   - 證據：`index.html` 的 `<head>` 缺乏阻斷式主題初始化腳本，`contexts/ThemeContext.tsx:20-50` 依賴 React 掛載後的 `useEffect` 異步寫入 `dark` 類別。夜間模式使用者在 1.3MB JS bundle 解析前必直視白底頁面，造成視覺白閃。

本變更旨在執行一次性底層技術債割除、健全邊界守衛、全面統一音效依賴至 Howler、保障大題庫進出無損、並徹底消除首屏 FOUC。

## What Changes

- **UTF-8 BOM 清洗與 Blob 匯出耐久化**：
  - 在 `components/BankManager.tsx` 的 `processJson` 入口加入正則清洗 `jsonString.replace(/^\uFEFF+/, '')`，確保合法 Windows BOM 題庫無痛匯入。
  - 將題庫匯出由 Data URI 改寫為 `new Blob([JSON.stringify(...)], { type: 'application/json;charset=utf-8' })`，透過 `URL.createObjectURL(blob)` 建立下載連結，並在觸發下載後延遲 1000ms 調用 `URL.revokeObjectURL(url)` 釋放記憶體，兼顧非同步下載啟動相容性與防 OOM。
- **音效架構統一至 Howler.js 並拔除 `use-sound`**：
  - 擴充 `hooks/useSoundEffects.ts` 的 `UseSoundEffectsReturn` 介面，導出 `playQuizFeedback: (result: 'correct' | 'wrong') => void`，內部維護 `/sounds/correct.mp3` 與 `/sounds/wrong.mp3` 之 Howler 單例，強制受控於全域 `STORAGE_KEYS.SFX_ENABLED` 設定。
  - 改造 `components/QuizCard.tsx`：移除 `import useSound` 與孤立的 `const [soundEnabled, setSoundEnabled] = useState(true)`，改為解構調用 `useSoundEffects().playQuizFeedback`。
  - 從 `package.json` 中徹底拔除 `use-sound` 依賴與鎖檔節點，並清理既有單元測試（`autoAdvance.test.tsx`、`remediateBypass.challenger.test.ts`）中的 `vi.mock('use-sound')`。
- **JSON 反序列化執行期結構驗證與安全降級**：
  - 擴充 `utils/typeGuards.ts`，新增 `isRecord`、`isQuestion` 與安全集合解析器 `parseQuestions(value: unknown, source: string): Question[]`，嚴格校驗 `id`、非空 `question`、非空字串陣列 `options` 與合法的 `answer`。
  - 改造 `services/storage.ts` 的 `getQuestions`：以 `parseQuestions` 逐項校驗反序列化資料，對檢測出之殘缺畸形題目採「安全過濾 + `console.warn` 隔離」策略，杜絕 `null.map()` 白屏，避免單題損毀造成整庫蒸發。
  - 改造 `components/BankManager.tsx` 的 `normalizeImportedQuestions`，落實全陣列逐題結構守衛，若整批無任何有效題目則中止匯入並阻斷寫入。
- **深色模式 FOUC 阻斷式預載腳本**：
  - 在 `index.html` 的 `<head>` 區塊注入極簡防禦型 inline `<script>`，在 DOM 與 CSS 渲染前同步讀取 `localStorage.getItem('mindspark_theme')`，支援 `dark`、`light` 及 `system`（透過 `window.matchMedia`），立即為 `<html>` 加入或移除 `dark` 類別。
  - 腳本內以 `try-catch` 包裹防護無痕瀏覽模式或 LocalStorage 存取受限例外，完全相容既有 CSP 規範，且後續由 `ThemeContext.tsx` 無縫接管。

## Capabilities

### New Capabilities
- `theme-fouc-prevention`: 規範頁面載入前之 `<head>` 阻斷式主題識別與無閃爍初始化機制，涵蓋 LocalStorage 安全讀取、系統偏好判定、CSP 相容性與例外降級。

### Modified Capabilities
- `audio-resource-lifecycle`: 擴充音效資源生命週期規範，明確廢除 `use-sound` 套件，將 `QuizCard` 答對/答錯音效全面統一收斂至 Howler.js 音效控制器，並強制受控於全域 SFX 靜音開關。
- `client-data-integrity`: 擴充客戶端資料完整性規範，新增題庫資料讀取（Storage）與匯入（Import）之執行期 Type Guard 結構防禦要求（防 `null.map()`）、UTF-8 BOM 清洗要求、以及 Blob 匯出 Object URL 記憶體全生命週期釋放規範。

## Impact

- **依賴管理 (package.json / package-lock.json)**：
  - 徹底移除 `"use-sound"` 依賴。
- **元件與 Hooks**：
  - `components/QuizCard.tsx`：移除 `useSound`，接入 `useSoundEffects`，刪除孤立 `soundEnabled` state。
  - `components/BankManager.tsx`：`processJson` 增加 BOM 清洗，`handleExport` 改用 `Blob` + `URL.createObjectURL` + 延遲 `URL.revokeObjectURL`，`normalizeImportedQuestions` 增加逐題驗證。
  - `hooks/useSoundEffects.ts`：導出 `playQuizFeedback`，連動 `isSfxEnabled`，生命週期統一。
  - `services/storage.ts`：`getQuestions` 接入執行期型別守衛與安全過濾隔離。
  - `utils/typeGuards.ts`：新增 `isRecord`、`isQuestion`、`parseQuestions`。
- **HTML 入口 (index.html)**：
  - 在 `<head>` 注入阻斷式主題初始化 inline `<script>`。
- **測試套件**：
  - 更新 `src/__tests__/autoAdvance.test.tsx` 與 `src/__tests__/remediateBypass.challenger.test.ts`。
  - 新增針對 BOM 清洗、Blob 匯出、損毀 JSON 降級過濾、以及 Theme FOUC 腳本邏輯之單元測試。
