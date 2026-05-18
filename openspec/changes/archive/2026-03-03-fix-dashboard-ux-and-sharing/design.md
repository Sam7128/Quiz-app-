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
