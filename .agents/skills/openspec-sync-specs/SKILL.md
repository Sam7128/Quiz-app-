---
name: openspec-sync-specs
description: Sync delta specs from a change to main specs. Use to intelligently merge requirement updates into the project's permanent specification.
---

# OpenSpec: Sync Specs

Intelligently merge delta specs into main specs.

## Steps

1. **Select Change**
2. **Identify Delta Specs**: Look in `openspec/changes/<name>/specs/`.
3. **Merge Logic**:
   - **ADDED**: Add to main spec.
   - **MODIFIED**: Update existing requirements/scenarios.
   - **REMOVED**: Delete from main spec.
   - **RENAMED**: Update requirement headers.
4. **Update/Create Main Specs**: Edit files in `openspec/specs/`.

## Guardrails
- Read both delta and main specs before editing.
- Preserve existing content not mentioned in the delta.
- Operation should be idempotent.
