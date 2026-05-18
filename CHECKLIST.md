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
- [ ] **[OpenSpec]** 分階段練習雲端接力 (Chunked Practice Cloud Sync) `chunked-practice-cloud-sync`
- [x] **[Hotfix]** 修正分階段練習中途刷新後續答回到第一題 `chunked-practice-mid-refresh-resume`

## 🟢 本次完成 (Completed This Round)
- [x] **[Hotfix]** 修正 Vercel 部署時 Vite 權限與缺檔錯誤
    - [x] 查明 root cause：遠端 `origin/main` 誤追蹤 `node_modules/` 8818 個檔案與 Windows 保留檔名 `nul`，Vercel 因而基於殘缺依賴樹執行 build。
    - [x] 確認第一輪 `node ./node_modules/vite/bin/vite.js build` 只繞過 `.bin/vite` 權限症狀；真正修法是讓 Git 不再追蹤 `node_modules/`。
    - [x] 準備將 production build script 還原為標準 `vite build`，由 Vercel 乾淨安裝產生正確可執行 shim。
    - [x] 執行 TypeScript 與 production build 驗證。
- [x] **[Hotfix]** 修正登入狀態下分階段練習中途刷新續答回到第一題 `chunked-practice-mid-refresh-resume`
    - [x] 查明 root cause：`CloudStorageRepository.savePracticeSession()` 雲端儲存成功後呼叫本地 `deletePracticeSession()`，連帶清除 `mindspark_chunk_draft:*`，導致 restore 前草稿消失。
    - [x] 新增 `removePracticeSessionCache()`，將「移除本地 session cache」與「清除 session + drafts」分離；雲端成功同步只清 cache，不清進行中草稿。
    - [x] 補上雲端 repository 回歸測試，確認 cloud save 後本地 draft 仍保留；補上 hook 組合測試，確認答到中途卸載再 restore 會回到原 index。
- [x] **[Hotfix]** 修正分階段練習刷新後進度丟失與競態覆蓋 Bug `chunked-practice-refresh-fix`
    - [x] 在 `App.tsx` 中將 `onChunkComplete` 與 `onChunkDraftUpdate` 使用 `useCallback` 封裝，消除由於重新整理後非同步加載 banks 導致 App 重新渲染所引起的匿名函數引用改變與重複 useEffect 觸發。
    - [x] 在 `useChunkedPractice.ts` 的 `updateChunkDraft` 與 `onBeforeUnload` 中加入防禦性進度保護（Index-Guarding），防止初始化時以預設的 `0` 題或空資料意外覆蓋 localStorage 中更先進的已存進度。
    - [x] 修復 `AppContent.tsx` 與 `types.ts` 中的 TypeScript 嚴格編譯型別錯誤（如型別缺少 `wrongQuestionIds`、`bankIds` 屬性），確保 `npx tsc --noEmit` 通過。
- [x] **[Hotfix]** 修正分階段練習同步卡死與 React 無限 Loop `chunked-practice-sync-hotfix`
    - [x] 在 `services/cloudStorage.ts` 引入熔斷與優雅降級機制（Circuit Breaker），自動熔斷未建立 `practice_sessions` 表的 Supabase 環境，無縫切換至 Local 模式，避免 PGRST205/404 報錯
    - [x] 從 `services/cloudRepo.ts` 的 `getPracticeSessions` 移除每次查詢無條件 `await retryDirtyPracticeSessions()`，解除網路阻塞與高頻請求造成的 AbortError
    - [x] 修復 `App.tsx` 初始化時 `useEffect` 因為 `chunkedPractice` reference 變更造成的無限 Loop 死亡螺旋，改用 `hasSyncedPracticeRef` 限制僅在登入後同步一次
- [x] **[OpenSpec]** 分階段練習雲端接力（第一輪實作）`chunked-practice-cloud-sync`
    - [x] 新增 `practice_sessions` migration（RLS / updated_at trigger / 索引 / ON DELETE CASCADE）
    - [x] 新增 `PracticeChunk` / `ChunkedPracticeSession` / `ChunkMeta` 型別與 `QuizState.mode='chunked'`
    - [x] 完成 Local/Cloud repository 的分階段 session CRUD 與 LWW + dirty/retry 同步
    - [x] 新增 `useChunkedPractice`，含 restore 驗證、draft 快照、chunk 完成冪等
    - [x] 完成 Dashboard 分階段入口、Active session 卡片、Chunk 完成摘要、QuizCard 階段進度 UI
    - [x] 新增單元測試（chunked hook/storage/quiz engine）與 E2E（小題庫 + 中途退出續作）
- [x] **[Data Integrity]** 題目識別與題庫編修安全升級 (Question Identity & Bank Editing Safety)
    - [x] 分離內部題目 UUID 與外部來源識別，避免匯入/AI 造成跨題庫 ID 衝突
    - [x] 匯入前去重並保留既有題目 ID，避免重複新增與學習紀錄斷鏈
    - [x] 在題庫管理加入單題編輯/刪除，並清理錯題/複習殘留資料
    - [x] 補齊雲端儲存與題庫管理測試
- [x] **[UX]** 題庫匯入模式切換與匯入前摘要提示
    - [x] 支援「追加新題 / 更新同來源題目 / 覆蓋整個題庫」
    - [x] 貼上 JSON 後匯入不再自動清空文字內容
    - [x] 匯入前顯示原始題數、重複合併數、實際匯入數與模式影響
- [x] **[Review Fix]** 2026-05-07 未提交變更審查修復
    - [x] 修正 React Flow data 轉型造成的 TypeScript 編譯錯誤
    - [x] 同步 Mermaid 匯入節點上限與 `GRAPH_LIMITS.MAX_NODES`
    - [x] 清理稽核報告中屬實的 `any` 型別破口
    - [x] 移除 reducer 內的 gameMode 持久化副作用
    - [x] 補強 QuizCard 延遲計時器卸載清理

## 📝 備註 (Notes)
- 已完成 App 组件的徹底瘦身，後續新增視圖請優先於 `AppContent.tsx` 進行註冊。
- `tsc` 與 `build` 接通過，目前架構體質健康。
