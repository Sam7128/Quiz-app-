你是驗證官（Verifier）。請使用你的搜索工具（grep_search, view_file 等）去檢查專案 codebase，逐一驗證這些任務 (tasks.md) 與規格 (specs.md) 是否都已經被正確且完整地實作出來，並產出詳細的審查報告 (CRITICAL, WARNING, SUGGESTION)。

🧪 偵測到壓力測試 artifacts。驗證範圍將擴展至壓力測試覆蓋。請額外檢查：
1. HIGH 風險 issues 是否被處理
2. P0 測試案例是否有覆蓋

以下為變更相關文件內容：

# proposal.md

## Why

好友分享題庫功能存在嚴重的數據完整性缺陷：收到的題庫最初顯示正確題數（40 題），但返回首頁後變為 0 題空題庫。Console 顯示 403 Forbidden 錯誤，根因是 RLS 政策阻擋了使用來源使用者之題目 UUID 的 upsert 操作。同時，Dashboard 在不同裝置上存在多個 UX 問題：暗黑模式下滑鼠懸浮選項變白導致文字消失、手機版無法開啟系統設定、平板電腦無法看到題庫操作按鈕（直接開始/分享/移動），以及大量 AbortError console 噪音。

## What Changes

- **修復分享題庫 RLS 403 問題**：在 `utils/uuid.ts` 建立 `generateUUID()` 工具函數（優先使用 `crypto.randomUUID()`，在非安全環境時 fallback 到 `crypto.getRandomValues()` RFC4122 權注），並在 `Social.tsx` 的 `handleAcceptBank` 中使用此函數為每一題的 `id` 產生全新的 UUID，避免寫入另一使用者擁有之題目 ID 觸發 Supabase RLS 拒絕。
- **修復暗黑模式懸浮反白問題**：在 `QuizCard.tsx` 或相關元件中，為暗黑模式下的懸浮背景與文字添加明確的 `dark:hover:` 樣式，確保對比度。
- **修復手機版「設定」按鈕消失**：在 `MobileNav.tsx` 新增系統設定入口，或在手機版頁首獨立顯示齒輪按鈕。
- **修復平板電腦題庫操作按鈕不可見**：將 Dashboard 題庫卡片上的「直接開始」「分享」「移動」按鈕從純 `group-hover:opacity-100` 改為在觸控裝置上始終可見，僅在桌面端使用 hover 隱藏效果。
- **抑制 AbortError console 噪音**：在 Dashboard 載入邏輯及相關 hooks 中，於 catch 區塊中辨別 AbortError 並靜默處理。

## Capabilities

### New Capabilities
- `touch-device-ux`: 觸控裝置 UX 適配，確保所有交互元素在觸控裝置上可存取，不依賴 hover 狀態。

### Modified Capabilities
- `social-sharing`: 修復 Bank Acceptance 需求 — 接收的題庫必須使用全新 UUID 來避免 RLS 衝突。

## Impact

- **受影響檔案**：`components/Social.tsx`, `components/Dashboard.tsx`, `components/MobileNav.tsx`, `components/AppContent.tsx`, `components/QuizCard.tsx`, `hooks/useStreak.ts`, `hooks/useStudyStats.ts`, `hooks/useAchievements.ts`, `utils/uuid.ts` (新建), `utils/isAbortError.ts` (新建)
- **資料庫**：無 schema 變更，僅修正客戶端行為以符合現有 RLS 政策。
- **破壞性變更**：無。

# design.md

## Context

MindSpark 是一個 React (Vite + TypeScript + Tailwind CSS) 的單頁應用程式，支援 Local Guest 模式和 Supabase 雲端模式。目前存在以下跨裝置/跨模組的 UX 與數據完整性缺陷：

1. **好友分享題庫空白 (403 RLS)**：`Social.tsx` 的 `handleAcceptBank` 使用原始題目 UUID 呼叫 `repository.saveQuestions()`，觸發 Supabase `questions` 表的 RLS（要求 `bank.user_id = auth.uid()`），因為新銀行的 `user_id` 是收件人，但題目 ID 是發送者原有的，Upsert 操作會被拒絕返回 403，題目未入庫。
2. **暗黑模式懸浮反白**：`QuizCard.tsx` 標準模式的未作答選項 hover 樣式缺少 `dark:` 變體；`hover:bg-brand-50` 在暗黑模式產生淺色背景配深色文字。
3. **手機版設定按鈕消失**：`AppHeader.tsx` 的設定齒輪按鈕在 `hidden md:flex` 區塊內；`MobileNav.tsx` 僅呈現首頁、管理、社交、指引四個入口。
4. **平板觸控裝置操作按鈕隱形**：Dashboard 題庫卡片的「直接開始」「分享」「移動」按鈕使用 `opacity-0 group-hover/card:opacity-100`，觸控裝置無法觸發 hover 狀態。手機因為點擊 (tap) 某些瀏覽器會模擬 hover 所以有效，但平板電腦不會。
5. **AbortError console 噪音**：多個 hooks (`useStreak`, `useStudyStats`, `useAchievements`) 及 `Dashboard.tsx` 的 `loadDueCount` 在元件卸載時被中止的 Promise 觸發 `AbortError`，未被優雅處理。

