---
name: openspec-new-change
description: Start a new change using the experimental artifact-driven approach. Use when you need to create a new feature, fix, or modification with a structured step-by-step approach.
---

# OpenSpec: New Change

Start a new change using the experimental artifact-driven approach.

## Input
The user's request should include a change name (kebab-case) OR a description of what they want to build.

## Steps

1. **Clarify Intent**
   If no clear input is provided, ask: "What change do you want to work on? Describe what you want to build or fix."
   Derive a kebab-case name (e.g., `add-user-auth`).

2. **Determine Workflow Schema**
   Use the default schema unless a specific one is requested.

3. **Create Change Directory**
   ```bash
   openspec new change "<name>"
   ```

4. **Check Status**
   ```bash
   openspec status --change "<name>"
   ```

5. **Get Instructions for First Artifact**
   Find the first "ready" artifact from status and run:
   ```bash
   openspec instructions <artifact-id> --change "<name>"
   ```

6. **Wait for User Direction**
   Show the template and ask if they are ready to proceed.

## Guardrails
- Do NOT create artifacts yet - just show instructions.
- Ensure kebab-case names.
- If change exists, suggest continuing instead.
