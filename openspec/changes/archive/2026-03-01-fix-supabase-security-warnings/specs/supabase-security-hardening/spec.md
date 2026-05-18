## ADDED Requirements

### Requirement: Row Level Security on Public Tables
The system MUST enforce Row Level Security (RLS) on the following tables: `study_sessions`, `user_study_stats_30day`, `user_streaks`, `user_achievements`, and `challenges`. It SHALL restrict access to those rows where the user identifier matches the authenticated session's UID.

#### Scenario: Unauthorized Access Blocked
- **WHEN** an unauthenticated client or an authenticated client with a `uid` different from the row's owner attempts to SELECT or UPDATE the `study_sessions` table
- **THEN** the Database MUST return an empty result set (for SELECT) or throw an error/deny the operation (for UPDATE/DELETE/INSERT)
- **AND** the database linter SHALL NOT report the table as having RLS disabled

#### Scenario: Authorized Access Allowed
- **WHEN** an authenticated user queries their own `user_study_stats_30day` where `user_id` equals `auth.uid()`
- **THEN** the Database MUST return the correct rows or allow modification

### Requirement: Secure Function Search Path
The function `public.handle_new_user` MUST be configured with a defined `search_path` to prevent privilege escalation via schema manipulation.

#### Scenario: Function Invocation is Path-Secure
- **WHEN** `handle_new_user` is triggered upon user registration
- **THEN** it MUST execute using the strict namespace provided by the configuration (e.g., `public`), disregarding the caller's mutable search path
- **AND** the database linter SHALL NOT report the function as having a mutable search path

### Requirement: Leaked Password Protection in Auth
The Supabase authentication service MUST be configured to refuse passwords identified in leaked password databases.

#### Scenario: Vulnerable Password Usage Denied
- **WHEN** a user attempts to sign up or change their password using a known compromised password (e.g. found on HaveIBeenPwned)
- **THEN** the Supabase Auth system MUST reject the request
- **AND** the Frontend SHOULD display an error instructing the user to pick a more secure password
- **AND** the database linter SHALL NOT report leaked password protection as disabled
