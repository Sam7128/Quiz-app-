## Context

MindSpark 是一個 React + Vite + TypeScript 的純前端學習助手應用，使用 localStorage (Guest) / Supabase (Auth) 雙軌架構。2026-02-15 深度審計揭露了多個關鍵問題，涵蓋測試基礎設施、業務邏輯競態、雲端資料一致性、安全性、和架構耦合。

### 當前架構約束
- **無後端伺服器**: 所有邏輯在瀏覽器端執行，API Key 必然存在客戶端
- **Repository Pattern**: `IStorageRepository` 統一了 `LocalStorageRepository` / `CloudStorageRepository` 的資料存取
- **Service Layer (部分)**: `services/challenges.ts` 等已遵循 service layer，但 Social/Share 尚未遷移
- **DB**: Supabase with RLS, `questions.id` 為 `uuid default gen_random_uuid()`
- **程式碼位置**: App code (components, services, hooks, contexts) 全在專案 root；`src/` 目錄僅含 `__tests__/` 和少量遺留檔案

## Goals / Non-Goals

**Goals:**
- 修復所有 P0 問題：測試門檻恢復、Quiz 競態消除、雲端 ID 穩定
- 修復所有 P1 問題：Challenge 判斷、createBank 錯誤處理、NVIDIA prod 提示、API Key 安全、Service Layer 遷移
- 清理 P2 遺留問題：目錄清理、key registry 統一
- 補齊 DB 層缺漏：RLS policy、RPC 安全性

**Non-Goals:**
- 不引入後端伺服器 (API Key 完全代管超出範圍)
- 不遷移歷史雲端資料 (已斷裂的 question ID 無法自動恢復)
- 不重構整體 routing 或 state management 架構
- 不處理 ESLint 全部 83 個問題 (只解決本次修復觸及的檔案)

## Decisions

### D1: startQuiz 接受明確 bankIds 參數 (非 useEffect 監聽)

**選擇**: 新增 `overrideBankIds?: string[]` 參數

**替代方案**: useEffect 監聽 selectedQuizBankIds 變更後啟動 → 被拒絕，因為會引入額外的非同步流程且可能產生意外的多次啟動

**理由**: 最小侵入，不改變現有流程，只增加一個 escape hatch

### D2: saveCloudQuestions 從 delete+insert 改為 upsert + 差集刪除

**選擇**: `supabase.upsert(toUpsert, { onConflict: 'id' })` + 刪除同 bank_id 下不在新 id 清單中的舊題

**替代方案 A**: 新增 `client_id` 欄位 → 被拒絕，需要 schema migration 且增加複雜度
**替代方案 B**: 只用 upsert 不刪除 → 被拒絕，使用者刪題後雲端殘留

**前提**:
- 所有題目建立路徑必須確保帶有穩定 UUID ID (`crypto.randomUUID()`)
- **非 UUID 的 id (數字、短字串等) 必須在進雲端前正規化為 UUID**，否則 Supabase `questions.id` (uuid type) 會拒絕
- PostgREST `not.in` 對 uuid 陣列格式敏感，需用 `(uuid1,uuid2,...)` 格式

### D3: API Key 安全 — 提供不持久化模式而非強制後端代管

**選擇**: `AIConfig.persist?: boolean`，false 時只存 sessionStorage

**理由**: 保持純前端架構，同時為安全敏感使用者提供選項。完全解決需後端代理，超出範圍。

### D4: Social Service Layer 抽離

**選擇**: 新增 `services/socialService.ts`，從 component 中抽離 Supabase 操作

**理由**: 遵循既有 `challenges.ts` 的模式，統一架構

### D5: Challenge 完成判斷 — 使用 null 區分未提交

**選擇**: `otherScore !== null && otherScore !== undefined`

**前提**:
- DB 的 `challenger_score` / `opponent_score` 預設值必須為 `null` 而非 `0`
- **既有資料 migration**: 所有 `status IN ('pending', 'active')` 且 score = 0 的 records 必須更新為 `NULL`，否則新邏輯會把舊初始值 0 誤判為「已提交 0 分」導致提早結算

### D6: localStorage Key 集中管理

**選擇**: 擴充現有 `STORAGE_KEYS` + 可選的 `utils/localStorage.ts` helper

### D7: Alias 統一為 root-based (方案 A)

**選擇**: `@` → `.` (專案根目錄)，因為主程式碼全在 root

**替代方案 B**: 把所有 app code 搬到 `src/` → 被拒絕，改動量遠超修復範圍

**同步修改**: Vite、Vitest、tsconfig 三處 alias 必須一致指向 root

### D8: ESLint 門檻修復

**選擇**: 安裝/修正 `eslint-plugin-react-hooks` 配置 + 新增 `npm run lint` script

**非目標**: 不一次修完全部 83 個 lint 問題，只修 config 層面錯誤和本次修改觸及的檔案

### D9: API Key sessionStorage 安全限制聲明

**選擇**: 在 UI 和文件中明確聲明 sessionStorage 模式仍非真正安全

**說明**: sessionStorage 防止關閉瀏覽器後 key 殘留，但無法防禦同頁面 XSS 攻擊。長期安全解法需後端 proxy 或短期 token，超出本次範圍

**替代方案**: Zustand persist → 被拒絕，引入新依賴超出修復範圍

## Risks / Trade-offs

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| upsert 改動影響現有雲端題目 | 舊資料的 question_progress 仍指向已失效 ID | 已知限制，文件說明；未來可提供手動清理工具 |
| 非 UUID id 匯入後 upsert 失敗 | 題目無法上雲 | 匯入/建立時正規化所有 id 為 UUID |
| PostgREST `not.in` 格式錯誤 | 差集刪除失敗或誤刪 | 單元測試覆蓋刪除邏輯；注意 uuid 格式引號 |
| Social Service Layer 重構範圍大 | 可能引入新 bug | 分 PR 進行，先 Social.tsx 再 ShareModal.tsx |
| CSP 移除 unsafe-inline 影響 Framer Motion | 動態 style 可能被阻擋 | 先在 staging 驗證，必要時保留 style-src unsafe-inline |
| Challenge 既有資料未 migrate | 新邏輯把 score=0 誤判為已提交 | 部署新邏輯前先跑 data migration SQL |
| DB migration 需手動操作 | 操作失誤風險 | 提供精確 SQL 且先在 test env 驗證 |
| Vitest 配置變更可能遺漏測試檔案 | 部分測試不被執行 | 明確指定 include glob 並驗證 |
| alias 改為 root-based 後舊引用壞掉 | import 路徑解析錯誤 | 變更後立即 `npx tsc --noEmit` 驗證 |
