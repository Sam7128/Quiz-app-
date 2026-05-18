# 深度稽核修復實作報告 (2026-02-16)

此文件彙整在 `c:\Users\user\Desktop\Quiz-app--main` 專案中，針對 OpenSpec 變更 `deep-audit-remediation` 所完成的實作內容與驗證結果。

## 狀態

- OpenSpec change：`deep-audit-remediation`（schema：`spec-driven`）
- 任務完成：52/59
- 剩餘項目：需要 Supabase 後台或 production 實際執行環境的驗證任務

## 已完成的關鍵修復

### 測驗啟動競態（Quiz Startup Race Condition）

- `hooks/useQuizEngine.ts` 新增 `overrideBankIds?: string[]`，並持久化「本次測驗實際使用的 bankIds」（修正刷新/續作可能回到錯誤題庫的問題）。
- `App.tsx` 在從指定題庫啟動測驗時，改傳 `overrideBankIds`。
- Dashboard 每個題庫新增操作按鈕「直接開始」，用來覆蓋此流程。
- 已新增並通過 E2E 驗證：
  - `e2e/start-quiz-by-bank.spec.ts`

### 雲端題目 ID 穩定性（UUID）

- 新增 UUID 正規化工具：
  - `utils/uuid.ts`（`isUuid`, `normalizeToUuid`）
- 針對題目建立/匯入路徑統一正規化題目 ID：
  - JSON 上傳/貼上匯入：`components/BankManager.tsx`
  - AI PDF 生成（解析後修正）：`services/ai.ts`
  - 接受好友分享題庫快照：`components/Social.tsx`
- 雲端儲存策略改造：
  - `services/cloudStorage.ts` 的 `saveCloudQuestions` 改為 `upsert({ onConflict: 'id' })`，並在相同 `bank_id` 範圍內刪除「不在新清單中的題目」。
- 雲端建題錯誤處理：
  - `services/cloudRepo.ts` 的 `createBank` 失敗改為 `throw`
  - `components/BankManager.tsx` 已捕捉並呈現錯誤訊息

### 挑戰賽分數邏輯（0 分必須視為有效提交）

- `services/challenges.ts`：判定雙方是否已提交分數，從 `otherScore > 0` 改為 `otherScore !== null && otherScore !== undefined`。
- 新增 DB migration SQL（移除預設 0 sentinel、並把 pending/active 舊資料 0 轉成 NULL）：
  - `supabase_challenges_score_nullable_migration.sql`

### AI 供應商安全性與金鑰持久化

- NVIDIA provider 在 production 且使用預設 baseUrl 時，直接丟出可理解的錯誤訊息：
  - `services/ai.ts`（`import.meta.env.PROD && isDefaultUrl`）
- `AIConfig` 新增 `persist?: boolean`：
  - `types.ts`
- `services/ai.ts` 支援：
  - `persist: true` 儲存到 `localStorage`
  - `persist: false` 儲存到 `sessionStorage`（並清掉 `localStorage` 版本）
- Settings UI 新增「記住金鑰」切換與安全聲明：
  - `components/Settings.tsx`
- `index.html` 補上 CSP 的 production 部署建議註解：
  - `index.html`

### 社交模組服務層重構（元件不再直連 Supabase）

- 新增服務層：
  - `services/socialService.ts`
- 元件移除 `supabase` 直連，改使用 service：
  - `components/Social.tsx`
  - `components/ShareModal.tsx`
  - `components/ChallengeModal.tsx`

### Storage Key Registry（統一管理 localStorage key）

- `services/storage.ts` 已 export `STORAGE_KEYS`，並補齊明確 registry：
  - `BGM_ENABLED`, `SFX_ENABLED`, `BATTLE_STATE`, `THEME`（原本已含 `AI_CONFIG`, `BANKS_META`）
- 已更新呼叫端改用 `STORAGE_KEYS`：
  - `hooks/useSoundEffects.ts`
  - `hooks/useBattleSystem.ts`
  - `hooks/useQuizEngine.ts`
  - `hooks/useBankManager.ts`
  - `contexts/ThemeContext.tsx`
  - `services/ai.ts`

### ESLint 工具鏈修復

- 安裝並設定 `eslint-plugin-react-hooks`，加入 `lint` script。
- 調整規則嚴重度，使 `npm run lint` 不再因設定層級問題直接失敗（目前仍有 warnings，後續可逐步收斂）。

### 效能：避免非同步載入覆蓋新選擇（Stale Response Prevention）

- `hooks/useAppDataLoader.ts` 新增版本號 ref，避免舊的 async 結果覆蓋新的 bank selection。
- 新增單元測試：
  - `src/__tests__/useAppDataLoader.stale.test.tsx`

### DB/RLS 相關產物

- 新增 friendships 的 DELETE policy SQL：
  - `supabase_friendships_delete_policy.sql`
- 重寫 `update_streak` RPC：移除參數、改用 `auth.uid()`、補上 `SET search_path` 與正確 insert 邏輯：
  - `supabase_update_streak_rpc_authuid.sql`
- 前端呼叫改為不帶參數：
  - `services/streak.ts`

### 遺留清理

- 刪除 `src/` 下未使用的舊架構檔案與 root `nul`，並確認 `src/` 僅保留 `__tests__/`。

## 本機端已完成驗證

- 單元測試：`npm test`（通過）
- 型別檢查：`npx tsc --noEmit`（通過）
- Build：`npm run build`（通過）
- Lint：`npm run lint`（可通過；仍有 warnings）
- E2E smoke：`e2e/quiz-flow.spec.ts`（通過）
- E2E 驗證：`e2e/start-quiz-by-bank.spec.ts`（通過）

## 尚待驗證（需手動 / 外部環境）

以下任務仍維持未勾選，原因是需要 Supabase 後台檢查或真實 production runtime 測試：

- 3.4 / 3.5：在 Supabase Dashboard 驗證雲端題目 UUID 是否跨次儲存保持穩定、刪除是否僅刪除移除的題目
- 4.4：驗證一方得分 0 時挑戰仍能正確結算（需 live Supabase）
- 5.2：production build 下選 NVIDIA 且未設定自訂 baseUrl 時，UI 是否能呈現清楚錯誤（需實際觸發 `askAI` 的 production 行為）
- 7.5：社交/分享功能端到端驗證（需 live Supabase）
- 12.4：streak 更新與好友刪除在 RLS 下的實際驗證（需 live Supabase）
- 13.6：社交功能 smoke test（需 live Supabase）

## 如何完成剩餘驗證

1. 在 Supabase SQL editor 依序套用以下 SQL：
   - `supabase_challenges_score_nullable_migration.sql`
   - `supabase_friendships_delete_policy.sql`
   - `supabase_update_streak_rpc_authuid.sql`
2. 在 App（登入雲端模式）實際操作驗證：
   - 題庫儲存到雲端後：題目 UUID 跨次儲存不變、刪除題目後雲端也只刪除對應題目
   - 挑戰賽：一方得分 0 仍能完成並正確判定勝負
   - 好友刪除：RLS 下可刪除（DELETE policy 生效）
   - streak：RPC 可正常更新（新版不帶 `p_user_id`）
