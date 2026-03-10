# MEMORY.md

## Purpose Snapshot
- [FACT-001] `Quiz-app--main/`: MindSpark 是一個以 React + TypeScript + Vite 建構的測驗學習應用，核心包含題庫管理、測驗流程、AI 輔助、雲端同步與遊戲化學習。
- [FACT-002] 主要 runtime 是前端單頁應用；持久化同時依賴 `localStorage` 與 Supabase，並以 service layer + domain hooks 分離 I/O 與業務邏輯。

## Source of Truth
- [PATH-001] `AGENTS.md`: project rules and routing.
- [PATH-002] `types.ts`: 核心題目、題庫、設定與應用狀態型別。
- [PATH-003] `App.tsx`: app shell 與主流程掛載入口。
- [PATH-004] `services/`: storage、cloud、AI、analytics 與 graph 相關 I/O 邏輯。
- [PATH-005] `hooks/`: battle、study、challenge 等領域 hook。
- [PATH-006] `docs/DEVELOPMENT_LOG.md`: 重大變更歷史。
- [PATH-007] `openspec/`: 規格、變更提案與 archived change 歷史。

## Aliases & Vocabulary
- [ALIAS-001] 「題庫管理」「bank manager」-> `components/BankManager.tsx`, `services/storage.ts`, `services/cloudStorage.ts`
- [ALIAS-002] 「測驗引擎」「quiz flow」-> `components/QuizCard.tsx`, `hooks/useQuizEngine.ts`, `reducers/appReducer.ts`
- [ALIAS-003] 「遊戲模式」「battle」-> `hooks/useBattleSystem.ts`, `components/BattleArena.tsx`, `types/battleTypes.ts`
- [ALIAS-004] 「知識圖」「knowledge graph」-> `components/KnowledgeGraph/`, `services/graphStorage.ts`, `types/graphTypes.ts`
- [ALIAS-005] 「雲端同步」「Supabase」-> `contexts/AuthContext.tsx`, `services/cloudStorage.ts`, `services/supabase.ts`
- [ALIAS-006] 「專案記憶」「project memory」-> `MEMORY.md`, `.project-memory/project_memory_mcp_entry.py`, `.memory-index/index.json`
- [ALIAS-007] 「題目身份」「question identity」-> `utils/questionIdentity.ts`, `components/BankManager.tsx`, `services/cloudStorage.ts`

## Entry Points
- [ENTRY-001] `AGENTS.md`: 先讀鐵規、模組索引、資料安全與文件維護要求。
- [ENTRY-002] `App.tsx`: 確認 view flow、provider 組裝與 reducer 接線。
- [ENTRY-003] `types.ts`: 先鎖定資料模型，符合 TYPE_FIRST 規則。
- [ENTRY-004] `services/storage.ts`: 檢查 `mindspark_*` key、guest mode 持久化與資料安全界線。
- [ENTRY-005] `services/cloudStorage.ts`: 檢查登入後同步與 Supabase 邊界。
- [ENTRY-006] `hooks/useBattleSystem.ts`: 遊戲化互動與持久化的主要熱區。

<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->
## Auto-Generated Memory Map
- Refreshed: `2026-03-10 18:10`
- Project root: `C:\Users\user\Desktop\Quiz-app--main`

### Key Files
- [PATH-001] `AGENTS.md`
- [PATH-002] `MEMORY.md`
- [PATH-003] `README.md`
- [PATH-004] `CHECKLIST.md`
- [PATH-005] `package.json`
- [PATH-006] `tsconfig.json`
- [PATH-007] `docs/INDEX.md`
- [PATH-008] `App.tsx`
- [PATH-009] `constants.ts`
- [PATH-010] `dashboard.png`

### Module Index
| ID | Path | Local AGENTS | Purpose | Tags |
|---|---|---|---|---|
| MOD-001 | `components/` | yes | ui components | components |
| MOD-002 | `constants/` | yes | static definitions and domain data | constants |
| MOD-003 | `contexts/` | yes | shared context and state boundaries | contexts |
| MOD-004 | `docs/` | no | project documentation | docs |
| MOD-005 | `e2e/` | yes | end-to-end tests | e2e |
| MOD-006 | `hooks/` | yes | feature hooks and orchestration | hooks |
| MOD-007 | `openspec/` | yes | change planning and specs | openspec |
| MOD-008 | `public/` | no | static assets | public |
| MOD-009 | `reducers/` | no | important project module | reducers |
| MOD-010 | `services/` | yes | service and integration logic | services |
| MOD-011 | `src/` | no | primary source implementation | src |
| MOD-012 | `types/` | no | shared type definitions | types |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none detected.
- Archived changes: `16`
- [OS-ARC-001] `openspec/changes/archive/2026-03-03-fix-dashboard-ux-and-sharing/` (proposal, design, tasks, specs:2)
- [OS-ARC-002] `openspec/changes/archive/2026-03-08-knowledge-graph-workspace/` (proposal, design, tasks, specs:5)
- [OS-ARC-003] `openspec/changes/archive/enhance-quiz-experience/` (proposal, design, tasks, specs:2)
- [OS-ARC-004] `openspec/changes/archive/quiz-ux-enhancement/` (proposal, tasks)
- [OS-ARC-005] `openspec/changes/archive/supabase-cloud-sync/` (proposal, tasks)