**相關 RLS 政策（`supabase_schema.sql`）**：
```sql
create policy "Users can insert questions to own banks." on questions
  for insert with check (
    exists ( select 1 from banks where banks.id = questions.bank_id and banks.user_id = auth.uid() )
  );
```
意即題目 upsert 時，`bank_id` 對應的 `banks.user_id` 必須等於登入使用者的 `auth.uid()`。收件人建立新 bank 後，該 bank 的 `user_id` = 收件人，所以只要題目 ID 不衝突就能插入——但目前 `normalizeToUuid()` 會將原始 ID **保留**，導致理論上的 ID 衝突問題。更關鍵的是，console 顯示的 403 可能來自 `saveCloudQuestions` 的 upsert 嘗試寫入已存在於發送者 bank 下的 ID。

## Goals / Non-Goals

**Goals:**
- ✅ 修復好友分享題庫 403 錯誤，確保收件人接收的題庫在返回首頁後仍保留所有題目
- ✅ 修復暗黑模式下 QuizCard 選項懸浮狀態的可讀性問題
- ✅ 在手機版底部導覽列新增「設定」入口
- ✅ 修復平板電腦上 Dashboard 題庫卡片操作按鈕不可見的問題
- ✅ 靜默處理元件卸載時的 AbortError，減少 console 噪音

**Non-Goals:**
- ❌ 修改 Supabase RLS 政策（保持現有安全架構不變）
- ❌ 新增全域觸控檢測框架
- ❌ 重構 Repository 架構

## Decisions

### D1: 分享接收時全面重新生成 UUID（含安全環境 Fallback）

**選擇**：在 `utils/uuid.ts` 中建立 `generateUUID()` 工具函數，優先使用 `crypto.randomUUID()`，但若在 HTTP（非安全）環境下此 API 不可用，則降級使用 `crypto.getRandomValues()` + RFC4122 格式自行建構 UUID。在 `Social.tsx` 的 `handleAcceptBank` 中改用此函式。
**替代方案**：
- A) 直接呼叫 `crypto.randomUUID()` 不帶 fallback——在 HTTP 開發環境或內網測試環境下會 crash，為 CRITICAL 風險。
- B) 修改 RLS 政策允許寫入——安全風險，違反最小權限原則。
- C) 在 `saveCloudQuestions` 中自動 re-map ID——太底層，可能影響非分享場景。
**理由**：Consumer 端重新生成 ID 是最安全且隔離度最高的方式，帶有 fallback 確保在任何執行環境下都能正常工作。

**已知限制**（源自 ISSUE-002）：重新生成 UUID 後，副本題目 ID 與原始 Bank 完全無關聯，未來無法自動合併更新。此為「副本」而非「同步」語意，可接受。

### D2: 使用 CSS `@media (pointer: fine)` 精確匹配具有精確指標的設備

**選擇**：使用 Tailwind 的任意值語法 `[@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-hover/card:opacity-100` 設定按鈕可見性，並同時添加 `focus-within:opacity-100` 以支援鍵盤導航可及性。
**替代方案**：
- A) 使用 `md:opacity-0` 斷點——CRITICAL 問題：Tailwind `md` = 768px，標準 iPad 直立模式剛好是 768px，會觸發斷點隱藏按鈕，但 iPad 無法 hover，導致按鈕完全消失。
- B) JavaScript 觸控檢測 (`ontouchstart` in window)——不可靠，因為許多筆電同時支援觸控和滑鼠。
- C) 在行動端使用長按 (long-press) 選單——UX 太隱晦，使用者無法發現。
**理由**：`@media (pointer: fine)` 是 W3C Level 4 Media Features 標準，精確匹配「有精確滑鼠的設備」。iPad 和觸控板設備不觸發此條件，確保按鈕在觸控設備上始終可見。同時 `focus-within:opacity-100` 解決鍵盤無障礙問題。

### D3: MobileNav 新增設定觸發入口

**選擇**：接受 `onOpenSettings` callback，在 MobileNav 中新增第五個 icon。
**替代方案**：
- A) 浮動齒輪按鈕——會遮擋內容，與現有設計風格不符。
- B) 在手機版 AppHeader 獨立顯示齒輪——AppHeader 手機版空間有限。
**理由**：MobileNav 已有四個項目，加入第五個（設定）符合常見行動應用模式。

### D4: 暗黑模式 QuizCard 選項修復策略

