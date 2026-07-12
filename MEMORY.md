# MEMORY.md

## Purpose Snapshot
- [FACT-001] React+TS+Vite SPA. persist: localStorage + Supabase. Domain hooks, service layer.

## Source of Truth
- [PATH-001] `AGENTS.md`: rules, index.
- [PATH-002] `types.ts`: TS models.
- [PATH-003] `App.tsx`: main wrapper.
- [PATH-004] `services/` & `hooks/`: I/O, domain logic.
- [PATH-005] `docs/DEVELOPMENT_LOG.md`: changes log.
- [PATH-006] `openspec/`: spec history.

## Aliases
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
- Refreshed: `2026-07-12 15:30`
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
| MOD-001 | `components/` | yes | ui components | components |
| MOD-002 | `constants/` | yes | static definitions and domain data | constants |
| MOD-003 | `contexts/` | yes | shared context and state boundaries | contexts |
| MOD-004 | `docs/` | no | project documentation | docs |
| MOD-005 | `e2e/` | yes | end-to-end tests | e2e |
| MOD-006 | `hooks/` | yes | feature hooks and orchestration | hooks |
| MOD-007 | `openspec/` | yes | change planning and specs | openspec |
| MOD-008 | `public/` | no | static assets | public |
| MOD-009 | `Quiz-app-/` | no | important project module | quiz-app- |
| MOD-010 | `reducers/` | no | important project module | reducers |
| MOD-011 | `services/` | yes | service and integration logic | services |
| MOD-012 | `src/` | no | primary source implementation | src |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none detected.
- Archived changes: `22`
- [OS-ARC-001] `openspec/changes/archive/2026-07-11-security-architecture-hardening-v2/` (proposal, design, tasks, specs:8)
- [OS-ARC-002] `openspec/changes/archive/2026-07-12-knowledge-graph-enhancements/` (proposal, design, tasks, specs:6)
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
- [FACT-010] Keys: `mindspark_`. Data safety on migration.
- [FACT-011] Questions in Cloud. SM-2/mistakes in localStorage.
- [FACT-012] Graph workspace fully functional + unit tested.
- [FACT-013] Local wrapper `.project-memory/project_memory_mcp_entry.py` exposes memory tools.
- [FACT-014] Question dedupe uses `sourceQuestionKey` / `sourceFingerprint`.
- [FACT-015] Delete question cleans SM-2, mistakes, active session.
- [FACT-016] Import UI summary shown before apply.
- [FACT-017] Import modes: `append` (default), `merge`, `replace`.
- [FACT-018] Practice draft: `mindspark_chunk_draft:<sessionId>:<chunkIndex>`.
- [FACT-019] Practice sync: LWW. Offline dirty fallback cache.
- [FACT-020] App + Quiz engine callbacks must use `useCallback` to prevent race conditions.
- [FACT-021] Cloud save cleans practice cache (`removePracticeSessionCache`).
- [FACT-022] Git must not track `node_modules` or reserved names (e.g., `nul`).
- [FACT-023] Validate AI config via localStorage schema check.
- [FACT-024] Cloud empty checks before local sync to prevent overwrite.
- [FACT-025] Dynamic HMAC-SHA256 integrity, no local salt.
- [FACT-026] Reset battle state on loaded out-of-range bounds.
- [FACT-027] DB RPC `submit_challenge_score` resolves score winner.
- [FACT-028] Dead code: Use `npx -y knip --reporter compact`.
- [FACT-029] Code Hygiene spec defines dead code deletion and narrow export scopes.
- [FACT-030] Concurrency: `runWithSyncLock` (Web Locks + localStorage fallback) protects sync flow.
- [FACT-031] FocusTimer: close AudioContext in `activeAudioContextsRef` on unmount.
- [FACT-032] Keyboard shortcuts: `handlersRef` pattern, empty deps `[]`.
- [FACT-033] Offline writes: `mindspark_dirty_banks` cleared on cloud sync success.
- [FACT-034] GraphStorage: length limits, HTML escape, concat migration, fail-fast, Blob checks.
- [FACT-035] GraphLayout & Bridge: radial layout, MD parser, Nd > 12 auto-expand.
- [FACT-036] GraphUI: sticky node limit (20), TipTap HTML note, unmount auto-flush, Base64 intercept, orphaned notes reconnect.
- [FACT-037] Workspace: scroll sync, Fullscreen Recovery on Fatal load error, visual/code split, MD serialization/restoration.
- [FACT-038] Rule 11: Mark `openspec/changes/<change-name>/tasks.md` `[x]` before completion.
- [FACT-039] AI Prompts & Mermaid Import: AIPromptGuide supports Quiz and Graph tabs (with mindmap-to-flowchart converter prompt). GraphEditor's import modal alerts flowchart syntax limits and embeds the conversion prompt copy button.

## Active Decisions
- [DEC-001] Rules in `AGENTS.md`, facts in `MEMORY.md`. No `GEMINI.md`.
- [DEC-002] Direct Storage/Supabase access banned in components. Use services/hooks.
- [DEC-003] Local wrapper `.project-memory/` preferred over global.
- [DEC-004] `vite.config.ts`: React+Recharts+Framer in `vendor-ui-core` chunk.
- [DEC-005] Build runs `vite build`. Prevent Windows path permission issues.
- [DEC-006] Ban `any` in Storage/JSON parse. Use `unknown` + Type Guards.
- [DEC-007] E2E: click custom Confirm buttons, no window alert listeners.

## Hotspots
- [HOT-001] `App.tsx` & `vite.config.ts`: Chunking & providers.
- [HOT-002] Storage schemas: backward compatibility.
- [HOT-003] RPG battle system vs Quiz engine synchronization.
- [HOT-004] Graph components & storage files.
- [HOT-005] Stable ID generation during JSON/AI import.
- [HOT-006] Practice sessions state recovery lifecycle.
- [HOT-007] Cloud sync concurrency.
- [HOT-008] Git index: Vercel fail if `node_modules` committed.

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

## Archive Index
- [DOC-001] `docs/INDEX.md`: index file.

## Open Risks
- [RISK-001] DEVELOPMENT_LOG.md: format cleanup.
- [RISK-002] `vite.config.ts` chunk sizes.
- [RISK-003] permissions for local MCP config script.

## Next Refresh Triggers
- Move dirs, add/remove `AGENTS.md`, schema updates.
