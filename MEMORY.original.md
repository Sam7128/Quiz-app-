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
- Refreshed: `2026-10-04 11:08`
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
- Archived changes: `28`
- [OS-ARC-001] `openspec/changes/archive/2026-09-29-fix-p0-core-experience-and-security/` (proposal, design, tasks, specs:5)
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
- [FACT-041] Graph images: safe http/https URLs + 4 standalone PNG/JPEG/WebP uploads; compressed to WebP data URLs inside JSON; reuse graph cloud sync.
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
- [FACT-054] Canonical layout: `applyAutoLayout`; `applyDagreLayout` alias purged 2026-09-13. `useGraphConflictResolver`. `setCodeErrors` dead export removed.
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
- [FACT-067] Battle art plan: `docs/BATTLE_ART_ANIMATION_UPGRADE_PLAN.md`; `assets-prep/battle-visual-upgrade/production-source-v2/` 7 chroma masters + 7 alpha atlases.
- [FACT-068] `battle-visual-upgrade` done 2026-07-20. Promoted: 26 action, 12 VFX phase, 9 skill img, 5 env overlay, 12 audio cue -> runtime.
- [FACT-069] `battle-visual-upgrade` final audit v2.0 closed 2026-07-20. 38/38 tasks, 47 files/319 Vitest, 7/7 Chromium, Knip 0, Ponytail actionable 0.
- [FACT-070] 2026-09-13 sync & concurrency remediation: C1 upsert retry + isolated catch + D7-001 cache loss guard + D6-001 eq('bank_id'); C2 D7-002 chunk set-union merge + draft reconcile; H1 D4-001 question index mutex lock; H2 D10-001 node switch & beforeunload flush; H3 TOCTOU jitter token double-check; P1 applyDagreLayout purged; M1 canSwitchToVisual hard guard; IW-2 PAGE_TRANSITION_VARIANTS module scope.
- [FACT-071] 2026-09-13 independent final audit: automated gates remain green, C2 cloud-leading merge, positional chunk lookup, NodeEditPanel beforeunload persistence verified.
- [FACT-072] 2026-09-28: 50-round codebase & innovation audit completed in `docs/CODEBASE_INNOVATION_AND_IMPROVEMENT_REPORT.md` covering SM-2, KG, RPG, AI, storage, security & UX.
- [FACT-097] 2026-09-29 fix-p0-core-experience-and-security: resolved 5 P0 defects: (1) `spaced_due` review entry & urgency order preservation without shuffle; (2) `useKeyboardShortcuts` modifier/IME guards; (3) `dateUtils.ts` (`getLocalDateString`) local timezone formatting; (4) `clearUserDataOnSignOut` dual try-catch isolation preserving theme/audio whitelist + `AppSessionContainer` unmount lifecycle isolation; (5) `BattleArena` compact layout (`max-h-[25vh] md:max-h-[28vh]`, `min-h-[80px] md:min-h-[110px]`, `w-16 h-20 md:w-24 md:h-28`) ensuring 1366x768 laptop zero-scroll viewport geometry.

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
- [DEC-010] [PURGED 2026-09-13] `applyDagreLayout` alias completely purged; canonical `applyAutoLayout` used everywhere.
- [DEC-011] Supabase migration `20260714000000_create_knowledge_graphs.sql` must apply remotely; client local fallback for stale schema-cache.
- [DEC-012] Graph images private to JSON/offline + sync; no public Storage without design.
- [DEC-013] Battle: Pure engine, durable/presentation split, V1 read-only/V2 new key, single pending encounter, single asset registry.
- [DEC-014] Battle visual: Node 22 + `pngjs` + Playwright Canvas. Audio: `cue-<BattleSoundCue>` registry-only.
- [DEC-015] Battle asset registry: runtime lookup only. Manifest provenance; UI-only states do not widen `BattleAssetAction`; BGM+cues resolve from same registry.
- [DEC-016] P0 Security & UX: `getLocalDateString()` replaces `toISOString` for local dates, `clearUserDataOnSignOut()` protects multi-tenant auth isolation, `useKeyboardShortcuts` ignores modifier keys and IME composition, `spaced_due` mode preserves urgency ordering without shuffle, `AppSessionContainer` ensures leak-proof unmount.
- [DEC-017] P1 Learning Experience & Stats: Wrong answer comparison (3-state single, 4-state multi with set ops, WCAG text prefixes & ARIA), `autoAdvanceOnCorrect` (800ms standard/400ms battle, 2000ms deadline, cancel on Enter/manual/unmount, last question completion), achievement allowlist pruning (4 items, 100% Set bidirectional alignment), study session settlement CAS gate with `sessionType: 'quiz' | 'focus'` discrimination & fault-isolated navigation.
- [DEC-018] P1 Audit Remediation (OPUS_X7R2): `settleCurrentSession` marks settled only upon storage success preserving retry capability (C-01), chunked practice multi-point settlement defense (`onChunkComplete` + summary CTA retry) (C-02), `handleExitQuiz` async await eliminating state clear race (W-06), dynamic ARIA label contract `正確答案: ${opt}` (W-01), timers cleared on question transition & next (W-05), dead code/token pruning in AppContent & useQuizEngine (P-01/P-02).
- [DEC-019] P1 Settlement Resilience Final Closure: `settleCurrentSession` returns `Promise<boolean>` for deterministic state tracking; `handleExitQuiz` retains `sessionStartTime` upon failure with warning toast; `onChunkComplete` blocks session advancement on failure with completion id reset; `AppHeader` & `MobileNav` intercept mid-quiz exits via `handleHeaderNavigate` (W-04).
- [DEC-020] QuizResult Props Async Alignment: `onRetry`, `onRestart`, `onHome` support `() => void | Promise<void>`; `AppContent` awaits `quizEngine.handleExitQuiz()`.

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
- [DOC-002] `openspec/changes/archive/2026-10-04-p1-learning-experience-and-stats/repair_plan.md`: remediation plan.

