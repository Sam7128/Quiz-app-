# Review Rubric

## 1. Feasibility
- Verify scope matches available artifacts and dependencies.
- Flag missing prerequisite decisions (data model, API contract, runtime constraints).
- Flag tasks that cannot be executed with current plan detail.

## 2. Logical Consistency
- Check proposal, specs, design, and tasks for contradictory behavior.
- Check terms and capability names are used consistently.
- Check acceptance scenarios do not conflict with each other.

## 3. Existing Implementation Overlap
- Search with `rg` before claiming new work is required.
- Flag duplicate solutions if code already implements same behavior in another module.
- Recommend reuse, consolidation, or explicit migration path.

## 4. Code Quality and Testability Risk
- Flag architecture choices that increase coupling or reduce maintainability.
- Flag missing error handling, observability, and rollback strategy.
- Flag missing test strategy for high-risk scenarios.

## 5. Traceability
- Map each capability/requirement to concrete tasks.
- Flag tasks with no parent requirement and requirements with no tasks.
- Flag tasks missing completion criteria.

## Severity Rules
- CRITICAL: Blocks safe implementation or introduces likely incorrect behavior.
- WARNING: Significant risk or inconsistency, but implementation can proceed with caution.
- SUGGESTION: Improvement opportunity without immediate delivery risk.
