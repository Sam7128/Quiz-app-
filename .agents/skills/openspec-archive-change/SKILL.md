---
name: openspec-archive-change
description: Archive a completed change in the experimental workflow. Use when implementation is finished and verified, and you want to move the change to the archive history.
---

# OpenSpec: Archive Change

Archive a completed change.

## Steps

1. **Select Change**
   Prompt user if not clear.

2. **Verify Completion**
   ```bash
   openspec status --change "<name>" --json
   ```
   Check if all artifacts and tasks are complete. Warn if not.

3. **Sync Specs (Optional)**
   Check for delta specs and offer to sync to main specs using `openspec-sync-specs`.

4. **Perform Archive**
   ```bash
   mkdir -p openspec/changes/archive
   mv openspec/changes/<name> openspec/changes/archive/$(date +%Y-%m-%d)-<name>
   ```

## Guardrails
- Do NOT guess the change; let the user choose.
- Inform about incomplete tasks/artifacts before archiving.
