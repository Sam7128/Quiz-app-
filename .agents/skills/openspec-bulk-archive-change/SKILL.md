---
name: openspec-bulk-archive-change
description: Archive multiple completed changes at once. Use when you have several parallel changes that are finished and ready for history.
---

# OpenSpec: Bulk Archive

Efficiently batch-archive multiple changes.

## Steps

1. **Identify Candidates**
   Run `openspec list --json` to find active changes.

2. **Select Changes**
   Let the user select multiple changes or choose "all complete".

3. **Batch Completion Check**
   For each selected change, run `openspec status --change "<name>" --json`.
   Summarize status (Ready vs. Warnings).

4. **Batch Sync (Optional)**
   Offer to sync all delta specs to main specs before archiving.

5. **Execute Archive**
   Move all selected change directories to the archive folder with date prefixes.

## Guardrails
- Inform about SPEC conflicts if multiple changes affect the same main spec.
- Confirm with the user before performing the final batch move.
