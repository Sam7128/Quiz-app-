# P1 資料完整性與執行期防禦硬化

## Why

`docs/CODEBASE_REPORT_REVIEW.md` 已確認幾項 P1 風險仍存在於現行程式碼：題庫匯入對 UTF-8 BOM 不具韌性、題庫匯出使用 Data URI 造成大型資料的字串與 URL 壓力、測驗音效仍與 Howler 雙軌、localStorage JSON 反序列化只捕捉語法錯誤而不驗證資料結構，以及 ThemeProvider 只能在 React effect 後套用 dark class。這些問題共同影響資料可攜性、記憶體穩定性、全域設定一致性與首屏可靠性。

本變更將四項問題收斂為一個可獨立驗證的 P1 基礎硬化工作，沿用既有 `services/`、`hooks/`、`utils/` 與元件邊界，不引入新的資料庫 schema、音訊抽象層或重量級驗證套件。

## 問題與證據

1. **匯入／匯出資料路徑**
   - `components/BankManager.tsx:327-330` 直接對讀入字串執行 `JSON.parse(jsonString)`，前導 `\uFEFF` 會在解析前造成失敗。
   - `components/BankManager.tsx:357-363` 使用 `data:text/json;charset=utf-8,` 加 `encodeURIComponent(JSON.stringify(...))`，大型題庫會同時建立大型編碼字串並受瀏覽器 URL 限制。
2. **音效雙軌**
   - `components/QuizCard.tsx:3` 匯入 `use-sound`，`components/QuizCard.tsx:164-165` 建立獨立的 `soundEnabled` 播放器。
   - `hooks/useSoundEffects.ts:2,127-132` 已具備 Howler 與 `STORAGE_KEYS.SFX_ENABLED`，但 QuizCard 未消費該全域 Hook。
   - `package.json:37` 與 `package-lock.json` 仍保留 `use-sound`；`src/__tests__/autoAdvance.test.tsx:8-10`、`src/__tests__/remediateBypass.challenger.test.ts:24-26` 保留孤兒 mock。
3. **JSON runtime validation**
   - `services/storage.ts:555-560` 的 `getQuestions` 將 `JSON.parse` 結果直接宣告為 `Question[]`，陣列成員與 `options`、`answer` 等必要欄位未在邊界驗證。
   - `utils/typeGuards.ts:1-9` 目前只有 `isMultipleAnswer`，沒有可供 storage 與匯入共用的題目結構守衛。
   - `components/BankManager.tsx:329-330` 依賴 `normalizeImportedQuestions`，但缺乏明確的「逐題過濾、警告、空結果安全」契約。
4. **Dark mode FOUC**
   - `index.html:47-50` 直接載入 root；`contexts/ThemeContext.tsx:21-45` 在 React `useEffect` 才套用 `dark` class。
   - `services/storage.ts:32` 已有 `STORAGE_KEYS.THEME = 'mindspark_theme'`，因此 inline bootstrap 必須與此 key 及 `light/dark/system` 語意一致。

## What Changes

- 在題庫匯入解析前移除連續前導 BOM，題目 runtime validation 集中於 `utils/typeGuards.ts`（包含選項與答案包容性校驗及數值 `id: 0` 相容）；無效題目 `console.warn`（上限 5 則後聚合）隔離跳過，無有效題目不寫入題庫。
- 在 `getQuestions` 讀取與 `saveQuestions` 寫入雙向邊界共用嚴格但輕量的 `Question` guard；破損資料只回傳或持久化安全的有效題目子集，更新題庫 metadata 時計數與有效長度精確對齊。
- 使用 `Blob` + `URL.createObjectURL` 匯出 JSON，觸發下載後延遲 1000ms 呼叫 `URL.revokeObjectURL` 釋放記憶體，並加上連點防抖，不改變檔名與 JSON schema。
- 將 QuizCard 答對／答錯提示音接到 `useSoundEffects` 的 Howler 常駐單例路徑與全域 SFX 開關，移除 `use-sound` 套件、測試 mock 與 lockfile 殘留。
- 在 `index.html` head 注入防禦型 inline bootstrap：讀取 `mindspark_theme`，只接受 `light/dark/system`，以 `matchMedia` 決定 system，並以 try/catch 容忍無痕模式或 localStorage 受限情境。

## Goals

- 大型題庫匯出不依賴 Data URI 或超長 URL。
- Windows UTF-8 BOM 題庫可正常匯入。
- 所有題目 JSON 邊界均先驗證，再進入 import merge、storage cache、quiz engine 與 repository 消費鏈。
- QuizCard 與戰鬥音效共用同一個 Howler/SFX 設定來源。
- 首次 paint 前已套用正確的 dark class，且 React ThemeProvider 後續狀態仍可接管。
- 保留既有合法資料、匯入模式、題目 ID 與 localStorage key 相容性。

## Non-Goals

- 不重寫題庫 schema、不遷移 localStorage 至 IndexedDB。
- 不新增 AI、Supabase API 或新的後端 endpoint。
- 不重新設計 Howler 全域 singleton；僅擴充既有 `useSoundEffects` 的 consumer contract。
- 不刪除無效歷史資料；只在讀取與匯入邊界安全隔離，避免破壞性資料清理。
- 不以修改既有測試斷言或 skip 測試來通過驗證。

## Blast Radius

- **直接模組**：`components/BankManager.tsx`、`components/QuizCard.tsx`、`hooks/useSoundEffects.ts`、`services/storage.ts`、`utils/typeGuards.ts`、`index.html`、`package.json`、`package-lock.json`。
- **測試模組**：音效 mock、題庫匯入／storage guard 測試、FOUC bootstrap 的 DOM／CLI 檢測。
- **下游資料流**：檔案／貼上文字 → BOM 清洗與題目 guard → `normalizeImportedQuestions`／import plan → repository save → localStorage/Supabase；localStorage bank JSON → `getQuestions` guard → context/hooks → quiz/battle engine。入口阻斷後，下游只收到合法 `Question[]`，不需每個 UI 重新防守。
- **風險隔離**：無效題目逐題 warn 並跳過（超過 5 則自動聚合摘要）；整批無有效題目則拒絕寫入；部分損毀匯入時 UI 提示成功與略過題數；音效載入或播放失敗維持靜音降級；URL revoke 放在延遲 1000ms 定時器並具備連點防抖；theme bootstrap 所有 storage／matchMedia 存取皆 try/catch。

## Acceptance Criteria

- `use-sound` 不再出現在 source、test、`package.json` 或 `package-lock.json`。
- BOM、非陣列、缺欄位、`options: null`、錯誤 answer shape 均有測試且不會造成 render 崩潰。
- `getQuestions` 對損毀資料回傳有效題目子集或 `[]`，並輸出可定位的 `console.warn`。
- 匯出測試確認建立 Blob URL、觸發下載、呼叫 `URL.revokeObjectURL`。
- inline theme bootstrap 對 light/dark/system、無效值、storage 例外與 matchMedia 例外有自動化驗證。
- `npx tsc --noEmit`、`npm test`、`npm run build`、`npx knip --reporter compact` 通過，且不新增 `any`。