**選擇**：為 Standard Mode 未作答選項補充 `dark:` hover 變體：`dark:border-slate-600 dark:hover:border-brand-400 dark:hover:bg-brand-900/20 dark:text-slate-200`。同時為已選取的多選選項補充暗黑模式樣式。
**替代方案**：
- A) 使用 CSS 變數統一管理——改動太大，不符合本次 bugfix 範疇。
**理由**：最小侵入性修復，直接對症下藥。

### D5: AbortError 靜默處理（寬鬆型別判別）

**選擇**：在所有受影響 hooks 的 `catch` 區塊中使用 `isAbortError()` 輔助函數，判別邏輯為 `error instanceof Error && error.name === 'AbortError'`。
**替代方案**：
- A) `instanceof DOMException` 判別——太嚴格，Supabase 的 node-fetch 封裝和部分 polyfill 可能抛出 `{ name: 'AbortError' }` 但非 DOMException 實例的物件，導致無法靜默真正的 AbortError。
- B) 使用全域 AbortController + cleanup——需要重構所有 hooks 的 useEffect 加入 signal 傳遞，改動面太大。
**理由**：`instanceof Error` 更寬鬆，同時仍然通過 `name === 'AbortError'` 確保只靜默中止類錯誤，其他類型的錯誤（如 `Error('Network timeout')`）仍然正常報錯。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| D2: `[@media(pointer:fine)]` 在 Surface 等 Windows 觸控板上可能被識別為 fine pointer | 可接受：按鈕沾附效果依然存在 hover，只是在這類設備行為更接近桌面端 |
| D1: 重新生成 UUID 後，題目 ID 與原始 bank 的 ID 完全不同，無法自動合併更新 | 符合預期：這是「副本」而非「同步」模式，已明確文件化 |
| D1: HTTP（非 HTTPS）環境下 fallback UUID 生成的品質略低於 crypto.randomUUID() | 可接受：僅影響非生產環境，UUID 唯一性仍然充分 |
| D3: MobileNav 五個 icon 可能略擁擠 | 五個 icon 是行動應用常見配置 (如 Instagram、微信) |
| D5: `instanceof Error` 比 `instanceof DOMException` 更寬鬆，可能靜默非 AbortError 的 Error | 已有 `name === 'AbortError'` 的第二層過濾，其他錯誤名稱仍會報錯 |

# tasks.md

## 1. 修復好友分享題庫 RLS 403 問題

- [x] 1.1 在 `components/Social.tsx` 的 `handleAcceptBank` 函數中，為每一題的 `id` 產生全新的 UUID，使用帶有 fallback 的共用工具函數以兼容非 HTTPS 環境
  - **檔案**: `utils/uuid.ts` (新建或更新)
  - **修改內容 (uuid.ts)**: `export const generateUUID = (): string => { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); const buf = new Uint8Array(16); (crypto || window.crypto).getRandomValues(buf); buf[6] = (buf[6] & 0x0f) | 0x40; buf[8] = (buf[8] & 0x3f) | 0x80; return [...buf].map((b, i) => ([4,6,8,10].includes(i)?'-':'') + b.toString(16).padStart(2,'0')).join(''); };`
  - **修改內容 (Social.tsx)**: 將 question map 改為 `const normalized = questions.map((q) => ({ ...q, id: generateUUID() }));`
  - **完成標準**: 修改後，接收分享題庫後返回首頁，題庫顯示正確題數（非 0 題）；console 不再出現 403 Forbidden 錯誤；在 HTTP 環境下 generateUUID 不崩潰
  - **自動驗證**: `npx tsc --noEmit` 通過；`npm run build` 無錯誤

- [x] 1.2 在 `components/Social.tsx` 的 `handleAcceptBank` 函數中，若 `saveQuestions` 失敗，必須回滾刪除剛建立的空題庫
  - **檔案**: `components/Social.tsx`
  - **修改內容**: 在 saveQuestions 的 catch 區塊中加入 `await repository.deleteBank(newBank.id);`，並顯示失敗 Toast
  - **完成標準**: 若網路中斷導致 saveQuestions 失敗，首頁不會出現 0 題的孤立題庫
  - **自動驗證**: `npx tsc --noEmit` 通過

## 2. 修復暗黑模式 QuizCard 選項可讀性

- [x] 2.1 為 `QuizCard.tsx` 的 `getOptionClass` 函數中 Standard Mode 未作答選項添加 `dark:` hover 變體
  - **檔案**: `components/QuizCard.tsx` (第 240-241 行)
  - **修改內容**: 將 `return \`${standardBase} border-slate-200 hover:border-brand-500 hover:bg-brand-50 hover:shadow-md\`;` 改為 `return \`${standardBase} border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:border-brand-500 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:shadow-md\`;`
  - **完成標準**: 暗黑模式下，滑鼠懸浮未作答選項時，背景為深色（非白色），文字清晰可見
  - **自動驗證**: `npx tsc --noEmit` 通過；`npm run build` 無錯誤

