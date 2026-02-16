## Why

深度程式碼審計 (2026-02-15) 揭露了 3 個 P0 關鍵錯誤、5 個 P1 功能/安全問題、和多個 P2 程式碼品質問題。其中 P0 問題包括：測試門檻完全失效 (`npm test` 紅燈)、Quiz 啟動時可能從錯誤題庫出題的競態、以及雲端題目 ID 不穩定導致學習資料（錯題/間隔複習/統計）一致性被破壞。這些問題直接影響產品可靠性和使用者學習成果，必須立即修復。

## What Changes

### P0 修復
- 修正 Vitest 配置，排除 E2E 測試檔案，恢復 `npm test` 為綠燈
- 修復 `startQuizByBank` 競態：讓 `startQuiz` 接受明確 `bankIds` 參數
- 重做 `saveCloudQuestions` 策略：從 delete+insert 改為 upsert，保留穩定題目 ID

### P1 修復
- 修正 Challenge 完成判斷：`otherScore > 0` 改為 `!== null` 區分未提交 vs 零分
- 修正 `CloudStorageRepository.createBank` 失敗時回傳 `id: ''` 的問題
- 為 NVIDIA provider 在 production 環境加入明確錯誤提示
- 新增 AI API Key 的「不持久化」模式選項
- **BREAKING**: 將 Social/Share 的 Supabase 直接操作重構至 service layer

### P2 清理
- 清除遺留目錄/檔案 (`src/services/supabase.ts`, `src/contexts/`, `nul`)
- 集中分散的 localStorage key 硬編碼至統一 registry
- 修復 stale response 風險 (useAppDataLoader)

### DB 層修復
- 補 `friendships` 的 RLS DELETE policy
- 修正 `update_streak` RPC 安全性 (移除可偽造的 `p_user_id` 參數)

## Capabilities

### New Capabilities
- `test-infrastructure`: 測試配置修正與腳本分流 (Vitest include/exclude, package.json scripts)
- `cloud-data-integrity`: 雲端題目 ID 穩定性與學習資料一致性保障
- `social-service-layer`: 社交/分享功能的 service layer 抽離
- `storage-key-registry`: localStorage key 集中管理與共用 helper

### Modified Capabilities
- `nvidia-api`: 新增 production 環境偵測與友善錯誤提示
- `social-sharing`: 修正 RLS delete policy、Challenge 0 分判斷、createBank 錯誤處理
- `ai-tutor`: 新增 API Key 不持久化模式

## Impact

- **測試**: `vitest.config.ts`, `vite.config.ts`, `package.json` 配置變更
- **核心流程**: `App.tsx`, `hooks/useQuizEngine.ts` — Quiz 啟動邏輯修改
- **雲端儲存**: `services/cloudStorage.ts`, `services/cloudRepo.ts` — 題目保存策略重做
- **社交功能**: `components/Social.tsx`, `components/ShareModal.tsx` → 新增 `services/socialService.ts`
- **安全性**: `services/ai.ts`, `index.html` CSP 配置
- **DB**: `supabase_social_migration.sql`, `supabase_streak_migration.sql`
- **清理**: 刪除 `src/services/supabase.ts`, `src/contexts/AuthContext.tsx`, `nul`
