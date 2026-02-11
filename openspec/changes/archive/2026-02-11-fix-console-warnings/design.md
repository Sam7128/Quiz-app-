## Context

The application logs two recurring console errors on every page load:
1. `GET /favicon.ico 404` — No favicon exists.
2. `GET /rest/v1/challenges?... 400` — Ambiguous FK hint in the PostgREST select query for `challenges`.

The `challenges` table has **three** foreign keys to `profiles` (`challenger_id`, `opponent_id`, `current_turn`), plus one FK to `banks` (`bank_id`). The current code uses `profiles!challenger_id` as the hint, but PostgREST requires the **constraint name** (e.g., `challenges_challenger_id_fkey`) when there are multiple FKs to the same table.

## Goals / Non-Goals

**Goals:**
- Eliminate the 400 error from the `challenges` query.
- Eliminate the 404 error by providing a favicon.

**Non-Goals:**
- Redesigning the challenge feature or its database schema.
- Adding a production-grade favicon (a simple SVG is sufficient).

## Design

### 1. Supabase Query Fix (`services/challenges.ts`)

In `getMyChallenges()`, switch from PostgREST embedded resources to a **Manual Join** strategy:
1. Fetch raw challenges (`select('*')`).
2. Collect unique user IDs and bank IDs.
3. Perform separate `in()` queries for profiles and banks.
4. Map the related data to the challenge objects in memory.

**Rationale**: The embedded resource syntax (`profiles!constraint_name`) proved unreliable due to potential schema/migration mismatches. Manual application-side joins are robust and strictly typed.

### 2. Favicon (`public/favicon.svg` + `index.html`)

Create a minimal SVG favicon with a brand-colored "M" glyph and add a `<link rel="icon">` tag to `index.html`.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Use SVG instead of ICO | Modern browsers support SVG; no build tool needed. |
| 2 | Use PostgreSQL default FK constraint naming | Standard convention; matches the `CREATE TABLE` migration SQL. |

## Risks / Trade-offs

- **Risk**: If the Supabase DB was migrated with non-default constraint names, the fix will still fail. Mitigation: The existing error-suppression logic (line 195) already handles this gracefully.
