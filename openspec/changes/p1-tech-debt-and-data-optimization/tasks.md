## 1. JSON Runtime Validation 與安全降級 (Core / Storage)

- [ ] 1.1 擴充 `utils/typeGuards.ts` 實作題目結構守衛函式 `isValidQuestion(value: unknown): value is Question` 與陣列驗證，嚴格檢查 `id`、非空 `question`、`options` 字串陣列與 `answer` 格式。**DoD/驗證**：新增單元測試覆蓋合法題、`options: null`、非字串選項、缺少 question、缺少 answer 等畸形資料。
- [ ] 1.2 改造 `services/storage.ts` 的 `getQuestions(bankId)`：以 `isValidQuestion` 逐項校驗反序列化資料，對檢測出之殘缺題目執行過濾並發出 `console.warn` 隔離，杜絕 `null.map()` 白屏。**DoD/驗證**：單元測試驗證存量損毀題目被隔離降級、有效題目全數保留、非陣列/完全損毀 JSON 回傳空陣列 `[]`。
- [ ] 1.3 強化 `components/BankManager.tsx` 的 `normalizeImportedQuestions`：將原本僅檢查首題的粗篩改為全陣列逐題結構守衛，確保匯入資料入口處阻斷。**DoD/驗證**：單元測試驗證匯入包含畸形題目的資料時安全防禦。

## 2. UTF-8 BOM 清洗與 Blob 匯出記憶體生命週期 (Import/Export)

- [ ] 2.1 在 `components/BankManager.tsx` 的 `processJson` 加入前導 BOM 清洗（`jsonString.replace(/^\uFEFF/, '')`）。**DoD/驗證**：新增單元測試傳入包含 `\uFEFF` 前導字元的題庫 JSON 字串，斷言 `JSON.parse` 順利解析無 `SyntaxError`。
- [ ] 2.2 改造 `components/BankManager.tsx` 的 `handleExport`：廢除 Data URI，改用 `new Blob(...)` 與 `URL.createObjectURL` 觸發下載，並在觸發後以 `setTimeout(..., 1000)` 調用 `URL.revokeObjectURL` 釋放記憶體。**DoD/驗證**：單元測試斷言建立合法 Blob、調用 `createObjectURL` 與 `revokeObjectURL`，且不包含 `data:text/json` 舊協定。

## 3. 音效架構統一至 Howler.js 與 `use-sound` 依賴拔除 (Audio Unification)

- [ ] 3.1 擴充 `hooks/useSoundEffects.ts`：在 `UseSoundEffectsReturn` 介面導出 `playCorrect` 與 `playWrong`，內部維護 `/sounds/correct.mp3` 與 `/sounds/wrong.mp3` 之 Howler 單例，並在播放前嚴格檢查 `isSfxEnabled` 靜音設定。**DoD/驗證**：單元測試驗證 `isSfxEnabled=false` 時答題音效靜音（no-op），`isSfxEnabled=true` 時觸發 Howl play。
- [ ] 3.2 改造 `components/QuizCard.tsx`：移除 `import useSound` 與孤立的 `const [soundEnabled] = useState(true)`，改為解構 `useSoundEffects` 的 `playCorrect` 與 `playWrong`。**DoD/驗證**：單元測試驗證答對與答錯時正確調用音效介面。
- [ ] 3.3 拔除 `package.json` 中的 `"use-sound"` 依賴並更新測試 Mock：更新 `src/__tests__/autoAdvance.test.tsx` 與 `src/__tests__/remediateBypass.challenger.test.ts`，清除所有 `use-sound` 孤兒參照並改為對齊 Howler。**DoD/驗證**：`npm test` 綠燈通過且專案依賴無 `use-sound`。

## 4. 深色模式 FOUC 阻斷式預載腳本 (Theme FOUC)

- [ ] 4.1 在 `index.html` 的 `<head>` 區塊注入阻斷式 inline `<script>`：同步讀取 `localStorage.getItem('mindspark_theme')`，支援 `dark`、`light`、`system`（`window.matchMedia`），以 `try-catch` 包裹防護無痕模式例外，在 DOM 渲染前為 `documentElement` 加入 `dark` class。**DoD/驗證**：新增單元測試模擬各主題設定與無痕模式例外，驗證 `dark` class 正確切換。
- [ ] 4.2 驗證 `ThemeContext.tsx` 與 inline script 狀態對齊：確保在 React 掛載後切換主題或監聽系統變更時，class 與 localStorage 保持同步無衝突。**DoD/驗證**：既有主題切換測試全數通過。

## 5. 品質閘門驗證與回滾檢查 (Quality Gates)

- [ ] 5.1 靜態型別與死代碼審計：執行 `npx tsc --noEmit` 與 `npx knip`，確保 0 型別錯誤、0 孤兒未消費代碼。
- [ ] 5.2 全量單元測試回歸：執行 `npm test -- --run`，確保全專案測試 100% 綠燈通過。
- [ ] 5.3 生產打包構建驗證：執行 `npm run build`，驗證生產環境順利編譯。
