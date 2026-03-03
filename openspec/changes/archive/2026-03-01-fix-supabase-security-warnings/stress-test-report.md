# Stress Test Report & Test Matrix

**Change**: `fix-supabase-security-warnings`
**Generated**: 2026-03-01 21:21 (UTC+8)
**Artifacts Analyzed**: proposal.md, design.md, tasks.md, specs/supabase-security-hardening/spec.md, specs/cloud-data-integrity/spec.md
**Tech Stack**: Frontend: React 19 (TypeScript), Vite 6, Tailwind CSS, LocalStorage API. Database: Supabase PostgreSQL.

---

## Part 1: Stress Test Report

### [ISSUE-001] Category: Edge Case
- **Affected Step**: Task 2.1: "開啟 `study_sessions` 與 `user_study_stats_30day` 的 RLS 並建立存取策略"
- **Affected File(s)**: `supabase_study_sessions_migration.sql` (assumed)
- **Problem**: The policy `user_id = auth.uid()` assumes the user_id column is never null. If the user_id column allows nulls and anonymous access attempts to read it, or if a bug inserts a null user_id, the policy behavior is ambiguous or might fail securely but mask root causes.
- **Evidence**: "寫入策略 user_id = auth.uid()"
- **Risk Level**: LOW
- **Impact If Ignored**: Orphaned data might be invisible and impossible to clean up via API.
- **Suggested Addition**: Add an explicit check in the migration to make `user_id` NOT NULL on these tables if it isn't already.

### [ISSUE-002] Category: Logic Gap
- **Affected Step**: Task 2.2: "開啟 `user_streaks` 與 `user_achievements` 的 RLS 並建立存取策略"
- **Problem**: When a user is deleted from Supabase Auth, their data might remain in `user_streaks` and `user_achievements`. RLS only hides data; it doesn't clean it up. The plan lacks a cascading delete strategy.
- **Evidence**: The proposal and tasks only cover enabling RLS and adding selection/modification policies, not data lifecycle management.
- **Risk Level**: MEDIUM
- **Impact If Ignored**: Unused data accumulates over time, inflating database size and costs.
- **Suggested Addition**: Add a task to ensure foreign keys on `user_id` are set to `ON DELETE CASCADE` referencing `auth.users(id)`.

### [ISSUE-003] Category: Missing Detail
- **Affected Step**: Task 2.3: "開啟 `challenges` 資料表的 RLS 並建立存取策略"
- **Problem**: Challenges might be a multi-user entity (e.g. sender and receiver). A simple `user_id = auth.uid()` policy would prevent the receiver from seeing the challenge if only the sender's ID is the `user_id` or if multiple users are involved. The plan lacks definition of how shared entities are handled in RLS.
- **Evidence**: "確保 challenges 也被完全保護...撰寫相同的基於 UID 的策略"
- **Risk Level**: HIGH
- **Impact If Ignored**: The Challenges feature might break completely for the receiving user.
- **Suggested Addition**: Specify the exact RLS policy for `challenges` to allow both the creator and the target participant to SELECT the row using `auth.uid() IN (creator_id, participant_id)` or equivalent logic.

### [ISSUE-004] Category: Architecture
- **Affected Step**: Task 3.1: "執行重置 `handle_new_user` 的 SQL 指令，加入 `SET search_path = public`"
- **Problem**: Setting `search_path = public` secures against missing paths, but running triggers with SECURITY DEFINER can still be risky if the public schema contains untrusted functions. 
- **Evidence**: "加入 SET search_path = public"
- **Risk Level**: MEDIUM
- **Impact If Ignored**: A determined attacker who manages to create an object in the public schema might still exploit the function.
- **Suggested Addition**: Ensure that public schema creation privileges are revoked from the `public` role, restricting function creation.

### [ISSUE-005] Category: Assumption Risk
- **Affected Step**: Task 4.2: "以程式化腳本或手動建立一次嘗試使用已知洩漏密碼...的註冊流程"
- **Problem**: The plan assumes the frontend will gracefully handle a specific error code for leaked passwords. However, Supabase Auth might return a generic 400 error. The application might display "An error occurred" instead of guiding the user to use a stronger password.
- **Evidence**: "傳回與密碼政策有關的 Error，證明保護已經全自動生效" and "前端適當捕獲密碼外洩被拒絕註冊時的錯誤" in goals.
- **Risk Level**: MEDIUM
- **Impact If Ignored**: Poor user experience during registration; users repeatedly fail registration without knowing why.
- **Suggested Addition**: Explicitly mention the expected Supabase error code/message for leaked passwords and verify the frontend maps this to a localized user-friendly message.

