---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when you are ready to start coding the tasks defined in the change's tasks.md file.
---

# OpenSpec: Apply Change

Implement tasks from an OpenSpec change.

## Steps

1. **Select Change**
   Infer from context or run `openspec list --json` and ask the user to select.

2. **Check Status & Schema**
   ```bash
   openspec status --change "<name>" --json
   ```

3. **Get Apply Instructions**
   ```bash
   openspec instructions apply --change "<name>" --json
   ```

4. **Read Context Files**
   Read the files listed in `contextFiles` (proposal, specs, design, tasks).

5. **Implement Tasks Loop**
   For each pending task:
   - Perform the code changes.
   - Keep changes minimal and focused.
   - Mark task complete in `tasks.md`: `[ ]` -> `[x]`.

6. **Report Progress**
   Show "N/M tasks complete" after each step.

## Guardrails
- Always read context files first.
- Update `tasks.md` immediately after each task.
- Pause if a task is unclear or design issues emerge.
