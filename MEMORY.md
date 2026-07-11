# MEMORY.md

## Purpose Snapshot
- [FACT-001] `Quiz-app--main/`: MindSpark React + TypeScript + Vite quiz app. Core: bank manage, quiz flow, AI assist, cloud sync, game study.
- [FACT-002] Runtime: frontend SPA. Persistent: `localStorage` + Supabase. Service layer + domain hooks separate I/O + logic.

## Source of Truth
- [PATH-001] `AGENTS.md`: project rules, routing.
- [PATH-002] `types.ts`: core types: questions, banks, settings, state.
- [PATH-003] `App.tsx`: app shell, main entry.
- [PATH-004] `services/`: storage, cloud, AI, analytics, graph I/O.
- [PATH-005] `hooks/`: hooks for battle, study, challenge domains.
- [PATH-006] `docs/DEVELOPMENT_LOG.md`: change log.
- [PATH-007] `openspec/`: specs, proposals, archived changes.
- [PATH-008] `start-dev.bat`: script start Vite, resolve port clash, open browser.
- [PATH-009] `package.json`: npm scripts, Vercel build, dependency versions.

## Aliases & Vocabulary
- [ALIAS-001] "bank manager" -> `components/BankManager.tsx`, `services/storage.ts`, `services/cloudStorage.ts`
- [ALIAS-002] "quiz flow" -> `components/QuizCard.tsx`, `hooks/useQuizEngine.ts`, `reducers/appReducer.ts`
- [ALIAS-003] "battle" -> `hooks/useBattleSystem.ts`, `components/BattleArena.tsx`, `types/battleTypes.ts`
- [ALIAS-004] "knowledge graph" -> `components/KnowledgeGraph/`, `services/graphStorage.ts`, `types/graphTypes.ts`
- [ALIAS-005] "Supabase" -> `contexts/AuthContext.tsx`, `services/cloudStorage.ts`, `services/supabase.ts`
- [ALIAS-006] "project memory" -> `MEMORY.md`, `.project-memory/project_memory_mcp_entry.py`, `.memory-index/index.json`
- [ALIAS-007] "question identity" -> `utils/questionIdentity.ts`, `components/BankManager.tsx`, `services/cloudStorage.ts`
- [ALIAS-008] "chunked practice" -> `hooks/useChunkedPractice.ts`, `components/ChunkedPracticePanel.tsx`, `services/cloudStorage.ts`
- [ALIAS-009] "practice_sessions" -> `docs/migrations/PRACTICE_SESSIONS_MIGRATION.sql`, `services/cloudStorage.ts`, `services/repository.ts`

## Entry Points
- [ENTRY-001] `AGENTS.md`: read rules, module index, safety, doc policy first.
- [ENTRY-002] `App.tsx`: view flow, provider nesting, reducer wiring.
- [ENTRY-003] `types.ts`: data models, obeys TYPE_FIRST rule.
- [ENTRY-004] `services/storage.ts`: `mindspark_*` keys, guest persistence, safety boundaries.
- [ENTRY-005] `services/cloudStorage.ts`: sync flow, Supabase boundaries.
- [ENTRY-006] `hooks/useBattleSystem.ts`: game interaction, state persistence.

