# MEMORY.md

## Purpose
- [FACT-001] React+TS+Vite SPA. Storage: localStorage + Supabase. Architecture: Domain hooks + service layer.

## Source of Truth
- [PATH-001] `AGENTS.md`: rules, routing.
- [PATH-002] `types.ts`: TS schema.
- [PATH-003] `App.tsx`: main wrapper.
- [PATH-004] `services/` & `hooks/`: I/O, domain logic.
- [PATH-005] `docs/DEVELOPMENT_LOG.md`: change log.
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
- Refreshed: `2026-10-04 17:18`
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
- [PATH-009] `dashboard.png`
- [PATH-010] `eslint.config.js`

### Module Index
| ID | Path | Local AGENTS | Purpose | Tags |
|---|---|---|---|---|
| MOD-001 | `assets-prep/` | no | important project module | assets-prep |
| MOD-002 | `components/` | yes | ui components | components |
| MOD-003 | `constants/` | yes | static definitions and domain data | constants |
| MOD-004 | `contexts/` | yes | shared context and state boundaries | contexts |
| MOD-005 | `docs/` | no | project documentation | docs |
| MOD-006 | `e2e/` | yes | end-to-end tests | e2e |
| MOD-007 | `hooks/` | yes | feature hooks and orchestration | hooks |
| MOD-008 | `openspec/` | yes | change planning and specs | openspec |
| MOD-009 | `public/` | no | static assets | public |
| MOD-010 | `reducers/` | no | important project module | reducers |
| MOD-011 | `scripts/` | no | automation scripts | scripts |
| MOD-012 | `services/` | yes | service and integration logic | services |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none detected.
- Archived changes: `29`
- [OS-ARC-001] `openspec/changes/archive/2026-10-04-p1-data-integrity-and-runtime-hardening/` (proposal, design, tasks, specs:3)
- [OS-ARC-002] `openspec/changes/archive/2026-10-04-p1-learning-experience-and-stats/` (proposal, design, tasks, specs:6)
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
- [FACT-010] Keys use `mindspark_` prefix. Backup before storage migration.
- [FACT-011] Questions in Supabase. SM-2 & mistakes in localStorage.
- [FACT-012] Knowledge graph workspace tested via Vitest & Playwright.
- [FACT-013] Local memory MCP entry: `.project-memory/project_memory_mcp_entry.py`.
- [FACT-014] Dedupe via `sourceQuestionKey` & `sourceFingerprint`.
- [FACT-015] Delete question cascades to SM-2, mistake logs, active session.
- [FACT-016] Import dialog requires user confirm before apply.
- [FACT-017] Import modes: `append` (default), `merge`, `replace`.
- [FACT-018] Chunk draft: `mindspark_chunk_draft:<sessionId>:<chunkIndex>`.
- [FACT-019] Chunk sync: LWW strategy. Offline dirty fallback queue.
- [FACT-020] App + QuizEngine callbacks wrap in `useCallback` prevent race.
- [FACT-021] Cloud save purges practice cache (`removePracticeSessionCache`).
- [FACT-022] Git ignore `node_modules` & reserved filenames (`nul`).
- [FACT-023] Validate AI config via localStorage schema guard.
- [FACT-024] Cloud empty check blocks overwriting local non-empty data.
- [FACT-025] Dynamic HMAC-SHA256 integrity, no hardcoded salt.
- [FACT-026] Reset battle state on boundary out-of-range.
- [FACT-027] DB RPC `submit_challenge_score` resolves ties.
- [FACT-028] Dead code audit: `npx -y knip --reporter compact`.
- [FACT-029] Code hygiene: delete dead exports, keep minimal surface.
- [FACT-030] Concurrency lock: `runWithSyncLock` (Web Locks + localStorage fallback).
- [FACT-031] FocusTimer: close AudioContext via `activeAudioContextsRef` on unmount.
- [FACT-032] Keyboard shortcuts: `handlersRef`, dependency array `[]`.
- [FACT-033] Offline writes: `mindspark_dirty_banks` cleared on sync success.
- [FACT-034] GraphStorage: length limits, HTML sanitize, concat migration, fail-fast.
- [FACT-035] GraphLayout: radial + density rings; sticky/image fixed; MD parser auto-expand.
- [FACT-036] GraphUI: max 20 stickies, TipTap HTML note, unmount auto-flush, Base64 guard.
- [FACT-037] GraphWorkspace: scroll sync, Fullscreen Recovery, visual/code split.
- [FACT-038] Rule 11: Mark `openspec/changes/<name>/tasks.md` `[x]` before completion.
- [FACT-039] AIPromptGuide Quiz+Graph tabs. GraphEditor import shows syntax limits.
- [FACT-040] KG V2: Ancestor Path + Levenshtein ≤2 match, no UUID in markdown.
- [FACT-041] Graph images: WebP data URL inside JSON, max 4 standalone uploads.
- [FACT-042] Cloud sync: ConfirmDialog conflict fork + local copy + retry.
- [FACT-043] 3 core graph hooks: `useGraphState`, `useGraphCodeMode`, `useGraphStorage`.
- [FACT-044] GraphErrorCode & GraphWarningCode enums; MermaidModal extracted; hooks <150 lines.
- [FACT-045] `runHeuristicNodeMatching` in `graphUtils.ts`; all `: any` removed from tests.
- [FACT-046] `graphCloudStorage.ts` LWW sync + `mindspark_dirty_graphs` queue; online retry.
- [FACT-047] V1 audit fixes: schema v3 + migration, URL validation, solid dark default.
- [FACT-048] GraphEditor: DropNodeMenu drag-create checks MAX_NODES & MAX_EDGES.
- [FACT-049] 6 branch presets via `constants/graphThemes.ts` + `utils/graphColorHelper.ts`.
- [FACT-050] MD bridge uses `:` separator. Levenshtein ≤2 duplicate-path first match.
- [FACT-051] `uploadGraphToCloudSafely` checks timestamp before upsert. Conflict marks dirty.
- [FACT-052] KG UX hotfix: 41 tests/261, tsc zero, Vite build pass, 31-node no-overlap.
- [FACT-053] 5 graph specs synced to `openspec/specs/`. V1 audit in `docs/audits/`.
- [FACT-054] Canonical layout: `applyAutoLayout`; `applyDagreLayout` purged 2026-09-13.
- [FACT-055] Graph cloud fallback: missing `knowledge_graphs` degrades local-only.
- [FACT-056] Node click opens `NodeQuickMenu`; drag-to-blank opens `DropNodeMenu`.
- [FACT-057] Free layout: concepts draggable. Radial layout: concepts locked, stickies free.
- [FACT-058] Self-loops & dangling edges purged with backup at `mindspark_graphs_backup_pre_v3_cleanup`.
- [FACT-059] Supabase JS 2.110.5 Auth Web Locks fix. Node >=22. `runWithSyncLock` returns Promise.
- [FACT-060] KG shapes: hexagon SVG, cloud SVG. Progressive L1/L2/L3 via `graphStateUtils.ts`.
- [FACT-061] Progressive reading: root + direct child visibility; filters hidden branch.
- [FACT-062] Battle engine: `battleEngine.ts` pure + injectable. `useBattleSystem` owns commit & V2 persistence.
- [FACT-063] Battle V2: writes to `mindspark_battle_state_v2`. No transient states in snapshot.
- [FACT-064] Battle assets: `constants/battleAssetRegistry.ts` single manifest, 25 WebP/WebM assets.
- [FACT-065] Battle test suite: 47 tests/301, tsc, build, Knip 0, Chromium visual pass.
- [FACT-066] Legacy renderers purged; `BattleSkillOverlay` + `useBattlePresentation` sole path.
- [FACT-067] Battle art pipeline: 7 chroma masters + 7 alpha atlases in `assets-prep/`.
- [FACT-068] `battle-visual-upgrade`: 26 actions, 12 VFX, 9 skills, 5 envs, 12 audio cues promoted.
- [FACT-069] `battle-visual-upgrade` audit v2.0 closed: 38 tasks, 47 files/319 Vitest, 7 Chromium.
- [FACT-070] Concurrency remediation: C1 upsert retry + isolated catch + cache loss guard; C2 chunk set-union; H1 index mutex lock; H2 node switch flush; H3 jitter token; P1 dagre purged; M1 visual guard; IW-2 variants module scope.
- [FACT-071] Concurrency audit: automated gates green, cloud-leading merge, beforeunload flush verified.
- [FACT-072] Codebase audit: 50-round review in `docs/CODEBASE_INNOVATION_AND_IMPROVEMENT_REPORT.md`.
- [FACT-097] P0 Core & Security: `spaced_due` preserves urgency without shuffle; hotkey modifier/IME guards; `dateUtils.ts` local timezone; `clearUserDataOnSignOut` dual try-catch; `BattleArena` compact laptop layout (25vh/28vh).

