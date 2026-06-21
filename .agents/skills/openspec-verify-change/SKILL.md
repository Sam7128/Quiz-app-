---
name: openspec-verify-change
description: Verify that an implementation matches the change artifacts. Use before archiving to ensure all requirements are met and the design was followed.
---

# OpenSpec: Verify Change

Audit the implementation against the planning artifacts.

## Dimensions

1. **Completeness**: Are all tasks checked off? Are all requirements implemented?
2. **Correctness**: Does the code match the spec requirements and scenarios?
3. **Coherence**: Does the implementation follow the design decisions?

## Steps

1. **Select Change**
2. **Read Artifacts**: Load `proposal.md`, `specs/`, `design.md`, and `tasks.md`.
3. **Analyze Code**: Search for implementation of requirements.
4. **Generate Report**: List CRITICAL, WARNING, and SUGGESTION issues.

## Guardrails
- Categorize incomplete tasks as CRITICAL.
- Note design divergences as WARNINGs.
- Always provide actionable recommendations.
