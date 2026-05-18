# Repository Guidelines

## Project Structure & Module Organization
This repository contains two Python applications:

- `ghostwriter/`: the phone-to-PC text bridge server, browser client assets in `ghostwriter/static/`, and Windows input/context integration.
- `radial_menu/`: the local PyQt6 radial menu toolkit, hotkey listener, widget, and config editor.

Top-level entry points live in `launcher.py` and `start_ghostwriter.bat`. Root-level `test_*.py` files cover the launcher and radial menu modules; `ghostwriter/test_*.py` covers the GhostWriter package. OpenSpec artifacts and archived changes are stored under `openspec/`.

## Build, Test, and Development Commands
- `python launcher.py`: start both GhostWriter and the radial menu toolkit.
- `python launcher.py --server-only`: run only the Flask/Socket.IO server.
- `python launcher.py --menu-only`: run only the PyQt6 radial menu.
- `pip install -r ghostwriter/requirements.txt`: install runtime dependencies.
- `.\\.venv\\Scripts\\python.exe -m pytest -q`: run tests from the project virtual environment.

If `pytest` is not installed in `.venv`, install it there before running the suite.

## Coding Style & Naming Conventions
Use Python with 4-space indentation and keep imports grouped as standard library, third-party, then local modules. Follow existing naming patterns: `snake_case` for files, functions, and variables; `PascalCase` for classes such as `ToolkitConfig` and `RadialMenuWidget`; `UPPER_SNAKE_CASE` for constants. Keep modules focused: UI logic belongs in `radial_menu/`, browser/server bridge logic belongs in `ghostwriter/`.

## Testing Guidelines
Add tests next to the current suite using `test_*.py` filenames and `test_*` function names. Prefer small, isolated unit tests with `unittest.mock.patch` for subprocesses, OS hooks, and UI integration boundaries. Changes to launcher flow, keystroke injection, or menu state should include regression coverage.

## Commit & Pull Request Guidelines
The visible history currently uses concise, descriptive subjects like `GhostWriter Initial Release: Mobile input bridge with force-grab and multi-mode support`. Keep commit titles imperative, specific, and scoped to one change. Pull requests should include:

- a short summary of behavior changes,
- linked issue or spec path when applicable,
- test results or manual verification steps,
- screenshots or short recordings for mobile UI or radial menu changes.

## Security & Configuration Tips
This project is LAN-focused and Windows-specific. Do not hardcode machine-specific paths, IPs, or secrets. Treat `menu_data.json` and clipboard/input automation code as user-facing configuration surfaces and validate changes against `menu_schema.json`.

## Memory Refresh Protocol
This section is additive. Do not rewrite the existing project rules just to maintain memory.

- Read `MEMORY.md` before broad exploration on multi-file or architecture-sensitive tasks.
- If the current tool supports skills, invoke `$project-memory-refresh` when memory is missing, stale, or the root has scattered report files.
- Keep the roles separate: `AGENTS.md` for operating rules and protocols; `MEMORY.md` for current hotspots, durable facts, aliases, and searchable file targets; `DEVELOPMENT_LOG.md` or `docs/` for longer chronology when needed.
- When root-level report files accumulate, archive them under `docs/reports/`, `docs/checkpoints/`, or `docs/handoffs/` without touching `openspec/`.
- Update `MEMORY.md` after changes to launcher flow, `ghostwriter/`, `radial_menu/`, schema/config files, or any long-lived constraint discovered during work.
