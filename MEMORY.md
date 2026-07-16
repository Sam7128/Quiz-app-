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
- Refreshed: `2026-07-16 20:13`
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
- [PATH-009] `eslint.config.js`

### Module Index
| ID | Path | Local AGENTS | Purpose | Tags |
|---|---|---|---|---|
| MOD-001 | `assets-prep/` | no | project module | assets-prep |
| MOD-002 | `components/` | yes | ui components | components |
| MOD-003 | `constants/` | yes | static definitions + domain data | constants |
| MOD-004 | `contexts/` | yes | shared context + state boundaries | contexts |
| MOD-005 | `docs/` | no | project documentation | docs |
| MOD-006 | `e2e/` | yes | end-to-end tests | e2e |
| MOD-007 | `hooks/` | yes | feature hooks + orchestration | hooks |
| MOD-008 | `openspec/` | yes | change planning + specs | openspec |
| MOD-009 | `public/` | no | static assets | public |
| MOD-010 | `Quiz-app-/` | no | project module | quiz-app- |
| MOD-011 | `reducers/` | no | project module | reducers |
| MOD-012 | `scripts/` | no | automation scripts | scripts |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none.
- Archived: `24`
- [OS-ARC-001] `openspec/changes/archive/2026-07-14-knowledge-graph-v2-upgrade/` (proposal, design, tasks, specs:5)
- [OS-ARC-002] `openspec/changes/archive/2026-07-16-battle-system-quality-overhaul/` (proposal, design, tasks, specs:4)
- [OS-ARC-003] `openspec/changes/archive/enhance-quiz-experience/` (proposal, design, tasks, specs:2)
- [OS-ARC-004] `openspec/changes/archive/quiz-ux-enhancement/` (proposal, tasks)
- [OS-ARC-005] `openspec/changes/archive/supabase-cloud-sync/` (proposal, tasks)

### Nested AGENTS
- [AG-001] `components/AGENTS.md` | [AG-002] `constants/AGENTS.md` | [AG-003] `contexts/AGENTS.md`
- [AG-004] `e2e/AGENTS.md` | [AG-005] `hooks/AGENTS.md` | [AG-006] `openspec/AGENTS.md`
- [AG-007] `services/AGENTS.md` | [AG-008] `src/__tests__/AGENTS.md`
<!-- END AUTO-GENERATED: MEMORY MAP -->

