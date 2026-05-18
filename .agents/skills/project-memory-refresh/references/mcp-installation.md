# MCP Installation

This skill includes a project-local MCP server:

- `scripts/project_memory_mcp_server.py`
- `scripts/install_project_mcp_configs.py`
- `scripts/ensure_project_mcp_configs.py`

It is designed to be launched with a single project root:

```powershell
python scripts/project_memory_mcp_server.py --root <project-root>
```

## What it exposes

- `search_memory`: search the local project memory index with optional `category` or `scope` filters
- `get_aliases`: return `Aliases & Vocabulary`
- `get_source_of_truth`: return `Source of Truth`
- `get_entry_points`: return `Entry Points`
- `get_hotspots`: return `Hotspots`
- `get_search_recipes`: return `Search Recipes`
- `get_memory_health`: return coverage and freshness warnings for the current project memory
- `rebuild_project_memory_cache`: rebuild `.memory-index/` and `docs/INDEX.md` when present

When `openspec/` exists, the rebuilt cache also includes OpenSpec markdown artifacts so MCP search can find proposals, designs, tasks, and specs.

The index is still lexical and deterministic, but it now classifies entries into scopes such as `memory`, `rules`, `openspec`, `archive`, and `source`, then applies intent-aware boosts and basic noise filtering. This keeps the system transparent while improving retrieval quality.

Examples:

```powershell
python scripts/search_project_memory_index.py --root <project-root> --query "read first" --scope memory
python scripts/search_project_memory_index.py --root <project-root> --query "protocol instructions" --scope rules
python scripts/search_project_memory_index.py --root <project-root> --query "DEC-004" --category decision
```

## Safety rule

- Always pass one concrete project root.
- Never point one MCP server instance at a parent directory that contains multiple projects.

## Windows tip

- Use `python` if it is in `PATH`.
- If not, use the full Python executable path.

## Easiest option: auto-install project-local configs

If you do not want to hand-edit config files, run:

```powershell
python C:\Users\user\.agents\skills\project-memory-refresh\scripts\install_project_mcp_configs.py --root "C:\Path\To\Project"
```

For multiple projects:

```powershell
python C:\Users\user\.agents\skills\project-memory-refresh\scripts\install_project_mcp_configs.py --root "C:\ProjectA" --root "C:\ProjectB" --root "C:\ProjectC"
```

This creates:

- `.project-memory/project_memory_mcp_entry.py`
- `.gemini/settings.json`
- `.cursor/mcp.json`
- `.mcp.json`
- `.codex/config.toml`
- `%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json` entry when Antigravity support is enabled
- `.antigravity/rules.md` managed block when Antigravity support is enabled

All of them point to the project-local wrapper, so each repository stays isolated. The Gemini config should also keep `context.fileName` pointed at `AGENTS.md`.

If you want the skill to "install only when missing", use:

```powershell
python C:\Users\user\.agents\skills\project-memory-refresh\scripts\ensure_project_mcp_configs.py --root "C:\Path\To\Project"
```

This is the preferred command for the memory-refresh workflow because it is idempotent.

Current behavior:

- The managed `.project-memory/project_memory_mcp_entry.py` wrapper is refreshed when the generated wrapper content changes.
- This means older projects can pick up wrapper/runtime improvements the next time the memory refresh workflow runs against that project root.
- Project-local configs are still updated conservatively: valid existing `project-memory` entries are preserved unless the managed wrapper itself needs refreshing.

## Antigravity

Antigravity currently behaves like a global MCP client in many installs. The safest pattern is:

- keep the actual server wrapper inside each project at `.project-memory/project_memory_mcp_entry.py`
- register one namespaced Antigravity server per project in the global config
- use absolute paths only
- never point one server at a parent directory that contains multiple repositories

Typical Windows config path:

- `%USERPROFILE%\\.gemini\\antigravity\\mcp_config.json`

Example entry:

```json
{
  "mcpServers": {
    "pm-agsecurecockpit-a1b2c3d4": {
      "command": "python",
      "args": [
        "C:\\Users\\user\\AgSecureCockpit\\.project-memory\\project_memory_mcp_entry.py"
      ],
      "env": {
        "PROJECT_ROOT": "C:\\Users\\user\\AgSecureCockpit"
      }
    }
  }
}
```

