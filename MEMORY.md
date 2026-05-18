# MEMORY.md

## Purpose Snapshot
- [FACT-001] `launcher.py`, `ghostwriter/`, `radial_menu/`: Windows/LAN-only project that bundles a phone-to-PC text bridge with a local radial text menu.
- [FACT-002] `ghostwriter/server.py` and `ghostwriter/static/app.js`: the phone UI is a browser-based Socket.IO controller/PWA, not a native mobile app.
- [FACT-003] `radial_menu/app.py`, `menu_data.json`, `menu_schema.json`: the local PyQt6 toolkit is user-configurable and persists phrase data at the repo root.

## Source of Truth
- [PATH-101] `AGENTS.md`: operating rules, commands, testing expectations, and the memory refresh protocol.
- [PATH-102] `MEMORY.md`: current aliases, entry points, hotspots, and search recipes.
- [PATH-103] `README.md` and `ghostwriter/README.md`: user-facing setup, LAN usage, and GhostWriter behavior overview.
- [PATH-104] `openspec/specs/` and `openspec/changes/archive/`: shipped behavior contracts and archived design/task context.
- [PATH-105] `launcher.py`: top-level startup orchestration for both apps.
- [PATH-106] `DEVELOPMENT_LOG.md`: longer implementation chronology and one-off historical notes that should not live in `AGENTS.md` or `MEMORY.md`.

## Aliases & Vocabulary
- [ALIAS-001] "bridge server", "GhostWriter server", "手機橋接" => `ghostwriter/server.py`
- [ALIAS-002] "injector", "clipboard paste", "keystroke injection" => `ghostwriter/injector.py`
- [ALIAS-003] "context grab", "force grab", "cursor context" => `ghostwriter/context_grabber.py`
- [ALIAS-004] "mobile app", "phone UI", "PWA controller" => `ghostwriter/static/app.js` and `ghostwriter/static/index.html`
- [ALIAS-005] "tray app", "radial menu app", "PyQt toolkit" => `radial_menu/app.py`
- [ALIAS-006] "hotkey hook", "Ctrl + Middle Mouse", "listener" => `radial_menu/hotkey_listener.py`
- [ALIAS-007] "menu overlay", "sector hover", "selection UI" => `radial_menu/radial_menu_widget.py` and `radial_menu/radial_engine.py`
- [ALIAS-008] "menu config", "phrase library", "schema" => `menu_data.json`, `menu_schema.json`, and `radial_menu/toolkit_config.py`

## Entry Points
- [ENTRY-001] `launcher.py`: best first stop for combined startup, CLI flags, and server/menu lifecycle.
- [ENTRY-002] `ghostwriter/server.py`: Flask route `/`, Socket.IO events, LAN IP detection, QR output, and single-client replacement flow.
- [ENTRY-003] `ghostwriter/static/app.js`: client protocol, stream/batch/replace modes, optimistic preview updates, and long-press refresh.
- [ENTRY-004] `ghostwriter/injector.py`: ASCII typing vs clipboard paste path, clipboard restore, cross-process lock, and self-injection guard.
- [ENTRY-005] `ghostwriter/context_grabber.py`: UIAutomation context read, clipboard selection fallback, and optional force-grab workflow.
- [ENTRY-006] `radial_menu/app.py`: tray bootstrap, config editor launch, hotkey listener wiring, and config hot-reload timer.
- [ENTRY-007] `radial_menu/radial_menu_widget.py`: overlay rendering, hover tracking, submenu navigation, and delayed clipboard injection.
- [ENTRY-008] `radial_menu/toolkit_config.py`: JSON schema validation, atomic save, backup creation, and disk change detection.
- [ENTRY-009] `test_*.py` and `ghostwriter/test_*.py`: regression coverage split between launcher/radial flows and injector locking behavior.

<!-- BEGIN AUTO-GENERATED: MEMORY MAP -->
## Auto-Generated Memory Map
- Refreshed: `2026-03-09 02:05`
- Project root: `C:\Users\user\Desktop\voice transfer text`

### Key Files
- [PATH-001] `AGENTS.md`
- [PATH-002] `MEMORY.md`
- [PATH-003] `README.md`
- [PATH-004] `DEVELOPMENT_LOG.md`
- [PATH-005] `CHECKLIST.md`
- [PATH-006] `docs/INDEX.md`
- [PATH-007] `launcher.py`
- [PATH-008] `menu_data.json`
- [PATH-009] `menu_schema.json`
- [PATH-010] `start_ghostwriter.bat`