## Stable Facts
- [FACT-010] Keys `mindspark_` prefix. Data safety on migration.
- [FACT-011] Cloud questions. SM-2/mistakes localStorage.
- [FACT-012] Graph workspace functional + unit tested.
- [FACT-013] `.project-memory/project_memory_mcp_entry.py` memory tools.
- [FACT-014] Dedupe by `sourceQuestionKey` / `sourceFingerprint`.
- [FACT-015] Delete question cleans SM-2, mistakes, session.
- [FACT-016] Import UI summary before apply.
- [FACT-017] Import modes: `append` (default), `merge`, `replace`.
- [FACT-018] Practice draft: `mindspark_chunk_draft:<sessionId>:<chunkIndex>`.
- [FACT-019] Practice sync: LWW. Offline dirty fallback cache.
- [FACT-020] App + Quiz engine callbacks: `useCallback` prevent race.
- [FACT-021] Cloud save cleans practice cache (`removePracticeSessionCache`).
- [FACT-022] Git exclude `node_modules` + reserved names (`nul`).
- [FACT-023] Validate AI config via localStorage schema check.
- [FACT-024] Cloud empty checks prevent local overwrite.
- [FACT-025] Dynamic HMAC-SHA256 integrity, no local salt.
- [FACT-026] Reset battle on out-of-range bounds.
- [FACT-027] DB RPC `submit_challenge_score` resolves score winner.
- [FACT-028] Dead code scan: `npx -y knip --reporter compact`.
- [FACT-029] Code Hygiene: delete dead code, narrow exports.
- [FACT-030] Concurrency: `runWithSyncLock` (Web Locks + localStorage fallback).
- [FACT-031] FocusTimer: close AudioContext via `activeAudioContextsRef` on unmount.
- [FACT-032] Keyboard: `handlersRef`, empty deps `[]`.
- [FACT-033] Offline writes: `mindspark_dirty_banks` cleared on sync success.
- [FACT-034] GraphStorage: length limits, HTML escape, concat migration, fail-fast, Blob checks.
- [FACT-035] GraphLayout+Bridge: subtree-sector radial + density-aware rings; sticky/image preserve positions; MD parser, Nd > 12 auto-expand.
- [FACT-036] GraphUI: sticky limit 20, TipTap HTML note, unmount auto-flush, Base64 intercept, orphaned notes reconnect.
- [FACT-037] Workspace: scroll sync, Fullscreen Recovery on load error, visual/code split, MD serialize/restore.
- [FACT-038] Rule 11: Mark `openspec/changes/<name>/tasks.md` `[x]` before complete.
- [FACT-039] AI Prompts+Mermaid Import: AIPromptGuide Quiz+Graph tabs. GraphEditor import shows syntax limits + conversion prompt copy.
- [FACT-040] KG V2: Ancestor Path + Levenshtein ≤2 matching, no UUID in MD.
- [FACT-041] Graph images: safe http/https URLs + 4 standalone PNG/JPEG/WebP uploads; compressed to WebP data URLs inside JSON; reuse graph cloud sync (no public Storage).
- [FACT-042] Cloud sync: ConfirmDialog conflict resolution + save copy + online retry.
- [FACT-043] 3 core Hooks: `useGraphState`, `useGraphCodeMode`, `useGraphStorage`.
- [FACT-044] GraphErrorCode+GraphWarningCode enums; graphUtils, MermaidModal extracted; Hooks <150 lines; GraphCodeEditor amber rename hint.
- [FACT-045] `runHeuristicNodeMatching` in `graphUtils.ts`; `useGraphCodeMode.ts` 104 lines; all `: any` removed from challenger tests.
- [FACT-046] `graphCloudStorage.ts` LWW sync + `mindspark_dirty_graphs` queue; autosave upload + 2-layer ConfirmDialog; online retry; beta gate removed.
- [FACT-047] V1 audit fixes: schema v3 + migration, canonical GraphErrorCode, URL validation, dark-mode solid default.
- [FACT-048] Editor: 3 Hooks + DropNodeMenu (concept/rounded/diamond/sticky). Drag-create checks MAX_NODES/MAX_EDGES.
- [FACT-049] 6 branch-coherent presets via `constants/graphThemes.ts` + `utils/graphColorHelper.ts`; sticky/image preserved; radial moves concept only; solid bg `${color}CC`.
- [FACT-050] MD bridge uses `:` ancestor path separator. Levenshtein ≤2 + duplicate-path first-match tested. UI rename-warning. No UUID in MD.
- [FACT-051] `uploadGraphToCloudSafely` compares cloud timestamp before upsert. Conflict marks dirty. Supabase migration + RLS in `supabase/migrations/`.
- [FACT-052] 2026-07-14 KG UX hotfix: 41 tests/261, tsc zero, Vite build pass, UX + 31-node no-overlap Playwright.
- [FACT-053] 5 graph specs synced to `openspec/specs/`. V1 audit to `docs/audits/knowledge-graph-v2-upgrade/`.
- [FACT-054] Canonical layout: `applyAutoLayout`. Deprecated `applyDagreLayout` alias. `useGraphConflictResolver`. `setCodeErrors` dead export removed.
- [FACT-055] Graph cloud fallback: `PGRST205`/missing `knowledge_graphs` disables sync, preserves local, dedupes in-flight.
- [FACT-056] Node click opens `NodeQuickMenu` (edit, 8 shapes, add child, delete); drag-to-blank `DropNodeMenu`.
- [FACT-057] Free layout: concept draggable. Radial: subtree auto-placement, concepts locked, sticky/image draggable.
- [FACT-058] Self-loop/dangling edges removed after one-time backup at `mindspark_graphs_backup_pre_v3_cleanup`.
- [FACT-059] Supabase JS 2.110.5 for Auth Web Locks orphan recovery; Node >=22. `runWithSyncLock` returns native Promise.
- [FACT-060] KG shapes: hexagon SVG polygon, cloud SVG path multi-lobe. Progressive L1/L2/L3 via `hooks/graphStateUtils.ts`.
- [FACT-061] KG progressive reading branch-based: `hooks/graphStateUtils.ts` root+direct-child visibility + per-node toggle; `GraphEditor.tsx` filters hidden descendants.
- [FACT-062] Battle engine: `services/battle/battleEngine.ts` pure+injectable. `useBattleSystem` owns commit, V2 persistence, `useBattlePresentation` enqueue.
- [FACT-063] Battle V2: `mindspark_battle_state` legacy read-only. New writes to `mindspark_battle_state_v2`. No presentation/transient in snapshot.
- [FACT-064] Battle runtime media: `constants/battleAssetRegistry.ts` single manifest. 25-entry WebP/WebM pass validation.
- [FACT-065] Battle final verify 2026-07-16: 47 tests/301, tsc, build, 25 assets, Knip, lint 0 errors/warnings pass; Chromium 20 image dim/alpha + 25-answer flow.
- [FACT-066] Legacy renderers/state adapters removed; `BattleSkillOverlay`+`useBattlePresentation` only completion path. Evidence: `openspec/changes/battle-system-quality-overhaul/AUDIT_REPORT.md` v2.0.
- [FACT-067] Battle art plan: `docs/BATTLE_ART_ANIMATION_UPGRADE_PLAN.md`; `assets-prep/battle-visual-upgrade/production-source-v2/` 7 chroma masters + 7 alpha atlases. Not runtime-approved/registered.