- [x] 2.2 為 Standard Mode 多選已選取選項添加 `dark:` 變體
  - **檔案**: `components/QuizCard.tsx` (第 238-239 行)
  - **修改內容**: 將 `return \`${standardBase} border-brand-500 bg-brand-50 text-brand-900 shadow-sm\`;` 改為 `return \`${standardBase} border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-900/30 text-brand-900 dark:text-brand-100 shadow-sm\`;`
  - **完成標準**: 暗黑模式下，多選已勾選選項背景為深色且文字可讀
  - **自動驗證**: `npx tsc --noEmit` 通過

- [x] 2.3 為 Standard Mode 已作答後的未選中選項添加 `dark:` 變體
  - **檔案**: `components/QuizCard.tsx` (第 251 行)
  - **修改內容**: 將 `return \`${standardBase} border-slate-100 text-slate-400 opacity-60\`;` 改為 `return \`${standardBase} border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60\`;`
  - **完成標準**: 暗黑模式下，已作答後未選中的選項灰化效果正常
  - **自動驗證**: `npx tsc --noEmit` 通過

- [x] 2.4 為 Standard Mode 正確答案和錯誤答案添加 `dark:` 變體
  - **檔案**: `components/QuizCard.tsx` (第 244 行, 第 248 行)
  - **修改內容 (正確)**: `return \`${standardBase} border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 ring-1 ring-green-500\`;`
  - **修改內容 (錯誤)**: `return \`${standardBase} border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300\`;`
  - **完成標準**: 暗黑模式下，正確/錯誤答案的背景和文字顏色均清晰
  - **自動驗證**: `npx tsc --noEmit` 通過

## 3. 修復手機版設定按鈕消失

- [x] 3.1 更新 `MobileNav.tsx` 介面，接受 `onOpenSettings` callback，並使用型別安全的方式插入設定導覽項
  - **檔案**: `components/MobileNav.tsx`
  - **修改內容**: 
    1. 定義聯合型別 `type NavItem = { id: AppView; label: string; icon: LucideIcon } | { id: '__settings__'; label: string; icon: LucideIcon; isAction: true }`
    2. 在 NAV_ITEMS 中插入 `{ id: '__settings__' as const, label: '設定', icon: Settings, isAction: true }`（位於管理和社交之間）
    3. 在點擊事件中：`if ('isAction' in item) { onOpenSettings(); } else { onNavigate(item.id); }`
    4. 在 `MobileNavProps` 新增 `onOpenSettings: () => void`
  - **完成標準**: 手機版底部導覽列顯示 5 個項目（首頁、管理、設定、社交、指引），點擊設定可開啟設定面板；`npx tsc --noEmit` 無任何 `as any` 或型別錯誤
  - **自動驗證**: `npx tsc --noEmit` 通過

- [x] 3.2 更新 `AppContent.tsx` 傳遞 `onOpenSettings` 給 MobileNav
  - **檔案**: `components/AppContent.tsx`
  - **修改內容**: 在 MobileNav 元件上新增 `onOpenSettings` prop，傳入 `() => actions.dispatch({ type: 'set_settings_open', isSettingsOpen: true })`
  - **完成標準**: MobileNav 的設定按鈕點擊後能成功開啟 Settings 面板
  - **自動驗證**: `npx tsc --noEmit` 通過；`npm run build` 無錯誤

## 4. 修復平板電腦題庫操作按鈕不可見

- [x] 4.1 修改 Dashboard 題庫卡片操作按鈕的可見性策略，使用 CSS `pointer: fine` 媒體查詢而非純斷點寬度
  - **檔案**: `components/Dashboard.tsx` (第 371 行)
  - **修改內容**: 將操作按鈕 wrapper 樣式從 `opacity-0 group-hover/card:opacity-100 transition-all duration-200 translate-x-2 group-hover/card:translate-x-0` 改為使用 Tailwind 自訂 `[@media(pointer:fine)]:opacity-0 [@media(pointer:fine)]:group-hover/card:opacity-100 [@media(pointer:fine)]:translate-x-2 [@media(pointer:fine)]:group-hover/card:translate-x-0 opacity-100 focus-within:opacity-100 transition-all duration-200`
  - **理由**: `@media(pointer:fine)` 精確匹配「有精確滑鼠的設備」，iPad 和觸控板不觸發此條件，按鈕預設可見；同時加入 `focus-within:opacity-100` 確保鍵盤使用者透過 Tab 鍵 focus 時也能看到按鈕
  - **完成標準**: iPad 上按鈕永遠可見可點擊；桌面滑鼠 hover 才顯示；Tab 鍵 Focus 時可見
  - **自動驗證**: `npx tsc --noEmit` 通過；`npm run build` 無錯誤