### Module Index
| ID | Path | Local AGENTS | Purpose | Tags |
|---|---|---|---|---|
| MOD-001 | `docs/` | no | project documentation | docs |
| MOD-002 | `ghostwriter/` | no | important project module | ghostwriter |
| MOD-003 | `openspec/` | no | change planning and specs | openspec |
| MOD-004 | `radial_menu/` | no | important project module | radial_menu |

### OpenSpec Snapshot
- Main specs: `openspec/specs/`
- Active changes: none detected.
- Archived changes: `3`
- [OS-ARC-001] `openspec/changes/archive/2026-02-13-ghostwriter-phase1-mvp/` (proposal, design, tasks)
- [OS-ARC-002] `openspec/changes/archive/2026-02-16-ghostwriter-phase2-sync/` (proposal, design, tasks)
- [OS-ARC-003] `openspec/changes/archive/2026-02-16-radial-menu-toolkit/` (proposal, design, tasks, specs:1)

### Nested AGENTS
- No nested `AGENTS.md` files detected.
<!-- END AUTO-GENERATED: MEMORY MAP -->

## Stable Facts
- [FACT-010] `ghostwriter/server.py`: enforces a single active mobile client; new socket connections replace older sessions. Tags: websocket, single-client, status_update
- [FACT-011] `ghostwriter/server.py`: primary socket surface is `text_input`, `key_command`, `move_cursor`, and `request_context`; context is also pushed after successful injection. Tags: protocol, socketio, context
- [FACT-012] `ghostwriter/injector.py`: ASCII text uses `pyautogui.write`, non-ASCII falls back to clipboard paste with restoration, thread lock, and a cross-process lock file in temp. Tags: injection, clipboard, locking
- [FACT-013] `ghostwriter/context_grabber.py`: context lookup prefers UIAutomation/TextPattern, then selected-text clipboard capture, then optional `force=True` Ctrl+A/Ctrl+C brute force. Tags: windows, uia, fallback
- [FACT-014] `ghostwriter/static/app.js`: stream mode sends on input/composition end, backspace can emit a dedicated `key_command`, and long-press refresh triggers forced context grab. Tags: mobile, stream-mode, force-grab
- [FACT-015] `radial_menu/app.py`: tray startup opens the config editor once on launch when a system tray is available, and hot-reloads menu config every 2 seconds. Tags: tray, startup, hot-reload
- [FACT-016] `radial_menu/hotkey_listener.py`: global Ctrl + middle-mouse detection suppresses itself while `ghostwriter.injector._is_self_injecting` is true. Tags: hotkey, hooks, self-injection
- [FACT-017] `radial_menu/radial_menu_widget.py`: the menu closes before injecting text and delays paste by 35ms so focus returns to the target app first. Tags: overlay, focus, injection
- [FACT-018] `radial_menu/toolkit_config.py`: config save is schema-validated, atomic via `.tmp`, and creates `.bak` snapshots of prior menu data. Tags: config, schema, backup
- [FACT-019] `docs/reports/` and `docs/INDEX.md`: non-source analysis docs are already archived outside the root entry points. Tags: docs, archive, reports
- [FACT-020] `ghostwriter/server.py`: server startup scans from configured `PORT` across up to 20 candidate ports and binds the first free one to tolerate local port collisions. Tags: startup, networking, auto-port
- [FACT-021] `ghostwriter/static/index.html`, `ghostwriter/static/app.js`, and `ghostwriter/static/style.css`: phone client is static HTML/CSS/JS and currently loads `sio4lite.js`; the UI intentionally uses a dark, translucent panel style. Tags: frontend, socketio, sio4lite, theme
- [FACT-022] `ghostwriter/static/index.html`: `theme-color` and `autocapitalize="sentences"` compatibility warnings were previously investigated; mobile-oriented input attributes and `color-scheme` are intentional, so those warnings alone are not regressions. Tags: diagnostics, mobile, html

## Active Decisions
- [DEC-001] `AGENTS.md` and `MEMORY.md` are the canonical repo instruction/memory pair; longer chronology and historical notes belong in `DEVELOPMENT_LOG.md` or `docs/`.
- [DEC-002] `radial_menu/` reuses `ghostwriter.injector` for paste behavior and self-injection coordination instead of maintaining a second injection implementation.
- [DEC-003] `menu_data.json` and `menu_schema.json` stay at repo root as user-facing configuration surfaces; `ToolkitConfig` owns validation, atomic save, and backup semantics.
- [DEC-004] `.project-memory/`, `.memory-index/`, `.gemini/settings.json`, `.mcp.json`, `.cursor/mcp.json`, and `.codex/config.toml`: project-memory tooling remains project-scoped and should not be broadened into sibling repositories.
- [DEC-005] `docs/` is the archive target for report-style markdown; `openspec/` stays in place as the authoritative spec/change history.