## Open Risks
- [RISK-001] DEVELOPMENT_LOG.md format maintenance.
- [RISK-002] `vite.config.ts` chunk sizes.
- [RISK-003] MCP config script permissions.
- [RISK-004] Playwright CLI/webServer teardown hangs Windows/Codex; direct Chromium via helper exits cleanly.
- [RISK-006] Supabase `public.knowledge_graphs` not in schema cache; graph cloud sync local-only until migration deployed.
- [RISK-007] 7 unused source-only items: `hero:victory`, `skeleton_wizard:cast`, `dragon_fire:fire-breath`, `environment-rubble`, `environment-ice-motes`, `environment-sparks`, `battle_victory.ogg`.
- [RISK-008] [RESOLVED 2026-09-13] `cloudStorage.ts:retryCleanupDirtyBanks` upsert retry + isolated catch + cache loss guard (D7-001) + bank_id filter (D6-001).
- [RISK-009] [RESOLVED 2026-09-13] `cloudStorage.ts:syncLocalPracticeSessions` chunk set-union merge (D7-002) + draft reconcile.
- [RISK-010] [RESOLVED 2026-09-13] `hooks/useQuizEngine.ts:handleAnswer` synchronous mutex lock (D4-001).
- [RISK-011] [RESOLVED 2026-09-13] `NodeEditPanel.tsx` unmount/node-switch flush + beforeunload flush (D10-001).
- [RISK-012] [RESOLVED 2026-09-14] C2 cloud-leading branch uses `mergedSession` for local writeback + score/progress upload triggers.
- [RISK-013] [RESOLVED 2026-09-14] C2 chunk set-union merge uses indexed reconciliation.
- [RISK-014] [RESOLVED 2026-09-14] KnowledgeGraph beforeunload uses synchronous flush bridge (`immediateSave` -> `saveGraph`) + timer cleanup.
- [RISK-015] [RESOLVED 2026-09-29] P0 5 Core & Security Fixes (SM-2 review button, hotkey modifier guards, local timezone dateUtils, signOut try-finally + AppSessionContainer unmount, BattleArena 25vh/28vh laptop layout).
- [RISK-016] [RESOLVED 2026-09-29] P1 Learning Experience & Stats (Wrong answer comparison, auto-advance on correct, achievement allowlist pruning, settlement CAS gate, FocusTimer 0-question stats isolation, E2E suite).
- [RISK-017] [RESOLVED 2026-10-04] P1 Audit Remediation & Final Surgical Closure (C-01, C-02, W-01, W-02, W-03, W-04, W-05, W-06, P-01, P-02).

## Next Refresh Triggers
- Move dirs, add/remove `AGENTS.md`, schema updates.
