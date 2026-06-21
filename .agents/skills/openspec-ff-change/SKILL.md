---
name: openspec-ff-change
description: Fast-forward through OpenSpec artifact creation. Use when you want to quickly generate all planning artifacts (proposal, specs, design, tasks) in one go to start implementation immediately.
---

# OpenSpec: Fast-Forward Change

Generate all artifacts needed for implementation in one sequence.

## Steps

1. **Clarify Intent**
   Ensure change name and description are ready.

2. **Initialize Change**
   ```bash
   openspec new change "<name>"
   ```

3. **Artifact Loop**
   Repeatedly check `openspec status` and create the next "ready" artifact until all `applyRequires` artifacts are done.
   
4. **Final Summary**
   Show the list of created artifacts and prompt for `/opsx:apply`.

## Guardrails
- Verify each artifact exists before moving to the next.
- Read dependencies for each step.
- Pause if context is critically unclear.