## Active Decisions
- [DEC-001] Rules in `AGENTS.md`, facts in `MEMORY.md`. No `GEMINI.md`.
- [DEC-002] Components ban direct Storage/Supabase. Route through services/hooks.
- [DEC-003] Prefer local `.project-memory/` over global memory.
- [DEC-004] `vite.config.ts`: React+Recharts+Framer bundled in `vendor-ui-core` chunk.
- [DEC-005] Production build command: `vite build`.
- [DEC-006] Strict TypeScript: ban `any`. Use `unknown` + type guards.
- [DEC-007] E2E tests click custom Confirm buttons; ban `window.alert`.
- [DEC-008] Knowledge Graph uses radial layout only; dagre removed.
- [DEC-009] Autosave uses `uploadGraphToCloudSafely`; never overwrite newer remote timestamp.
- [DEC-010] `applyDagreLayout` purged; `applyAutoLayout` canonical layout everywhere.
- [DEC-011] Supabase migration `20260714000000_create_knowledge_graphs.sql` deployed; client fallback local.
- [DEC-012] Graph images stored as data URLs in JSON; no public storage bucket.
- [DEC-013] Battle architecture: pure engine, durable/presentation split, single asset registry.
- [DEC-014] Battle testing: Node 22 + `pngjs` + Playwright Canvas. Audio registry lookup.
- [DEC-015] Runtime asset lookup from `battleAssetRegistry.ts`; UI states do not widen actions.
- [DEC-016] P0 Security & UX: `getLocalDateString()` for local dates; multi-tenant sign-out cleanup; IME hotkey guard; `spaced_due` urgency order; unmount isolation.
- [DEC-017] P1 Learning Experience: 3-state single / 4-state multi comparison with set ops & WCAG ARIA; `autoAdvanceOnCorrect` (800ms standard/400ms battle, 2000ms deadline, Enter/unmount cleanup); achievement allowlist pruning (4 items, 100% Set alignment); settlement CAS gate (`sessionType: 'quiz' | 'focus'`).
- [DEC-018] P1 Audit Remediation (OPUS_X7R2): `settleCurrentSession` marks settled only upon storage success; chunk multi-point settlement defense (`onChunkComplete` + summary CTA retry); `handleExitQuiz` async await eliminates race; dynamic ARIA label `正確答案: ${opt}`; timers cleared on transition; dead code purged.
- [DEC-019] P1 Settlement Resilience Final Closure: `settleCurrentSession` returns `Promise<boolean>`; `handleExitQuiz` retains `sessionStartTime` upon failure with toast warning; `onChunkComplete` blocks advancement on failure with completion id reset; `AppHeader` & `MobileNav` intercept mid-quiz exits via `handleHeaderNavigate` (W-04).
- [DEC-020] QuizResult Props Async Alignment: `onRetry`, `onRestart`, `onHome` support `() => void | Promise<void>`; `AppContent` awaits `quizEngine.handleExitQuiz()`.
- [DEC-021] P1 Data Integrity & Runtime Hardening: `isQuestion`/`parseQuestions` unknown guards with 5-warn aggregation; storage read/write two-way closed defense; BOM `^\uFEFF+` sanitization & Blob URL 1000ms delay revoke; Howler lazy singleton audio cue (`stop()` without `unload()`); `use-sound` purged; inline `<head>` theme bootstrap fail-open to light.
- [DEC-022] P1 V8Q3 Audit Hardening: `isQuestion` validates explicit `type` × `answer` shape; cloud storage enforces `parseQuestions` on read/write/retry & protects `forceDeleteAll`; BankManager Toast reflects `data.length`; export timers cleaned on unmount; Playwright E2E smoke tests verified.