## 5. 抑制 AbortError Console 噪音

- [x] 5.1 建立 `utils/isAbortError.ts` 共用判別函數（使用寬鬆的 instanceof Error 判斷)
  - **檔案**: `utils/isAbortError.ts` (新建)
  - **修改內容**: 建立 `export const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';`
  - **理由**: `instanceof DOMException` 太嚴格，Supabase 網路封裝層可能拋出 `name === 'AbortError'` 的普通 Error 物件；使用 `instanceof Error` 更寬鬆且正確
  - **完成標準**: 函數可正確判別 DOMException AbortError 和 Generic Error AbortError
  - **自動驗證**: `npx tsc --noEmit` 通過

- [x] 5.2 在 `hooks/useStreak.ts` 的 `fetchStreak` catch 區塊中靜默 AbortError
  - **檔案**: `hooks/useStreak.ts` (第 27-28 行)
  - **修改內容**: 在 catch 區塊開頭加入 `if (isAbortError(error)) return;`
  - **完成標準**: 元件卸載時不再出現 `Error fetching streak: AbortError` console 訊息
  - **自動驗證**: `npx tsc --noEmit` 通過

- [x] 5.3 在 `hooks/useStudyStats.ts` 的 `fetchStats` catch 區塊中靜默 AbortError
  - **檔案**: `hooks/useStudyStats.ts` (第 28-29 行)
  - **修改內容**: 在 catch 區塊開頭加入 `if (isAbortError(error)) return;`
  - **完成標準**: 元件卸載時不再出現 `Error fetching study stats: AbortError` console 訊息
  - **自動驗證**: `npx tsc --noEmit` 通過

- [x] 5.4 在 `hooks/useAchievements.ts` 的 `fetchAchievements` catch 區塊中靜默 AbortError
  - **檔案**: `hooks/useAchievements.ts` (第 22-23 行)
  - **修改內容**: 在 catch 區塊開頭加入 `if (isAbortError(error)) return;`
  - **完成標準**: 元件卸載時不再出現 `Error fetching achievements: AbortError` console 訊息
  - **自動驗證**: `npx tsc --noEmit` 通過

- [x] 5.5 在 `components/Dashboard.tsx` 的 `loadDueCount` catch 區塊中靜默 AbortError
  - **檔案**: `components/Dashboard.tsx` (第 77-78 行)
  - **修改內容**: 在 catch 區塊開頭加入 `if (isAbortError(error)) return;`
  - **完成標準**: 元件卸載時不再出現 `Error loading spaced repetition data: AbortError` console 訊息
  - **自動驗證**: `npx tsc --noEmit` 通過

## 6. 全域驗證

- [x] 6.1 執行 TypeScript 類型檢查：`npx tsc --noEmit`，確保無型別錯誤
- [x] 6.2 執行生產建置：`npm run build`，確保無建置錯誤
- [x] 6.3 啟動開發伺服器 `npm run dev`，確認首頁可正常載入，console 無 AbortError
- [x] 6.4 [Integration 驗證] 測試分享接收流程：模擬 User A 分享 → User B 接收 → 返回首頁 → 確認題庫題數正確，console 無 403 錯誤
- [x] 6.5 [A11y 驗證] 使用 Tab 鍵在 Dashboard 操作按鈕上移動，確認 focus 時按鈕可見（非 opacity-0 狀態）
- [x] 6.6 [裝置驗證] 在瀏覽器的 DevTools 切換至 Tablet 模擬器，確認「直接開始」「分享」「移動」按鈕在無 hover 時仍然可見

# stress-test-report.md

# Plan Stress Test Report

## Section A: Stress Test Issues

### [ISSUE-001] Category: Edge Case
- **Affected Step**: 1.1 在 `components/Social.tsx` 的 `handleAcceptBank` 函數中替換 UUID
- **Problem**: `crypto.randomUUID()` API requires a secure context (HTTPS or localhost). If the app is run on an unsecured HTTP network (e.g. testing on a local IP address over Wi-Fi without SSL), `crypto.randomUUID` will be undefined, causing a fatal crash when accepting a shared bank.
- **Risk Level**: HIGH
- **Suggested Addition**: Add a fallback UUID generator or a check: `id: window.crypto?.randomUUID ? crypto.randomUUID() : fallbackGenerateUUID()`

### [ISSUE-002] Category: Architecture
- **Affected Step**: 1.1 替換為全新 UUID
- **Problem**: While `crypto.randomUUID()` avoids RLS 403, generating new UUIDs severs the linkage to the original Bank. If User A updates the shared bank later and re-shares it, there is no way for User B to merge updates—it will just create another full copy with a new set of UUIDs, bloating the database.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Document this limitation explicitly in the proposal/design, or store the `original_question_id` as metadata during the copy operation to enable future deduplication/merging.