### [ISSUE-006] Category: Edge Case
- **Affected Step**: Task 5.1: "執行完整的登入與資料存取流程 (Happy Path E2E 檢查)"
- **Problem**: Happy path testing does not test the exact condition RLS is meant to protect against (authenticated user trying to access another user's data).
- **Evidence**: "執行完整的登入與資料存取流程 (Happy Path E2E 檢查)"
- **Risk Level**: HIGH
- **Impact If Ignored**: RLS might inadvertently allow cross-user data access if the policy is flawed (e.g., using `true` instead of `user_id = auth.uid()`), and happy path testing won't catch it.
- **Suggested Addition**: Add a negative E2E test case where User A attempts to fetch or modify a record explicitly known to belong to User B.

## Cross-Cutting Issues

### Security
- [ ] Are all user inputs validated before processing?
- [x] Are API keys / secrets handled securely?
- [x] Are database operations protected by RLS / auth checks?
- *Finding*: RLS is being added, but testing cross-user access attempts is missing.

### Performance
- [ ] Are there any unbounded loops or recursive operations?
- [ ] Are large data sets handled with pagination or streaming?
- [ ] Are expensive operations debounced or throttled?
- *Finding*: RLS introduces overhead. A missing index on `user_id` for any of the 5 tables will result in Seq Scans. The plan mentions adding indexes, but it's not explicitly in the tasks.

### Error Recovery
- [x] Does every async operation have error handling?
- [ ] Are there rollback strategies for multi-step operations?
- [ ] Are users notified of failures with actionable messages?
- *Finding*: The leaked password error handling on the frontend isn't specified in detail.

### Data Integrity
- [ ] Are there race conditions in concurrent state updates?
- [ ] Is data validated at both input and output boundaries?
- [ ] Are there orphaned data risks (parent deleted, child remains)?
- *Finding*: Missing cascading deletes for user data when an account is deleted.

---

## Part 2: Test Matrix

---

## Module: Verification Infrastructure
**Source**: Task Group 1 from tasks.md
**Primary Files**: `verify_rls_enabled.sql`, `verify_search_path.sql`

### Unit Test Cases

| # | Test Name | Input | Expected Output | Priority | Notes |
|---|-----------|-------|----------------|----------|-------|
| 1 | `should_fail_when_rls_is_disabled` | Query before applying fixes | Script returns error / failed status | P0 | Baseline test to ensure script works |
| 2 | `should_pass_when_rls_is_enabled` | Query after applying fixes | Script returns passed status | P0 | Confirms fix |
| 3 | `should_fail_when_search_path_mutable` | Query for `handle_new_user` before fix | Script returns failed status | P0 | Verifies detection |

### Integration Test Scenarios

| # | Scenario | Components Involved | Preconditions | Steps | Expected Behavior |
|---|----------|--------------------|-|-------|-------------------|
| 1 | CI Pipeline execution | Database, CI Runner | DB has no RLS | 1. Run migrations 2. Run verification queries | Verification passes |

### Edge Cases

| # | Edge Case | Why It Matters | Input Condition | Expected Handling |
|---|-----------|---------------|-----------------|-------------------|
| 1 | Table is dropped/renamed | Break tests | `verify_rls_enabled.sql` queries missing table | Script gracefully fails indicating table absence |
| 2 | Function doesn't exist | Break tests | `verify_search_path.sql` queries missing func | Script gracefully fails indicating func absence |

### Error / Failure Scenarios

| # | Failure | Trigger Condition | Symptoms | Expected Recovery |
|---|---------|-------------------|----------|-------------------|
| 1 | Permission Denied | Runner lacks `pg_class` read access | Execution error | Grant necessary permissions to test runner role |
| 2 | Malformed returned JSON | DB version changes structure | Parsing error | Ensure robust querying of `pg_policies` |

### Expected Outcomes (Definition of Done)

- [ ] The SQL verification scripts return failure on current DB state.
- [ ] The SQL verification scripts return success on fixed DB state.

---

## Module: RLS Implementation
**Source**: Task Group 2 from tasks.md
**Primary Files**: Migrations for `study_sessions`, `user_study_stats_30day`, `user_streaks`, `user_achievements`, `challenges`

### Unit Test Cases

| # | Test Name | Input | Expected Output | Priority | Notes |
|---|-----------|-------|----------------|----------|-------|
| 1 | `should_allow_select_own_data` | Request with User A JWT for User A data | 200 OK, Data returned | P0 | Validates basic access |
| 2 | `should_deny_select_other_data` | Request with User A JWT for User B data | 200 OK, Empty array | P0 | Validates RLS protection |
| 3 | `should_deny_insert_for_other` | POST request with User A JWT, inserting for User B | 403 / RLS error | P0 | Validates RLS insert protection |

### Integration Test Scenarios

| # | Scenario | Components Involved | Preconditions | Steps | Expected Behavior |
|---|----------|--------------------|-|-------|-------------------|
| 1 | Cloud Sync with RLS | `saveCloudQuestions`, Supabase | User has auth session | 1. Import bank 2. Sync to cloud | Upsert succeeds, Original IDs preserved |

### Edge Cases

| # | Edge Case | Why It Matters | Input Condition | Expected Handling |
|---|-----------|---------------|-----------------|-------------------|
| 1 | Anonymous request | Security | No JWT in header | Operation denied |
| 2 | Expired JWT | Security | JWT expired 1min ago | 401 Unauthorized |

### Error / Failure Scenarios

| # | Failure | Trigger Condition | Symptoms | Expected Recovery |
|---|---------|-------------------|----------|-------------------|
| 1 | Empty response for own data | RLS policy misspelled | App shows no stats | Ensure `auth.uid() = user_id` exact match |
| 2 | Insert fails for new user | Missing default values alongside RLS | App fails to init | Frontend catches error, flags dev team |

### Expected Outcomes (Definition of Done)

- [ ] 5 target tables have RLS enabled.
- [ ] All 5 target tables have policies restricting access to `auth.uid() = user_id`.

---

## Module: Function Defenses
**Source**: Task Group 3 from tasks.md
**Primary Files**: Backend migration

### Unit Test Cases

| # | Test Name | Input | Expected Output | Priority | Notes |
|---|-----------|-------|----------------|----------|-------|
| 1 | `should_execute_handle_new_user_safely` | Auth signup trigger | Function completes without error | P0 | Validates search_path doesn't break logic |
| 2 | `should_have_fixed_search_path` | `pg_proc` query | `search_path=public` | P0 | Validates setup |
| 3 | `should_prevent_local_function_override` | Malicious function creation | execution failure of malicious function | P1 | Validates security |

### Integration Test Scenarios

| # | Scenario | Components Involved | Preconditions | Steps | Expected Behavior |
|---|----------|--------------------|-|-------|-------------------|
| 1 | User Signup Workflow | Supabase Auth, Trigger | Fix applied | 1. User signs up 2. Trigger fires | User record is properly initialized across public tables without path ambiguity |

### Edge Cases

| # | Edge Case | Why It Matters | Input Condition | Expected Handling |
|---|-----------|---------------|-----------------|-------------------|
| 1 | Database lacking public schema | Execution environment | Unknown schema | Fails securely |
| 2 | Trigger modified later | Persistence | Another migration runs | Verification script flags issue |

### Error / Failure Scenarios

| # | Failure | Trigger Condition | Symptoms | Expected Recovery |
|---|---------|-------------------|----------|-------------------|
| 1 | Generic 500 on signup | `handle_new_user` fails due to search_path | Registration completely broken | Revert search_path, investigate dependencies |
| 2 | Missing dependencies | Function calls extension not in path | Runtime error | Add explicit path to extension |

### Expected Outcomes (Definition of Done)

- [ ] `handle_new_user` has `search_path=public`.

---

## Module: Auth Configuration
**Source**: Task Group 4 from tasks.md
**Primary Files**: Supabase config

### Unit Test Cases

| # | Test Name | Input | Expected Output | Priority | Notes |
|---|-----------|-------|----------------|----------|-------|
| 1 | `should_reject_leaked_password` | "password123" | 400 Bad Request / specific code | P0 | Validates Supabase config |
| 2 | `should_accept_strong_password` | "StrongP@ssw0rd!2026" | 200 OK / User created | P0 | Validates normal signup |
| 3 | `should_return_correct_error_message` | "letmein" | UI displays "Leaked password" | P0 | Validates UI handler |

### Integration Test Scenarios

| # | Scenario | Components Involved | Preconditions | Steps | Expected Behavior |
|---|----------|--------------------|-|-------|-------------------|
| 1 | End-to-end failed signup | UI, Supabase Auth | Leaked pwd protection ON | 1. User enters leaked password 2. Submits | UI shows clear "Password leaked" message |

### Edge Cases

| # | Edge Case | Why It Matters | Input Condition | Expected Handling |
|---|-----------|---------------|-----------------|-------------------|
| 1 | HaveIBeenPwned API down | Service availability | Supabase cannot check password | Depends on Supabase fallback (typically allow or warn) |
| 2 | Password change using leaked | Account takeover risk | Authenticated user changes to leaked pwd | Rejected with same error |

### Error / Failure Scenarios

| # | Failure | Trigger Condition | Symptoms | Expected Recovery |
|---|---------|-------------------|----------|-------------------|
| 1 | Unhandled promise rejection | UI doesn't catch auth error | Blank screen or silent fail | Add explicit try-catch in registration flow |
| 2 | Generic error | Supabase API changes format | UI shows "An error occurred" | Update error parsing |

### Expected Outcomes (Definition of Done)

- [ ] Supabase Auth rejects leaked passwords.
- [ ] Frontend displays appropriate error for leaked passwords.

---

## Module: Integration & Regression
**Source**: Task Group 5 from tasks.md
**Primary Files**: E2E tests

### Unit Test Cases

| # | Test Name | Input | Expected Output | Priority | Notes |
|---|-----------|-------|----------------|----------|-------|
| 1 | `should_load_dashboard_data` | Authed user | Stats load correctly | P0 | Basic smoke test |
| 2 | `should_save_quiz_session` | Finished quiz | study_sessions row added | P0 | Write access check |
| 3 | `should_load_achievements` | Authed user | Achievements display | P0 | Ensures RLS on achievements works |

### Integration Test Scenarios

| # | Scenario | Components Involved | Preconditions | Steps | Expected Behavior |
|---|----------|--------------------|-|-------|-------------------|
| 1 | Complete user lifecycle | Frontend, Supabase | New user | 1. Sign up 2. Complete quiz 3. Check stats | All operations succeed without 401/403 |

### Edge Cases

| # | Edge Case | Why It Matters | Input Condition | Expected Handling |
|---|-----------|---------------|-----------------|-------------------|
| 1 | RLS cache invalidation | Performance | Massive inserts under RLS | Supabase handles gracefully |
| 2 | Interrupted connection | Reliability | Save session, net drops | App retries or saves locally |

### Error / Failure Scenarios

| # | Failure | Trigger Condition | Symptoms | Expected Recovery |
|---|---------|-------------------|----------|-------------------|
| 1 | Cross-contamination | RLS fails | User sees other stats | Alerting on multiple user_ids in single query |
| 2 | Timeout under load | DB index missing | Query takes > 5s | Add index on user_id |

### Expected Outcomes (Definition of Done)

- [ ] All E2E flows pass on staging environment with RLS active.

---

## Cross-Module Integration Tests

These test interactions BETWEEN modules that individual module tests cannot cover.

| # | Scenario | Modules Involved | Flow | Expected Behavior | Risk If Untested |
|---|----------|-----------------|------|-------------------|-----------------|
| 1 | Secure Data Lifecycle | Auth Config → Function Defenses → RLS Implementation | 1. Sign up with strong password 2. Trigger runs safely 3. User queries their new empty stats using JWT | Complete flow succeeds securely | Broken user onboarding |

---

## Coverage Summary

| Metric | Count |
|--------|-------|
| Modules Analyzed | 5 |
| Issues Found (HIGH) | 2 |
| Issues Found (MEDIUM) | 3 |
| Issues Found (LOW) | 1 |
| Unit Test Cases | 15 |
| Integration Scenarios | 5 |
| Edge Cases | 10 |
| Error Scenarios | 10 |
| Cross-Module Scenarios | 1 |

## Appendix: Artifact-to-Module Mapping

| Module | proposal.md | design.md | tasks.md | Spec Files |
|--------|-------------|-----------|----------|------------|
| Verification Infrastructure | Section 2 | Decision 1, 2 | Task 1 | - |
| RLS Implementation | Section 2 | Decision 1 | Task 2 | supabase-security-hardening |
| Function Defenses | Section 2 | Decision 2 | Task 3 | supabase-security-hardening |
| Auth Configuration | Section 2 | Decision 3 | Task 4 | supabase-security-hardening |
| Integration & Regression | - | - | Task 5 | cloud-data-integrity |
