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