### [ISSUE-003] Category: Logic Gap
- **Affected Step**: 2.1 - 2.4 QuizCard 樣式修改
- **Problem**: The tasks add `hover:` states for Dark Mode but completely miss `:focus-visible` or `:focus` states. Keyboard navigation users (Tab key) in Dark Mode will experience the same contrast/readability issues because the focus state is not styled for Dark Mode.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Append `dark:focus-visible:bg-brand-900/20` and corresponding focus styles everywhere `hover:` is introduced.

### [ISSUE-004] Category: Edge Case
- **Affected Step**: 2.3 已作答後的未選中選項 `dark:` 變體
- **Problem**: `opacity-60` combined with `dark:text-slate-500` on a dark background might drop the contrast ratio below WCAG AA requirements (4.5:1), making it completely illegible for visually impaired users in dark mode.
- **Risk Level**: LOW
- **Suggested Addition**: Verify the actual contrast ratio of the resulting color and consider using `opacity-80` or `dark:text-slate-400` instead.

### [ISSUE-005] Category: Missing Detail
- **Affected Step**: 3.1 & 3.2 MobileNav 新增設定觸發入口
- **Problem**: The `AppContent` passes `onOpenSettings` down to `MobileNav`, which triggers setting modal open. However, clicking this does not explicitly close the MobileNav drawer if it's in a collapsed state, nor does it establish correct ARIA Focus trapping for the newly opened Settings Modal overlay coming from a mobile context.
- **Risk Level**: LOW
- **Suggested Addition**: Ensure `onOpenSettings` execution also handles blurring the active element to prevent virtual keyboard popup issues.

### [ISSUE-006] Category: Assumption Risk
- **Affected Step**: 4.1 修改 Dashboard 題庫卡片操作按鈕的可見性策略
- **Problem**: The `md` breakpoint in Tailwind is precisely `768px`. Many common tablets (e.g., standard iPad) operate in portrait mode at exactly `768px` wide. Because they hit the `md:` breakpoint, they will adopt the `md:opacity-0` behavior, hiding the buttons. Since they are touch devices, they still cannot trigger `hover`, rendering the buttons inaccessible.
- **Risk Level**: HIGH
- **Suggested Addition**: Use the `lg:` breakpoint (1024px) instead of `md:` for hover-only visibility, or combine it with a `pointer: fine` media query strategy as originally discussed in Design D2 (but missed in the task implementation).

### [ISSUE-007] Category: Logic Gap
- **Affected Step**: 4.1 按鈕的可見性策略
- **Problem**: Keyboard accessibility is compromised. By setting `md:opacity-0` and only relying on `md:group-hover`, keyboard users tabbing through elements on desktop will focus on the hidden buttons, but the buttons will remain invisible (`opacity-0`).
- **Risk Level**: MEDIUM
- **Suggested Addition**: Add `focus-within:opacity-100` alongside `group-hover/card:opacity-100` to ensure keyboard focus reveals the action area.

### [ISSUE-008] Category: Logic Gap
- **Affected Step**: 5.1 建立 `utils/isAbortError.ts`
- **Problem**: The implementation `error instanceof DOMException` is too strict. Some network polyfills or wrappers (including some Supabase node-fetch fallbacks) throw generic Error objects where `.name === 'AbortError'`, failing the `instanceof DOMException` check.
- **Risk Level**: MEDIUM
- **Suggested Addition**: Relax the check to `return error instanceof Error && error.name === 'AbortError'`.

### [ISSUE-009] Category: Architecture
- **Affected Step**: 5.2 - 5.5 `try/catch` 靜默處理
- **Problem**: Placing `if (isAbortError(error)) return;` at the absolute top of the `catch` block bypasses any error tracking or APM telemetry that might be monitoring the application. While it rightfully suppresses console noise, it completely blinds systemic monitoring to request cancellation volumes, which is an important metric for rendering performance (too many cancellations = thrashing).
- **Risk Level**: LOW
- **Suggested Addition**: Ensure that `AbortError` is skipped for user-facing toasts and logs, but optionally tracked in debug/telemetry if APM is later installed.

---

## Section B: Test Matrix

### Module: Social Sharing (RLS 403 Fix)

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | UUID Generation on Accept | valid shared bank questions | `saveQuestions` called with newly generated UUIDs | P0 |
| 2 | UUID Secure Context Fallback | `crypto.randomUUID` is undefined | falls back to manual hex string generation | P1 |
| 3 | Question Count Persistence | valid shared bank payload | New bank metadata `questionCount` matches payload length | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | End-to-End Bank Sharing | `ShareModal`, `Social`, `CloudStorage` | User A shares, User B clicks accept, User B sees bank in Dashboard, no 403 in console |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Accepting an empty bank (0 questions) | Prevents array mapping errors | `map` iterates 0 times, creating empty bank successfully |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Network disconnect during Accept | Wireless connection drops post UUID generation | Show failure Toast, do not create corrupted local bank |

