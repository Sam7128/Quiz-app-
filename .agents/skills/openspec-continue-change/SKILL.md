---
name: openspec-continue-change
description: Continue working on an OpenSpec change by creating the next artifact. Use when you have an active change and need to progress through its planning phases (proposal, specs, design, tasks).
---

# OpenSpec: Continue Change

Progress a change by creating the next required artifact.

## Steps

1. **Select Change**
   Prompt user with recently modified options.

2. **Check Status**
   ```bash
   openspec status --change "<name>" --json
   ```

3. **Create Next Artifact**
   Pick the first "ready" artifact.
   ```bash
   openspec instructions <artifact-id> --change "<name>" --json
   ```
   Read dependencies, follow template, apply rules, and write the file.

4. **Show Progress**
   Show what was created and what's now unlocked.

## Guardrails
- Create ONE artifact per invocation.
- Read dependency artifacts first.
- Do NOT copy instructions/rules into the final artifact file.
