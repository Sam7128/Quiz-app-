## Why

MindSpark 完成 P0 與 P1 第一階段（學習體驗與統計閉環）後，系統仍遺留 4 項 P1 級底層技術債與防禦性架構缺陷，影響檔案匯入匯出耐久度、音訊資源架構統一性、資料反序列化防禦以及夜間使用體驗：

1. **UTF-8 BOM 清洗缺位與 Data URI 匯出極限**：Windows 記事本編輯儲存的題庫檔案帶有 `\uFEFF` 前導 Byte Order Mark，匯入直接傳入 `JSON.parse` 必引發 `SyntaxError` 崩潰；同時題庫匯出仍使用 `data:text/json;charset=utf-8,` Data URI 配合 `encodeURIComponent`，在題庫較大時易觸發瀏覽器 URL 長度截斷或記憶體 OOM。
2. **音效雙軌分裂與全域靜音脫節**：戰鬥系統已統一使用 Howler.js 單例管線，但核心做題元件 `QuizCard.tsx` 仍單獨依賴已過時的 `use-sound` 套件，且其音效開關寫死於元件內部孤立的 `useState(true)`，導致使用者在全域設定關閉音效後，做題依然發出答題提示音，破壞靜音一致性。
3. **Storage 反序列化缺乏 Runtime Validation**：`services/storage.ts` 反序列化（特別是 `getQuestions`）直接盲目信任 `JSON.parse` 轉型為目標型別。一旦本機資料有缺損或欄位異常（例如 `options` 為 `null` 或未定義），下游在執行 `.map()` 或 `.join()` 時將引發未捕獲錯誤致整個頁面白屏崩潰。
4. **深色模式首屏白閃 (FOUC)**：`index.html` 首頁 `<head>` 缺乏阻斷式主題初始化腳本，深色樣式完全依賴 React 掛載後 `ThemeContext` 的 `useEffect` 異步寫入 `dark` 類別，在 1.3MB 的 JS Bundle 下載解析前，夜間使用者必先直視白底頁面，造成刺眼的視覺閃爍。

本變更旨在進行一次性底層技術債割除、健全邊界守衛、全面統一音效依賴至 Howler、保障大題庫進出無損、並徹底消除首屏 FOUC。

## What Changes

- **UTF-8 BOM 清洗與 Blob 匯出耐久化**：
  - 在 `BankManager.tsx` 的 `processJson` 入口加入正則清洗 `jsonString.replace(/^\uFEFF/, '')`，確保合法 Windows BOM 題庫無痛匯入。
  - 將題庫匯出由 Data URI 改寫為 `new Blob([jsonStr], { type: 'application/json;charset=utf-8' })`，並透過 `URL.createObjectURL(blob)` 建立下載連結，下載後以 `setTimeout` / 微任務調用 `URL.revokeObjectURL(url)` 釋放記憶體，杜絕 OOM 與 URL 溢出。
- **音效架構統一至 Howler.js 並拔除 `use-sound`**：
  - 從 `package.json` 中徹底移除 `use-sound` 依賴。
  - `QuizCard.tsx` 廢除本地孤立的 `useState(true)` 音效開關，改用 `useSoundEffects` 導出之答題音效或整合介面，全面受控於 `STORAGE_KEYS.SFX_ENABLED` 全域設定。
  - 既有單元測試（`autoAdvance.test.tsx`、`remediateBypass.challenger.test.ts`）同步移除 `vi.mock('use-sound')`，對齊 Howler 單例測試規範。
- **JSON 反序列化執行期結構驗證與安全降級**：
  - 擴充 `utils/typeGuards.ts`，新增 `isQuestion` 與 `validateQuestionsArray` 等防禦性驗證器，嚴格確保 `question` 為非空字串、`options` 為合法字串陣列、`answer` 格式合法。
  - 在 `services/storage.ts` 的 `getQuestions` 加入執行期校驗：對於檢測出之殘缺畸形題目，採「過濾隔離並輸出 `console.warn`」策略，杜絕 `null.map()` 白屏，同時避免單題損毀導致整庫蒸發。
  - 在 `BankManager.tsx` 的 `normalizeImportedQuestions` 中落實全題目陣列的逐項結構守衛。
- **深色模式 FOUC 阻斷式預載腳本**：
  - 在 `index.html` 的 `<head>` 區塊注入極簡 inline `<script>`，在 DOM 與 CSS 渲染前同步讀取 `localStorage.getItem('mindspark_theme')`，支援 `dark`、`light` 及 `system`（`window.matchMedia`），立即為 `<html>` 加入 `dark` 類別。
  - 加入 `try-catch` 包裹防護，杜絕無痕瀏覽模式存取 Storage 拋出例外破壞載入，並維持現有 CSP 安全規範相容。

## Capabilities

### New Capabilities
- `theme-fouc-prevention`: 規範頁面載入前之 `<head>` 阻斷式主題識別與無閃爍初始化機制，涵蓋 LocalStorage 安全讀取、系統偏好判定、CSP 相容性與例外降級。

### Modified Capabilities
- `audio-resource-lifecycle`: 擴充音效資源生命週期規範，明確廢除 `use-sound` 套件，將 `QuizCard` 答對/答錯音效全面統一收斂至 Howler.js 音效控制器，並強制受控於全域 SFX 靜音開關。
- `client-data-integrity`: 擴充客戶端資料完整性規範，新增題庫資料讀取（Storage）與匯入（Import）之執行期 Type Guard 結構防禦要求（防 `null.map()`）、UTF-8 BOM 清洗要求、以及 Blob 匯出 Object URL 記憶體全生命週期釋放規範。

## Impact

- **依賴管理 (package.json)**：
  - 移除 `"use-sound": "^5.0.0"`。
- **組件與 Hooks**：
  - `components/QuizCard.tsx`：移除 `useSound`，接入 `useSoundEffects`，刪除孤立 `soundEnabled` state。
  - `components/BankManager.tsx`：`processJson` 增加 BOM 清洗，`handleExport` 改用 `Blob` + `URL.createObjectURL` + `URL.revokeObjectURL`，`normalizeImportedQuestions` 增加逐題驗證。
  - `hooks/useSoundEffects.ts`：導出或支援答題音效播放（`playCorrect` / `playWrong`）或整合提示音，連動 `isSfxEnabled`。
  - `services/storage.ts`：`getQuestions` 接入執行期型別守衛與安全過濾隔離。
  - `utils/typeGuards.ts`：新增題目結構驗證與字串陣列守衛函式。
- **HTML 入口 (index.html)**：
  - 在 `<head>` 加入符合 CSP 的深色模式阻斷 inline script。
- **測試套件**：
  - 更新 `src/__tests__/autoAdvance.test.tsx` 與 `src/__tests__/remediateBypass.challenger.test.ts`。
  - 新增針對 BOM 清洗、Blob 匯出、損毀 JSON 降級過濾、以及 Theme FOUC 腳本邏輯之單元測試。