#### Expected Outcomes
- Bank successfully duplicates into receiver's repository without triggering Supabase RLS policies.
- No `403 Forbidden` messages in console.

### Module: Dark Mode QuizCard

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Hover Unanswered Option Dark Mode | `isAnswered: false`, hover event | Background changes to `brand-900/20`, text `slate-200` | P0 |
| 2 | Selected Multiple Choice Dark Mode | `isSelected: true`, `isMultiple: true` | Background changes to `brand-900/30`, text `brand-100` | P0 |
| 3 | Unselected Answered Option Dark Mode | `isAnswered: true`, `isSelected: false` | Opacity dims, text is `slate-500`, border `slate-700` | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Theme Toggle during Active Quiz | `ThemeContext`, `QuizCard` | Classes seamlessly transition to dark modifiers without layout shift |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Keyboard Focus Navigation | Accessibility | `focus-visible` classes provide same visual feedback as `hover` in dark mode |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Theme unresolvable (OS default vs App preference) | OS toggles theme | Component immediately applies CSS variables for active theme |

#### Expected Outcomes
- Dark mode quiz options maintain minimum WCAG contrast ratios of 4.5:1.
- No "white-on-white" text disappearance.

### Module: Mobile Settings Nav

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Five Items Rendering | `MobileNavProps` | Component renders exactly 5 items using flex distribution | P0 |
| 2 | Click triggers onOpenSettings | click on settings icon | `onOpenSettings` callback fires | P0 |
| 3 | Styling on active state | nav item matching active view | Highlights specific standard icon, Settings does not falsely highlight | P1 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Settings Modal Opening from Nav | `MobileNav`, `AppContent`, `GlobalModals` | Tapping gear icon dispatches GlobalModal open action for Settings |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Very narrow screen devices (e.g. iPhone SE) | 5 icons might crowd and overlap | Flex containers scale icons/font down or use hidden text labels |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Rapid consecutive clicks | User taps gear 5 times fast | Modal opens only once, state does not rapidly toggle open/closed |

#### Expected Outcomes
- Mobile users have clear, immediate access to App Settings.
- 5 items fit symmetrically on screens 320px and wider.

### Module: Tablet Action Buttons

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | Mobile View Button Visibility | Window width < 768px | Element classes include `opacity-100`, lacks `opacity-0` base | P0 |
| 2 | Desktop View Default Visibility | Window width >= 1024px | Element classes show `md:opacity-0` | P0 |
| 3 | Desktop View Hover Visibility | Window width >= 1024px + MouseEnter | `md:group-hover/card:opacity-100` triggers | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Dynamic Resize | `Dashboard`, Window Resizer | Buttons transition from hidden to visible immediately crossing breakpoint threshold |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | iPad Portrait (768px Width) | Exact match of `md` tailwind breakpoint | Using `lg` or `@media(pointer: fine)` ensures buttons remain visible on tablets |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | CSS parsing failures in older browsers | PostCSS pipeline issue | Buttons default to `opacity-100` as a safe fallback |

#### Expected Outcomes
- Touch devices without fine pointer capability display action buttons constantly.
- Desktop users experience clean UI with hover revelation.

### Module: AbortError Silence

#### Unit Test Cases (minimum 3)
| # | Test Name | Input | Expected Output | Priority |
|---|-----------|-------|----------------|----------|
| 1 | isAbortError validation (DOMException) | `new DOMException('mock', 'AbortError')` | returns `true` | P0 |
| 2 | isAbortError validation (Standard Error) | `new Error('AbortError')` | returns `false` (or `true` if issue-008 is addressed) | P0 |
| 3 | Non-Abort Error passed through | `new Error('Network Failed')` | `isAbortError` returns `false` | P0 |

#### Integration Test Scenarios
| # | Scenario | Components Involved | Expected Behavior |
|---|----------|--------------------|--------------------|
| 1 | Dashboard Strict Mode Unmount | `Dashboard`, `React.StrictMode` | First network call aborted, caught silently, second call succeeds |

#### Edge Cases
| # | Edge Case | Why It Matters | Expected Handling |
|---|-----------|---------------|-------------------|
| 1 | Loading state cleanup | Finally block execution | `setLoading(false)` always executes even if catch returns early |

#### Error/Failure Scenarios
| # | Failure | Trigger Condition | Expected Recovery |
|---|---------|-------------------|-------------------|
| 1 | Real network timeout throwing Abort | Fetch times out (Not a manual cancel) | Caught by `isAbortError`, but potentially masks a real timeout issue |

#### Expected Outcomes
- Console runs perfectly clean during rapid navigation through dashboard, settings, and social views.
- No `throw` leaks causing Unhandled Promise Rejections.

