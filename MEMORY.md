# MEMORY.md

## Purpose
- [FACT-001] React+TS+Vite SPA. persist: localStorage + Supabase. Domain hooks + service layer.

## Source of Truth
- [PATH-001] `AGENTS.md`: rules, index.
- [PATH-002] `types.ts`: TS models.
- [PATH-003] `App.tsx`: main wrapper.
- [PATH-004] `services/` & `hooks/`: I/O, domain logic.
- [PATH-005] `docs/DEVELOPMENT_LOG.md`: changes log.
- [PATH-006] `openspec/`: spec history.

## Aliases & Vocabulary
- [ALIAS-001] "bank manager" -> `components/BankManager.tsx`, `services/storage.ts`
- [ALIAS-002] "quiz flow" -> `hooks/useQuizEngine.ts`, `reducers/appReducer.ts`
- [ALIAS-003] "battle" -> `hooks/useBattleSystem.ts`, `components/BattleArena.tsx`
- [ALIAS-004] "knowledge graph" -> `components/KnowledgeGraph/`, `services/graphStorage.ts`
- [ALIAS-005] "Supabase" -> `contexts/AuthContext.tsx`, `services/supabase.ts`
- [ALIAS-006] "project memory" -> `MEMORY.md`, `.project-memory/`

## Entry Points
- [ENTRY-001] `AGENTS.md`: Read first.
- [ENTRY-002] `App.tsx`: Providers, routing.
- [ENTRY-003] `types.ts`: TS Schema.
- [ENTRY-004] `services/storage.ts`: localStorage.