<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->
## Auto-Generated Memory Map
- Refreshed: `2026-07-11 20:57`
- Project root: `C:\Users\user\Desktop\Quiz-app-`

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
| MOD-001 | `components/` | yes | UI components | components |
| MOD-002 | `constants/` | yes | static data | constants |
| MOD-003 | `contexts/` | yes | shared context | contexts |
| MOD-004 | `docs/` | no | docs | docs |
| MOD-005 | `e2e/` | yes | E2E tests | e2e |
| MOD-006 | `hooks/` | yes | domain hooks | hooks |
| MOD-007 | `openspec/` | yes | OpenSpec planning | openspec |
| MOD-008 | `public/` | no | static assets | public |
| MOD-009 | `Quiz-app-/` | no | root module | quiz-app- |
| MOD-010 | `reducers/` | no | root module | reducers |
| MOD-011 | `services/` | yes | services | services |
| MOD-012 | `src/` | no | main source | src |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none detected.
- Archived changes: `21`
- [OS-ARC-001] `openspec/changes/archive/2026-06-12-dead-code-cleanup/` (proposal, design, tasks, specs:1)
- [OS-ARC-002] `openspec/changes/archive/2026-07-11-security-architecture-hardening-v2/` (proposal, design, tasks, specs:8)
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
- [FACT-010] `services/storage.ts`: Local keys prefix `mindspark_`. Obey data safety during migration.
- [FACT-011] `contexts/AuthContext.tsx` + `services/cloudStorage.ts`: Banks sync to cloud. Study history stays in `localStorage` for device tracking.
- [FACT-012] `components/KnowledgeGraph/` + `services/graphStorage.ts`: Graph workspace exists + has tests. Not draft.
- [FACT-013] `.project-memory/project_memory_mcp_entry.py`: Local MCP wrapper provides `search_memory`, `get_aliases`.
- [FACT-014] `Question.id`: Stable UUID internal ID. Cloud dedupe uses `sourceQuestionKey` / `sourceFingerprint`.
- [FACT-015] `components/BankManager.tsx`: Single question delete UI. Deleting cleans mistakes, SM-2, recent mistakes, quiz session.
- [FACT-016] `components/BankManager.tsx`: Show import summary (source, duplicate merge, final count) before JSON/AI import.
- [FACT-017] `components/BankManager.tsx`: Import modes: `append` (new only, default), `merge` (update existing + add new), `replace` (overwrite bank).
- [FACT-018] Chunked practice: use `mindspark_practice_sessions` session. Mid-chunk restore use `mindspark_chunk_draft:<sessionId>:<chunkIndex>`. Skip `mindspark_quiz_session`.
- [FACT-019] `syncLocalPracticeSessions`: Use `updated_at` LWW. Save dirty local fallback for retry on sync fail.
- [FACT-020] `App.tsx` + `useQuizEngine.ts`: Callbacks (e.g. `onChunkDraftUpdate`, `onChunkComplete`) MUST use `useCallback` to prevent race conditions during async load.
- [FACT-021] `CloudStorageRepository.savePracticeSession`: Success clear local session cache, NOT `mindspark_chunk_draft:*`. Use `removePracticeSessionCache()`.
- [FACT-022] Vercel build: Git must not track `node_modules` or Windows reserved names (e.g. `nul`). Vercel fresh install mandatory.
- [FACT-023] `services/storage.ts`: Verify AI Config via Type Guards + schema from `localStorage`. Prevent malicious payload.
- [FACT-024] `services/cloudStorage.ts`: Practice Sessions sync. Cloud-only sessions write back to local if local empty. Prevents overwrite by empty data.
- [FACT-025] `utils/integrityCheck.ts`: Stateless dynamic HMAC-SHA256. No local salt storage. Prevents key exposure.
- [FACT-026] `hooks/useBattleSystem.ts`: Validate battle state ranges on load. Reset on corrupt data to prevent cheats.
- [FACT-027] `docs/sql/submit_challenge_score.sql`: Submit challenge score RPC determines winner on DB side if both scores present.
- [FACT-028] Dead code: Use `npx -y knip --reporter compact --no-progress`. No `tldr` binary available.
- [FACT-029] `openspec/specs/code-hygiene/spec.md`: Code Hygiene spec defines physical dead code delete, narrow export scopes, clean redundant `export default`.
- [FACT-030] `services/cloudStorage.ts`: Concurrency lock `runWithSyncLock` (Web Locks `navigator.locks` + 30s localStorage fallback) protects `syncLocalToCloud` and `syncLocalPracticeSessions`.
- [FACT-031] `components/FocusTimer.tsx`: Track AudioContext in `activeAudioContextsRef`. Force close() on unmount/play finish to prevent resource leak.
- [FACT-032] `hooks/useKeyboardShortcuts.ts`: Use `handlersRef` pattern. Decouple callbacks from listeners. empty deps `[]` to prevent redundant keydown listeners.
- [FACT-033] `services/cloudStorage.ts`: `saveCloudQuestions` writes to `mindspark_dirty_banks` before upsert, clears on success via `removeDirtyBank`. Handles offline/close mid-sync.

