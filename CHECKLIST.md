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
- [x] **[Infra]** 統一 Agent 記憶架構 (Unified Agent Memory Arch)
    - [x] 建立 `.gemini/settings.json` 指向 `AGENTS.md`
    - [x] 廢除 `GEMINI.md` 並遷移 Protocol 至 `AGENTS.md` 鐵規
    - [x] 建立 8 個模組級巢狀 `AGENTS.md` (Components, Services, etc.)
    - [x] 根目錄大掃除：搬移 40+ 個散落檔案至 `docs/` 子目錄
    - [x] 修復 `project-memory` MCP `search_memory` 的 `score_entry` 作用域錯誤
    - [x] 建立 repo-local `.project-memory/` wrapper 與 `.codex/config.toml`
    - [x] 強化 `project-memory-refresh` skill：refresh 後自動驗證 MCP 可連線且可執行 `search_memory`
    - [x] 調整 `project-memory-refresh` skill：保留 AntiGravity 預設安裝，但改為權限失敗時警告不中止


- [x] **[Feature]** 知識圖工作區 (Knowledge Graph Workspace) `knowledge-graph-workspace`
    - [x] 資料模型 (`GraphDocument`, `GraphNode`, `GraphEdge`, `GraphViewState`)
    - [x] CRUD 服務層 (`graphStorage.ts`) 含 MutationResult 與 QuotaExceeded 偵測
    - [x] Mermaid 雙向橋接 (`mermaidBridge.ts`) 含分號、行號、修正建議
    - [x] ReactFlow 編輯器 (節點/連線 CRUD、Undo/Redo、自動儲存)
    - [x] 閱讀模式 (漸進式 L1→L2→L3 + 全展開)
    - [x] Beta 功能開關 + 條件導覽 + View Guardian
    - [x] 手機唯讀模式 + 桌面全功能
    - [x] React.lazy 代碼分割 (KG chunk 26.64KB gzip)
    - [x] 47 個新測試 (graphStorage 15 + mermaidBridge 19 + betaFeature 4 + readingModes 9)
    - [x] 8 輪多模型自動驗證 (Claude Opus + GPT-5.3 + GPT-5.4)

## 🟡 待辦 (Pending)
- [ ] **[Build]** 單元測試覆蓋率提升 (Test Coverage Improvement)
- [ ] **[Feature]** PWA 離線支持 (PWA Offline Support)

## 🟢 本次完成 (Completed This Round)
- [x] **[Data Integrity]** 題目識別與題庫編修安全升級 (Question Identity & Bank Editing Safety)
    - [x] 分離內部題目 UUID 與外部來源識別，避免匯入/AI 造成跨題庫 ID 衝突
    - [x] 匯入前去重並保留既有題目 ID，避免重複新增與學習紀錄斷鏈
    - [x] 在題庫管理加入單題編輯/刪除，並清理錯題/複習殘留資料
    - [x] 補齊雲端儲存與題庫管理測試
- [x] **[UX]** 題庫匯入模式切換與匯入前摘要提示
    - [x] 支援「追加新題 / 更新同來源題目 / 覆蓋整個題庫」
    - [x] 貼上 JSON 後匯入不再自動清空文字內容
    - [x] 匯入前顯示原始題數、重複合併數、實際匯入數與模式影響

## 📝 備註 (Notes)
- 已完成 App 组件的徹底瘦身，後續新增視圖請優先於 `AppContent.tsx` 進行註冊。
- `tsc` 與 `build` 接通過，目前架構體質健康。