<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->
## Auto-Generated Memory Map
- Refreshed: `2026-07-15 11:09`
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
| MOD-001 | `assets-prep/` | no | project assets preparation | assets-prep |
| MOD-002 | `components/` | yes | ui components | components |
| MOD-003 | `constants/` | yes | static definitions and domain data | constants |
| MOD-004 | `contexts/` | yes | shared context and state boundaries | contexts |
| MOD-005 | `docs/` | no | project documentation | docs |
| MOD-006 | `e2e/` | yes | end-to-end tests | e2e |
| MOD-007 | `hooks/` | yes | feature hooks and orchestration | hooks |
| MOD-008 | `openspec/` | yes | change planning and specs | openspec |
| MOD-009 | `public/` | no | static assets | public |
| MOD-010 | `Quiz-app-/` | no | project submodule | quiz-app- |
| MOD-011 | `reducers/` | no | reducers | reducers |
| MOD-012 | `services/` | yes | service and integration logic | services |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none.
- Archived changes: `23`
- [OS-ARC-001] `2026-07-12-knowledge-graph-enhancements/` (proposal, design, tasks, specs:6)
- [OS-ARC-002] `2026-07-14-knowledge-graph-v2-upgrade/` (proposal, design, tasks, specs:5)
- [OS-ARC-003] `enhance-quiz-experience/` (proposal, design, tasks, specs:2)
- [OS-ARC-004] `quiz-ux-enhancement/` (proposal, tasks)
- [OS-ARC-005] `supabase-cloud-sync/` (proposal, tasks)

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
- [FACT-010] Keys: `mindspark_` prefix; data safety on migration.
- [FACT-011] Questions in Cloud. SM-2/mistakes in localStorage.
- [FACT-012] Graph workspace fully functional + unit tested.
- [FACT-013] `.project-memory/project_memory_mcp_entry.py` exposes memory tools.
- [FACT-014] Dedupe by `sourceQuestionKey` / `sourceFingerprint`.
- [FACT-015] Delete question cleans SM-2, mistakes, active session.
- [FACT-016] Import UI summary before apply.
- [FACT-017] Import modes: `append` (default), `merge`, `replace`.
- [FACT-018] Practice draft: `mindspark_chunk_draft:<sessionId>:<chunkIndex>`.
- [FACT-019] Practice sync: LWW. Offline dirty fallback cache.
- [FACT-020] App + Quiz engine callbacks: `useCallback` prevent race conditions.
- [FACT-021] Cloud save cleans practice cache (`removePracticeSessionCache`).
- [FACT-022] Git: exclude `node_modules` + reserved names (e.g., `nul`).
- [FACT-023] Validate AI config via localStorage schema check.
- [FACT-024] Cloud empty checks before local sync prevent overwrite.
- [FACT-025] Dynamic HMAC-SHA256 integrity, no local salt.
- [FACT-026] Reset battle state on out-of-range bounds.
- [FACT-027] DB RPC `submit_challenge_score` resolves score winner.
- [FACT-028] Dead code scan: `npx -y knip --reporter compact`.
- [FACT-029] Code Hygiene spec: delete dead code, narrow export scopes.
- [FACT-030] Concurrency: `runWithSyncLock` (Web Locks + localStorage fallback).
- [FACT-031] FocusTimer: close AudioContext via `activeAudioContextsRef` on unmount.
- [FACT-032] Keyboard shortcuts: `handlersRef` pattern, empty deps `[]`.
- [FACT-033] Offline writes: `mindspark_dirty_banks` cleared on cloud sync success.
- [FACT-034] GraphStorage: length limits, HTML escape, concat migration, fail-fast, Blob checks.
- [FACT-035] GraphLayout & Bridge: subtree-sector radial layout + density-aware rings; sticky/image nodes preserve positions; MD parser, Nd > 12 auto-expand.
- [FACT-036] GraphUI: sticky limit (20), TipTap HTML note, unmount auto-flush, Base64 intercept, orphaned notes reconnect.
- [FACT-037] Workspace: scroll sync, Fullscreen Recovery on fatal load error, visual/code split, MD serialization/restoration.
- [FACT-038] Rule 11: Mark `openspec/changes/<name>/tasks.md` `[x]` before completion.
- [FACT-039] AI Prompts & Mermaid Import: AIPromptGuide supports Quiz + Graph tabs. GraphEditor import modal shows syntax limits + conversion prompt copy.
- [FACT-040] KG V2: Ancestor Path + Heuristic Levenshtein ≤2 matching, no UUID in MD.
- [FACT-041] Graph images: safe external http/https URLs + up to 4 standalone PNG/JPEG/WebP uploads; compressed to bounded WebP data URLs inside graph JSON; reuse graph cloud sync (no public Storage bucket).
- [FACT-042] Cloud sync: ConfirmDialog conflict resolution + save copy + online retry.
- [FACT-043] 3 core Hooks: `useGraphState`, `useGraphCodeMode`, `useGraphStorage`.
- [FACT-044] GraphErrorCode + GraphWarningCode enums; graphUtils, MermaidModal extracted; Hooks <150 lines; GraphCodeEditor amber rename hint banner.
- [FACT-045] `runHeuristicNodeMatching` extracted to `graphUtils.ts`; `useGraphCodeMode.ts` shrunk to 104 lines; all `: any` removed from challenger tests.
- [FACT-046] `graphCloudStorage.ts` LWW sync + `mindspark_dirty_graphs` queue; autosave upload + 2-layer ConfirmDialog conflict resolution; online auto-retry; beta gate removed.
- [FACT-047] V1 audit fixes: schema v3 + migration, canonical GraphErrorCode, URL validation, dark-mode default solid.
- [FACT-048] Editor: 3 Hooks + DropNodeMenu (concept/rounded/diamond/sticky). Drag-create checks MAX_NODES/MAX_EDGES.
- [FACT-049] Six branch-coherent presets via `constants/graphThemes.ts` + `utils/graphColorHelper.ts`; sticky/image nodes preserved; radial moves concept nodes only; solid bg uses `${color}CC`.
- [FACT-050] MD bridge uses `:` ancestor path separator. Levenshtein ≤2 heuristic + duplicate-path first-match tested. UI rename-warning shown. No UUID in MD.
- [FACT-051] `uploadGraphToCloudSafely` compares cloud timestamp before upsert. Conflict marks dirty. Supabase migration + RLS in `supabase/migrations/`.
- [FACT-052] 2026-07-14 KG UX hotfix verification: 41 test files / 261 tests, tsc zero, Vite build passed, plus focused UX and 31-node no-overlap Playwright tests.
- [FACT-053] 5 graph capability specs synced to `openspec/specs/`. V1 audit artifacts moved to `docs/audits/knowledge-graph-v2-upgrade/`.
- [FACT-054] Canonical auto-layout: `applyAutoLayout`. Deprecated `applyDagreLayout` alias. `useGraphConflictResolver` in `useGraphStorage`. `setCodeErrors` dead export removed. ConceptNode shape guard.
- [FACT-055] Graph cloud fallback: `PGRST205`/missing `knowledge_graphs` disables cloud sync for session, preserves local graphs, deduplicates same-user in-flight sync requests.
- [FACT-056] Node handle click opens `NodeQuickMenu` (edit, 8 shapes, add child, delete); drag-to-blank uses `DropNodeMenu`.
- [FACT-057] Free layout permits concept dragging; radial layout applies subtree-aware auto-placement, locks concepts, keeps sticky/image draggable.
- [FACT-058] Self-loop/dangling edges removed during normalization after one-time raw backup at `mindspark_graphs_backup_pre_v3_cleanup`.
- [FACT-059] Supabase JS 2.110.5 required for Auth Web Locks orphan-lock recovery; Node engine >=22. `runWithSyncLock` returns native lock Promise so AbortError observable.
- [FACT-060] KG shapes: hexagon uses SVG polygon with complete stroke; cloud uses SVG path with multiple lobes. Progressive reading cycles L1/L2/L3 via `hooks/graphStateUtils.ts`.
- [FACT-061] KG progressive reading branch-based: `hooks/graphStateUtils.ts` exposes root-plus-direct-child visibility + per-node branch toggling; `GraphEditor.tsx` filters hidden descendant nodes/edges while preserving full graph in state.

