---
name: systematic-debugging
description: A disciplined, four-phase debugging methodology. Use to identify root causes and implement verified fixes for complex bugs.
---

# Systematic Debugging

Avoid "shotgun debugging" through rigorous evidence-based analysis.

## 4-Phase Process

### Phase 1: Investigation
- Gather logs, stack traces, and environment data.
- **Empirical Reproduction**: Create a script or test that reliably fails.

### Phase 2: Pattern Analysis
- Search for similar patterns in the codebase.
- Review recent changes (git history) related to the failure points.

### Phase 3: Hypothesis
- Formulate a specific hypothesis for the root cause.
- Validate the hypothesis with targeted probes (e.g., temporary logging, state inspection).

### Phase 4: Implementation
- Apply the fix based on the validated hypothesis.
- **Verification**: Run the reproduction script to confirm the fix.
- **Regression**: Add a permanent test case.

## Red Flags
- Making changes without a reproduction script.
- Patching symptoms instead of the root cause.
- "Try and see" approach without a specific hypothesis.