## Hotspots
- [HOT-001] `launcher.py`: startup flags and subprocess/menu shutdown behavior affect both apps at once.
- [HOT-002] `ghostwriter/server.py`: socket protocol changes require matching updates in `ghostwriter/static/app.js` and can break mobile interaction silently.
- [HOT-003] `ghostwriter/injector.py`: clipboard restore, timing, and lock behavior are system-dependent and easy to regress.
- [HOT-004] `ghostwriter/context_grabber.py`: UIAutomation, clipboard fallback, and force-grab timing are Windows-specific and brittle across target applications.
- [HOT-005] `ghostwriter/static/app.js`: IME/composition, backspace handling, reconnect UX, and context sync timing all interact here.
- [HOT-006] `radial_menu/hotkey_listener.py` and `radial_menu/radial_menu_widget.py`: global hook latency, hover math, focus return, and injection coordination are tightly coupled.
- [HOT-007] `radial_menu/toolkit_config.py` and `radial_menu/config_editor.py`: schema changes must preserve round-trip save/load behavior for user data.
- [HOT-008] `menu_data.json` and `menu_schema.json`: config format changes are user-visible and need validation plus regression coverage.

## Search Recipes
- [SEARCH-001] Socket protocol: `rg -n "text_input|key_command|move_cursor|request_context|status_update|context_update" ghostwriter/server.py ghostwriter/static/app.js`
- [SEARCH-002] Injection and loop guards: `rg -n "_is_self_injecting|force_clipboard_paste|inject_text|_acquire_process_clipboard_lock" ghostwriter radial_menu`
- [SEARCH-003] Context grab paths: `rg -n "UIA|TextPattern|ValuePattern|force=True|ForceGrab|request_context" ghostwriter`
- [SEARCH-004] Radial menu interaction: `rg -n "trigger_signal|release_signal|show_at_cursor|confirm_selection|go_back|get_hovered_sector" radial_menu`
- [SEARCH-005] Config persistence: `rg -n "ToolkitConfig|menu_data.json|menu_schema.json|save_config|check_for_updates" radial_menu *.py`
- [SEARCH-006] Test inventory: `rg --files -g "test_*.py" -g "ghostwriter/test_*.py"`
- [SEARCH-007] Project memory wiring: `rg -n "project-memory|context.fileName|Memory Refresh Protocol" AGENTS.md MEMORY.md .gemini .cursor .codex .antigravity .mcp.json`

## Archive Index
- [ARCH-001] `docs/INDEX.md`: top-level pointer for archived reports.
- [ARCH-002] `docs/reports/`: archived analysis notes kept out of root navigation.
- [ARCH-003] `openspec/changes/archive/2026-02-13-ghostwriter-phase1-mvp/`: initial bridge MVP proposal/design/tasks/spec archive.
- [ARCH-004] `openspec/changes/archive/2026-02-16-ghostwriter-phase2-sync/`: context-sync delivery archive.
- [ARCH-005] `openspec/changes/archive/2026-02-16-radial-menu-toolkit/`: radial menu delivery archive.

## Open Risks
- [RISK-001] `ghostwriter/injector.py` and `ghostwriter/context_grabber.py`: clipboard, UIAutomation, and simulated input timing are hardware/app dependent on Windows.
- [RISK-002] `ghostwriter/server.py` and `ghostwriter/static/app.js`: protocol drift between server and mobile client can fail at runtime without compile-time checks.
- [RISK-003] `radial_menu/hotkey_listener.py`: global input hooks can conflict with system timing or other automation if self-injection guards regress.
- [RISK-004] `menu_data.json` and `menu_schema.json`: invalid user config or schema drift can break the tray editor and runtime menu state.
- [RISK-005] `MEMORY.md` can drift from implementation if launcher flow, GhostWriter protocol, frontend behavior, or config surfaces change without a memory refresh.

## Next Refresh Triggers
- Add or rename Socket.IO events, mobile modes, or context payload shape.
- Change `launcher.py` lifecycle, tray boot behavior, or server/menu startup flags.
- Move `menu_data.json`, `menu_schema.json`, or split `radial_menu/` and `ghostwriter/` responsibilities.
- Create new `openspec/changes/` work or archive new report markdown into `docs/`.
- Change project-memory MCP routing/config files or the `AGENTS.md`/`MEMORY.md` memory workflow.