Why this is safe with this skill:

- the wrapper script resolves the project root from its own file location
- it does not depend on Antigravity starting in the project working directory
- each project gets a distinct server entry, so one project's memory index is not reused for another project
- the project also gets a local `.antigravity/rules.md` block that tells the agent to use only the matching server for that repository

Recommended project rule:

- when multiple `project-memory-*` or `pm-*` servers are visible, use only the one whose wrapper path matches the current repository

## Claude Code

Official docs: https://docs.anthropic.com/en/docs/claude-code/mcp

Project-local install:

```powershell
claude mcp add project-memory --scope local -- python C:\Users\user\.agents\skills\project-memory-refresh\scripts\project_memory_mcp_server.py --root "C:\Path\To\Project"
```

Shared project install via `.mcp.json`:

```powershell
claude mcp add project-memory --scope project -- python C:\Users\user\.agents\skills\project-memory-refresh\scripts\project_memory_mcp_server.py --root "C:\Path\To\Project"
```

Useful checks:

```powershell
claude mcp list
claude mcp get project-memory
```

Use project scope only when the path is stable for the team. If everyone has different local paths, prefer local scope.

## Gemini CLI

Official docs:

- https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html
- https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html

Project-local install with CLI:

```powershell
gemini mcp add -s project project-memory python C:\Users\user\.agents\skills\project-memory-refresh\scripts\project_memory_mcp_server.py --root "C:\Path\To\Project"
```

Equivalent `.gemini/settings.json`:

```json
{
  "context": {
    "fileName": [
      "AGENTS.md"
    ]
  },
  "mcpServers": {
    "project-memory": {
      "command": "python",
      "args": [
        "C:\\Users\\user\\.agents\\skills\\project-memory-refresh\\scripts\\project_memory_mcp_server.py",
        "--root",
        "C:\\Path\\To\\Project"
      ]
    }
  }
}
```

Gemini defaults `gemini mcp add` to project scope unless changed. Keep it that way for this server.

For older projects migrating away from `GEMINI.md`:

- move durable rules into `AGENTS.md`
- move dynamic facts, hotspots, and search targets into `MEMORY.md`
- preserve longer chronological history in `DEVELOPMENT_LOG.md` or `docs/`
- delete `GEMINI.md` after `.gemini/settings.json` points Gemini at `AGENTS.md`

## Cursor

Official docs:

- https://docs.cursor.com/zh-Hant/context/mcp
- https://docs.cursor.com/cli/mcp

Project-local config in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "project-memory": {
      "type": "stdio",
      "command": "python",
      "args": [
        "C:\\Users\\user\\.agents\\skills\\project-memory-refresh\\scripts\\project_memory_mcp_server.py",
        "--root",
        "C:\\Path\\To\\Project"
      ]
    }
  }
}
```

Useful checks in Cursor CLI:

```powershell
cursor-agent mcp list
cursor-agent mcp list-tools project-memory
```

## Codex

Official docs: https://platform.openai.com/docs/codex/mcp

Project-local config lives in:

- `.codex/config.toml`

Managed block example:

```toml
[mcp_servers.project-memory]
command = 'python'
args = ['C:\Path\To\Project\.project-memory\project_memory_mcp_entry.py']
cwd = 'C:\Path\To\Project'
enabled = true
```

Useful checks:

```powershell
cd C:\Path\To\Project
codex mcp list
```

If configured correctly, `project-memory` should appear when you run `codex mcp list` from that project directory.

If your Codex build does not honor project-scoped `.codex/config.toml`, use the global auto-root fallback:

```powershell
python C:\Users\user\.agents\skills\project-memory-refresh\scripts\install_codex_global_auto_root.py
```

This installs one global MCP server named `project-memory-auto`. It detects the active project root from the current working directory and refuses broad parent directories such as `C:\Users\user` or `C:\Users\user\Desktop`.

## Safe default

For every tool above:

- one project = one MCP server config
- do not point the server at `C:\Users\user\Desktop`
- do not reuse the same config for multiple repositories unless you change `--root`