## Active Decisions
- [DEC-001] Rules in `AGENTS.md`, facts in `MEMORY.md`. No `GEMINI.md`.
- [DEC-002] Components ban direct Storage/Supabase. Use services/hooks.
- [DEC-003] Local `.project-memory/` preferred over global.
- [DEC-004] `vite.config.ts`: React+Recharts+Framer in `vendor-ui-core` chunk.
- [DEC-005] Build: `vite build`. Avoid Windows path permission issues.
- [DEC-006] Ban `any`. Use `unknown` + Type Guards.
- [DEC-007] E2E: click custom Confirm buttons, no `window.alert`.
- [DEC-008] KG radial layout only; dagre removed.
- [DEC-009] Autosave: `uploadGraphToCloudSafely`, never overwrite newer timestamps.
- [DEC-010] `applyDagreLayout` deprecated alias until 2026-10-01; new callers use `applyAutoLayout`.
- [DEC-011] Supabase migration `20260714000000_create_knowledge_graphs.sql` must apply remotely; client local fallback for stale schema-cache.
- [DEC-012] Graph images private to JSON/offline + sync; no public Storage without design.
- [DEC-013] `battle-system-quality-overhaul` archived (`openspec/changes/archive/2026-07-16-battle-system-quality-overhaul/`). Pure engine, durable/presentation split, hidden cancel-to-settle, V1 read-only/V2 new key, single pending encounter (Boss supersedes Elite), single asset registry. No sharp, custom cache, second audio controller or cross-hardware gate.

## Hotspots
- [HOT-001] `App.tsx` & `vite.config.ts`: Chunking & providers.
- [HOT-002] Storage schemas: backward compatibility.
- [HOT-003] RPG battle vs Quiz engine sync.
- [HOT-004] Graph components & storage.
- [HOT-005] Stable ID generation during JSON/AI import.
- [HOT-006] Practice session state recovery.
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
- [DOC-001] `docs/INDEX.md`: index.

## Open Risks
- [RISK-001] DEVELOPMENT_LOG.md format cleanup.
- [RISK-002] `vite.config.ts` chunk sizes.
- [RISK-003] MCP config script permissions.
- [RISK-004] Playwright CLI/webServer teardown hangs Windows/Codex; direct Chromium via `webapp-testing` helper exits cleanly.
- [RISK-006] Supabase `public.knowledge_graphs` not in schema cache; graph cloud sync local-only until migration deployed.
- [RISK-007] `production-source-v2` battle atlases are key-pose sources, not shippable sprites; need slicing, cleanup, alignment, frame production, browser QA.

## Next Refresh Triggers
- Move dirs, add/remove `AGENTS.md`, schema updates.
