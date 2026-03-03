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
