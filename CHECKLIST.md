# 開發進度檢查清單 (Development Checklist)

此文件用於追蹤專案開發進度、待辦事項與已完成項目。

## 🟢 已完成 (Done)
- [x] **[Refactor]** 架構品質全面優化 (Architecture Quality Overhaul) `architecture-quality-overhaul`
    - [x] 重構 `App.tsx` 抽離 `AppContent.tsx` (行數從 309 降至 149)
    - [x] 修正 `startQuiz`、`handleAnswer`、`restoreSession` 等型別不匹配
    - [x] 達成 `npx tsc --noEmit` 零錯誤與 `npm run build` 通過
    - [x] 移動 `typeGuards.ts` 至 `utils/` 目錄並修正導入
    - [x] 統一 Hook 變數命名衝突（`confirm` -> `confirmDialog`）
- [x] **[Refactor]** 抽離 useBankManager Hook `extract-useBankManager`
- [x] **[Refactor]** 抽離 useQuizEngine 測驗引擎 Hook `extract-useQuizEngine`
- [x] **[Refactor]** 抽離成就追蹤 Hook `extract-useAchievementTracker`
- [x] **[Refactor]** 抽離 useAppDataLoader 與 appReducer `extract-loader-reducer`
- [x] **[Refactor]** 分離全域彈窗組件 GlobalModals `extract-global-modals`
- [x] **[Refactor]** 整合 NVIDIA API 與題庫資料夾系統 `integrate-nvidia-and-folders`
    - [x] [AI] 安裝並配置 OpenAI Client
    - [x] [AI] 重構 `ai.ts` 支援多重 Provider (Google/NVIDIA)
    - [x] [AI] 更新 `Settings.tsx` 支援 BaseURL 與 Provider 切換
    - [x] [Core] 更新 `types.ts` 定義 Folder 結構
    - [x] [Storage] 實作 Folder CRUD 與關聯邏輯
    - [x] [UI] 更新 Dashboard 支援資料夾瀏覽與操作 (麵包屑/移動)
- [x] **[AI]** 實作 Gemma 3 27B 解題小助手
- [x] **[Social]** 實作好友與題庫分享功能
- [x] **[UX]** 實作 Quiz UX 優化 (動畫/音效/錯誤解析) `quiz-ux-enhancement`
- [x] **[Backend]** 實作 Supabase 雲端遷移 `supabase-cloud-sync`
- [x] **[Feature]** 實作遊戲化模式 (Game Mode)
- [x] **[Security]** 專案安全審計與防護強化 (Security Audit & Hardening)
- [x] **[Refactor]** 遷移至 Tailwind CSS v4 與模組化配置
- [x] **[Refactor]** 技能導向優化計畫 (Skills-Based Optimization Plan) `skills-based-optimization`
- [x] **[Optimization]** 打包體積最佳化 (Bundle Size Optimization) `vite-bundle-split`

## 🟡 待辦 (Pending)
- [ ] **[Build]** 單元測試覆蓋率提升 (Test Coverage Improvement)
- [ ] **[Feature]** PWA 離線支持 (PWA Offline Support)

## 📝 備註 (Notes)
- 已完成 App 组件的徹底瘦身，後續新增視圖請優先於 `AppContent.tsx` 進行註冊。
- `tsc` 與 `build` 接通過，目前架構體質健康。