## Hotspots
- [HOT-001] `App.tsx` & `vite.config.ts`: Chunking & providers.
- [HOT-002] Storage schemas: backward compatibility & migrations.
- [HOT-003] RPG battle vs Quiz engine synchronization.
- [HOT-004] Knowledge graph components & storage layer.
- [HOT-005] Stable ID generation during JSON/AI import.
- [HOT-006] Practice session state recovery & draft eviction.
- [HOT-007] Cloud sync concurrency & dirty queue flushing.
- [HOT-008] Git hygiene: Vercel fails if `node_modules` committed.

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
- [DOC-001] `docs/INDEX.md`: documentation index.
- [DOC-002] `openspec/changes/archive/2026-10-04-p1-learning-experience-and-stats/repair_plan.md`: remediation plan.

## Open Risks
- [RISK-001] DEVELOPMENT_LOG.md format maintenance.
- [RISK-002] `vite.config.ts` chunk sizes (>500kB vendor-ui-core warning).
- [RISK-003] MCP config script permissions.
- [RISK-004] Playwright CLI/webServer teardown hangs on Windows; use direct Chromium helper.
- [RISK-006] Supabase `public.knowledge_graphs` not in schema cache; local-only fallback active.
- [RISK-007] 7 unused source-only assets: `hero:victory`, `skeleton_wizard:cast`, `dragon_fire:fire-breath`, `environment-rubble`, `environment-ice-motes`, `environment-sparks`, `battle_victory.ogg`.
- [RISK-008] [RESOLVED 2026-09-13] `cloudStorage.ts:retryCleanupDirtyBanks` upsert retry + isolated catch + cache loss guard + bank_id filter.
- [RISK-009] [RESOLVED 2026-09-13] `cloudStorage.ts:syncLocalPracticeSessions` chunk set-union merge + draft reconcile.
- [RISK-010] [RESOLVED 2026-09-13] `hooks/useQuizEngine.ts:handleAnswer` synchronous mutex lock.
- [RISK-011] [RESOLVED 2026-09-13] `NodeEditPanel.tsx` unmount/node-switch flush + beforeunload flush.
- [RISK-012] [RESOLVED 2026-09-14] C2 cloud-leading branch uses `mergedSession` for local writeback + score/progress upload triggers.
- [RISK-013] [RESOLVED 2026-09-14] C2 chunk set-union merge uses indexed reconciliation.
- [RISK-014] [RESOLVED 2026-09-14] KnowledgeGraph beforeunload uses synchronous flush bridge + timer cleanup.
- [RISK-015] [RESOLVED 2026-09-29] P0 5 Core & Security Fixes (SM-2 review, hotkeys, local timezone, sign-out isolation, compact battle arena).
- [RISK-016] [RESOLVED 2026-09-29] P1 Learning Experience & Stats (Wrong answer comparison, auto-advance, achievement pruning, settlement CAS gate, FocusTimer stats, E2E suite).
- [RISK-017] [RESOLVED 2026-10-04] P1 Audit Remediation & Final Surgical Closure (C-01, C-02, W-01, W-02, W-03, W-04, W-05, W-06, P-01, P-02).
- [RISK-018] [RESOLVED 2026-10-04] P1 Data Integrity & Runtime Hardening (TypeGuards, Storage read/write defense, BOM sanitization, Blob export, Howler audio singleton, use-sound removal, Theme FOUC bootstrap).
- [RISK-019] [RESOLVED 2026-10-04] P1 V8Q3 Cross-Validation Audit Defect Closure (W-01 type×answer cross-validation, W-02 cloud read/write guards & forceDeleteAll safety, W-03 Toast import count accuracy, S-01 export unmount cleanup, P-01 Playwright E2E smoke suite 4/4 passed).

## Next Refresh Triggers
- Directory moves, add/remove `AGENTS.md`, schema migrations.