# benchmark-harness.md

# Benchmark Harness Specification

## Section 1: Performance Baselines

### Module: Social Sharing (RLS 403 Fix)
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| UUID Mapping | Small (N=10) | <2ms | <5ms | <10ms | <1 MB | >1,000 ops/sec |
| UUID Mapping | Medium (N=100) | <10ms | <20ms | <30ms | <2 MB | >500 ops/sec |
| UUID Mapping | Large (N=1000) | <50ms | <80ms | <100ms | <5 MB | >100 ops/sec |
| UUID Mapping | Stress (N=10000) | [ASSUMPTION] <250ms | [ASSUMPTION] <400ms | [ASSUMPTION] <600ms| <20 MB | >10 ops/sec |

### Module: Dark Mode QuizCard
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Hover Render | Standard UI Event | <16ms (1 frame) | <16ms | <32ms (2 frames)| negligible | 60 FPS repaints |
| Theme Toggle | Context Update | <50ms | <80ms | <120ms | negligible | N/A |

### Module: Mobile Settings Nav
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Modal Open | Click Event | <40ms | <80ms | <120ms | <2 MB | instantaneous display |
| Layout Calc | 5-item Flex | <5ms | <10ms | <20ms | negligible | 60 FPS |

### Module: Tablet Action Buttons
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Resize Event | Breakpoint Crossing | <30ms | <60ms | <100ms | negligible | 60 FPS (resize debounce) |
| List Render | 50 Bank Cards | <80ms | <150ms | <250ms | <10 MB | Initial load |

### Module: AbortError Silence
| Operation | Input Profile | p50 Latency | p95 Latency | p99 Latency | Memory Limit | Throughput Target |
|-----------|--------------|-------------|-------------|-------------|-------------|------------------|
| Exception Catch | Single Throw | <1ms | <2ms | <5ms | negligible | >10,000 ops/sec |
| Rapid Mount | Switch Views 10x/sec | [ASSUMPTION] <100ms/mount | [ASSUMPTION] <200ms | <300ms | Stable Heap (Garbage Collects aborted requests) | N/A |

---

## Section 2: Benchmark Test Scenarios

| Scenario | Duration | Load Pattern | Success Criteria |
|----------|----------|-------------|-----------------|
| Normal Load | 5 min | Steady state (1 bank accept/sec) | All p95 < thresholds; clean console |
| Peak Load | 2 min | 3x normal (3 bank accepts/sec) | No crashes, UI unblocked, degradation < 50% |
| Sustained Load | 30 min | Steady state (Theme toggle loops) | No memory leaks, CSS parse time stable |
| Spike Test | 1 min | 0 → Max DOM Mounts → 0 | Fast GC recovery, memory returns to baseline < 5s |
| Failure Recovery | 5 min | Disconnect internet during accepts | Toast errors show; no corrupted broken state |

---

## Section 3: Benchmark Harness Setup

**Tooling Requirements**:
- `Lighthouse` / `Chrome DevTools Profiler` for rendering pipeline benchmarks.
- `Vitest` with native performance hooks (`performance.now()`) for synchronous UUID generation loops.

**Data Seeding**:
- Generate `mock_shared_bank.json` containing exactly 10,000 synthetic questions to stress test the UUID generation loops.

**Execution Commands (PowerShell)**:
```powershell
# 1. Test UUID mapping raw throughput
npx vitest run test/performance/uuid_mapping.bench.ts

# 2. Test rendering pipeline (simulating device widths via Playwright)
npx playwright test test/e2e/responsive_visibility.spec.ts --project=mobile
npx playwright test test/e2e/responsive_visibility.spec.ts --project=tablet
```

**Interpretation Rules**:
- **Pass**: All median (`p50`) metrics fall below target latency; RAM ceiling is unbroken.
- **Fail**: A metric exceeds the `p99` threshold on >1% of runs, indicating jitter or blocking thread operations.

---

## Section 4: Regression Gate

| Module | Regression Threshold | Rationale |
|--------|---------------------|-----------|
| Social Sharing (RLS Fix) | `>50ms` per 100 questions | Map parsing and UUID generation is purely CPU bound; high bounds indicate memory thrashing or massive GC pauses. |
| Dark Mode QuizCard | Framerate drops `< 55fps` | Hover interactions must be buttery smooth; Layout recalculations from missing CSS bounds block the main thread. |
| Mobile Settings Nav | TTI (Time to Interactive) `>300ms` | Tapping settings should feel native and instantaneous. |
| Tablet Action Buttons | LCP shift `>0.1` CLS | Changing opacity visibility rules must not induce Cumulative Layout Shifts pushing content down. |
| AbortError Silence | Memory baseline `+10MB` drift | Retained promises or unbound AbortControllers manifest as slow memory leaks over repeated navigations. |