### Nested AGENTS
- [AG-001] `components/AGENTS.md`
- [AG-002] `constants/AGENTS.md`
- [AG-003] `contexts/AGENTS.md`
- [AG-004] `e2e/AGENTS.md`
- [AG-005] `hooks/AGENTS.md`
- [AG-006] `openspec/AGENTS.md`
- [AG-007] `services/AGENTS.md`
- [AG-008] `src/__tests__/AGENTS.md`
<!-- END AUTO-GENERATED: MEMORY MAP -->

## Stable Facts
- [FACT-010] `services/storage.ts`: 所有本地持久化 key 皆以 `mindspark_` 為前綴，清理或遷移時要遵守資料安全規則。
- [FACT-011] `contexts/AuthContext.tsx` + `services/cloudStorage.ts`: 題庫可上雲，但學習行為資料仍大量保留在 localStorage 作裝置級追蹤。
- [FACT-012] `components/KnowledgeGraph/` + `services/graphStorage.ts`: 知識圖工作區已存在且有測試覆蓋，不是草稿目錄。
- [FACT-013] `.project-memory/project_memory_mcp_entry.py`: 此 repo 已有 project-local MCP wrapper，可直接提供 `search_memory`、`get_aliases` 等工具。
- [FACT-014] `Question.id` 現在視為內部穩定 ID；外部匯入來源以 `sourceQuestionKey` / `sourceFingerprint` 協助合併與去重。
- [FACT-015] `components/BankManager.tsx` 已具備單題編輯/刪除 UI，刪題會清理錯題、SM-2、最近錯題與 quiz session 殘留資料。
- [FACT-016] `components/BankManager.tsx` 在 JSON / AI 匯入前會顯示匯入摘要，明確列出原始題數、重複合併數與實際可匯入題數。
- [FACT-017] `components/BankManager.tsx` 現在支援三種匯入模式：`append` 只新增全新題目、`merge` 更新同來源題目並新增新題、`replace` 以匯入內容覆蓋整個題庫；預設為 `append`。

## Active Decisions
- [DEC-001] `AGENTS.md`: 採用 `AGENTS.md` 承載規則、`MEMORY.md` 承載動態事實，repo-local `GEMINI.md` 不再維護。
- [DEC-002] `services/` + `hooks/`: 元件不直接碰 storage / Supabase，I/O 維持集中於 service layer。
- [DEC-003] `.codex/config.toml` + `.project-memory/project_memory_mcp_entry.py`: 本專案改用 project-local MCP wrapper，避免只依賴全域 `project-memory-auto`。

## Hotspots
- [HOT-001] `App.tsx`: 全域流程、view 切換與 provider 接線，任何大型功能都容易牽動這裡。
- [HOT-002] `services/storage.ts` / `services/cloudStorage.ts`: 任何資料模型變更都可能影響相容性與使用者資料完整性。
- [HOT-003] `hooks/useBattleSystem.ts`: 遊戲化狀態複雜且與 UI、持久化、測驗結果交錯。
- [HOT-004] `services/graphStorage.ts` + `components/KnowledgeGraph/`: 新近功能區，仍在演化，改動容易打到測試與資料結構。
- [HOT-005] `utils/questionIdentity.ts` + `components/BankManager.tsx`: 題目匯入、覆蓋與手動修正流程的核心熱區，影響題目穩定識別與學習紀錄是否斷鏈。

## Search Recipes
- [RG-001] `rg -n "mindspark_" services hooks components`: 找所有持久化 key 與資料流入口。
- [RG-002] `rg -n "useBattleSystem|battle" hooks components types`: 找遊戲模式狀態與 UI 接線。
- [RG-003] `rg -n "graph|KnowledgeGraph|mermaid" components services src/__tests__ types`: 找知識圖功能與測試。
- [RG-004] `rg -n "Supabase|cloudStorage|syncLocalToCloud" contexts services`: 找登入同步與雲端行為。
- [RG-005] `rg -n "sourceQuestionKey|sourceFingerprint|mergeImportedQuestions" components services utils src/__tests__`: 找題目身份與匯入合併實作。
- [RG-006] `rg -n "planQuestionImport|importMode|匯入前檢查" components utils src/__tests__`: 找匯入模式、摘要提示與測試。

## Archive Index
- [DOC-001] `docs/INDEX.md`: 已整理 reports、archive、migrations 與 root docs 索引，查歷史輸出先看這裡。

## Open Risks
- [RISK-001] `docs/DEVELOPMENT_LOG.md`: 現有檔案曾被半自動 patch，格式有殘留 `+` 字元，後續需再做一次整體清理。
- [RISK-002] 全域 `project-memory-auto` 的舊 MCP 進程在現有 Codex session 內可能仍未重載；新程式碼通常需要重開 session 才會被內建工具吃到。
- [RISK-003] `ensure_project_mcp_configs.py` 預設會碰 `%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json`，在受限環境下可能因權限失敗，但不影響 repo-local Codex/Gemini/Cursor 設定。

## Next Refresh Triggers
- Rename or move a major directory.
- Add or remove nested `AGENTS.md` files.
- Change architecture, persistence, or integration boundaries.
