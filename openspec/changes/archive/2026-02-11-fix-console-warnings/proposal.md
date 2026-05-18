## Why

Application console outputs two persistent errors on every page load:
1. **Favicon 404**: Browser requests `/favicon.ico` but no icon file exists in `public/`, causing a `404 Not Found` every load.
2. **Supabase 400**: The `getMyChallenges()` query in `services/challenges.ts` uses ambiguous foreign key hints (`profiles!challenger_id`, `profiles!opponent_id`) that Supabase PostgREST cannot resolve, returning `400 Bad Request`.

These pollute the developer console and mask real errors.

## What Changes

- **Add favicon**: Create `public/favicon.svg` and link it in `index.html`.
- **Fix Supabase query**: Update the PostgREST embedded resource hint in `getMyChallenges()` to use explicit FK constraint names (`challenges_challenger_id_fkey`, `challenges_opponent_id_fkey`).

## Capabilities

### New Capabilities

_(none — this is a bugfix)_

### Modified Capabilities

- `social-sharing`: Fix the `challenges` query join syntax to use explicit constraint names, resolving the 400 error on the social/challenges feature.

## Impact

- **Files**: `services/challenges.ts`, `index.html`, new `public/favicon.svg`.
- **Database**: No schema changes; only the client-side query syntax is corrected.
- **Risk**: Low. Favicon is purely additive. The query fix targets a single function (`getMyChallenges`).