## Active Decisions
- [DEC-001] rules in `AGENTS.md`, facts in `MEMORY.md`. `GEMINI.md` deprecated.
- [DEC-002] I/O concentrated in service layer. Components never touch storage/Supabase directly.
- [DEC-003] Use local MCP wrapper `.project-memory/project_memory_mcp_entry.py`. Skip global `project-memory-auto`.
- [DEC-004] `vite.config.ts`: Bundle React core + Recharts + Framer Motion in same `vendor-ui-core` chunk. Fixes production `forwardRef` undefined crash.
- [DEC-005] `package.json`: Build entry uses `vite build`. Fix platform permissions by clean Git index, no `node_modules` commit.
- [DEC-006] Storage Safety: Ban `any` in Storage/JSON parse. Use `unknown` + Type Guards.
- [DEC-007] E2E: Click custom Confirm buttons instead of `page.on('dialog')` due to custom `ConfirmDialog` overlay blocking.

## Hotspots
- [HOT-001] `App.tsx` & `vite.config.ts`: Main entry, Provider tree, manual chunks logic. Watch out for UI core chunking.
- [HOT-002] `services/storage.ts` & `services/cloudStorage.ts`: Data schema changes affect backward compatibility.
- [HOT-003] `hooks/useBattleSystem.ts`: RPG game state tied with quiz engine & UI.
- [HOT-004] `services/graphStorage.ts` & `components/KnowledgeGraph/`: Active graph code, high churn, check tests.
- [HOT-005] `utils/questionIdentity.ts` & `components/BankManager.tsx`: Import deduplication, stable IDs, prevents data mismatch.
- [HOT-006] `hooks/useChunkedPractice.ts` & `hooks/useQuizEngine.ts`: Intersection of practice sessions + quiz flow. Timings matter.
- [HOT-007] `services/cloudStorage.ts`: Practice Session sync (LWW, dirty, retry logic). Validate schema.
- [HOT-008] `.gitignore` & Git index: Vercel build fails if `node_modules/` tracked in Git. Verify via `git ls-tree`.
- [HOT-009] `services/storage.ts` & `services/cloudStorage.ts`: Config safety filters. Type checking strictness.

## Search Recipes
- [RG-001] `rg -n "mindspark_" services hooks components`: Local storage keys and flow entries.
- [RG-002] `rg -n "useBattleSystem|battle" hooks components types`: RPG battle states and UI components.
- [RG-003] `rg -n "graph|KnowledgeGraph|mermaid" components services src/__tests__ types`: Graph features and tests.
- [RG-004] `rg -n "Supabase|cloudStorage|syncLocalToCloud" contexts services`: Supabase auth and sync handlers.
- [RG-005] `rg -n "sourceQuestionKey|sourceFingerprint|mergeImportedQuestions" components services utils src/__tests__`: Question stable IDs & import merge.
- [RG-006] `rg -n "planQuestionImport|importMode" components utils src/__tests__`: Import checks, UI summaries.
- [RG-007] `rg -n "useChunkedPractice|chunkMeta|mindspark_practice_sessions" App.tsx hooks services components`: Chunked session lifecycle.
- [RG-008] `rg -n "\"build\"|vite|Vercel" package.json vercel.json docs MEMORY.md`: Vercel deployments and scripts.
- [RG-009] `npx -y knip --reporter compact --no-progress`: Dead code and unused exports.

## Archive Index
- [DOC-001] `docs/INDEX.md`: Index of reports, archives, migrations, docs.

## Open Risks
- [RISK-001] `docs/DEVELOPMENT_LOG.md`: Leftover `+` format characters from semi-auto patch. Needs clean.
- [RISK-002] `vite.config.ts`: Fragmented `manualChunks` breaks Recharts import. Re-verify if large dependencies added.
- [RISK-003] `ensure_project_mcp_configs.py`: Tries writing `%USERPROFILE%\.gemini\antigravity\mcp_config.json`. Might fail on permissions, doesn't block local configs.

## Next Refresh Triggers
- Rename/move major directories.
- Add/remove nested `AGENTS.md`.
- Modify architecture, storage schemas, or integrations.