## Active Decisions
- [DEC-001] Rules in `AGENTS.md`, facts in `MEMORY.md`. No `GEMINI.md`.
- [DEC-002] Components ban direct Storage/Supabase access. Use services/hooks.
- [DEC-003] Local wrapper `.project-memory/` preferred over global.
- [DEC-004] `vite.config.ts`: React+Recharts+Framer in `vendor-ui-core` chunk.
- [DEC-005] Build: `vite build`. Avoid Windows path permission issues.
- [DEC-006] Ban `any` in Storage/JSON parse. Use `unknown` + Type Guards.
- [DEC-007] E2E: click custom Confirm buttons, no `window.alert` listeners.
- [DEC-008] KG layout uses radial algorithm only; dagre dependency removed.
- [DEC-009] Autosave cloud: `uploadGraphToCloudSafely`, never silently overwrite newer timestamps.
- [DEC-010] `applyDagreLayout` kept as deprecated alias until 2026-10-01; new callers use `applyAutoLayout`.
- [DEC-011] Supabase migration `20260714000000_create_knowledge_graphs.sql` must be applied remotely for graph cloud sync; client local-only fallback for stale schema-cache envs.
- [DEC-012] Uploaded graph images stay private to graph JSON/offline storage + existing graph sync; no public Storage bucket without privacy/capacity design.

## Hotspots
- [HOT-001] `App.tsx` & `vite.config.ts`: Chunking & providers.
- [HOT-002] Storage schemas: backward compatibility.
- [HOT-003] RPG battle system vs Quiz engine sync.
- [HOT-004] Graph components & storage files.
- [HOT-005] Stable ID generation during JSON/AI import.
- [HOT-006] Practice sessions state recovery lifecycle.
- [HOT-007] Cloud sync concurrency.
- [HOT-008] Git: Vercel fail if `node_modules` committed.

## Search Recipes
- [RG-001] `rg -n "mindspark_" services hooks components`
- [RG-002] `rg -n "useBattleSystem|battle" hooks components`
- [RG-003] `rg -n "graph|KnowledgeGraph" components services`
- [RG-004] `rg -n "Supabase|cloudStorage" contexts services`
- [RG-005] `rg -n "sourceQuestionKey|sourceFingerprint" components services`
- [RG-006] `rg -n "planQuestionImport|importMode" components`
- [RG-007] `rg -n "useChunkedPractice" App.tsx hooks`
- [RG-008] `rg -n "\"build\"|vite" package.json`
- [RG-009] `npx -y knip --reporter compact`
- [RG-010] `rg -n "schemaVersion|backgroundOpacity|layoutMode" types services components hooks`

## Archive Index
- [DOC-001] `docs/INDEX.md`: index file.

## Open Risks
- [RISK-001] DEVELOPMENT_LOG.md: format cleanup.
- [RISK-002] `vite.config.ts` chunk sizes.
- [RISK-003] permissions for local MCP config script.
- [RISK-004] Playwright CLI knowledge-graph suite can hang local runner; Node/Playwright smoke path passes.
- [RISK-005] knip reports pre-existing unused files/exports + unlisted dependency.
- [RISK-006] Supabase project `public.knowledge_graphs` not exposed in schema cache; graph cloud sync local-only until migration deployed.

## Next Refresh Triggers
- Move dirs, add/remove `AGENTS.md`, schema updates.
