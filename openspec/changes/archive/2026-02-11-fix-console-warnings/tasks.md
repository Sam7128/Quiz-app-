## 1. Fix Supabase Challenge Query

- [x] 1.1 In `services/challenges.ts` → `getMyChallenges()`, update the `.select()` FK hints from `profiles!challenger_id` / `profiles!opponent_id` to `profiles!challenges_challenger_id_fkey` / `profiles!challenges_opponent_id_fkey`
- [x] 1.2 Also update the `banks` hint to `banks!challenges_bank_id_fkey` for consistency

## 2. Add Favicon

- [x] 2.1 Create `public/favicon.svg` (brand-colored "M" SVG icon)
- [x] 2.2 Add `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` to `index.html` `<head>`

## 3. Verify

- [x] 3.1 Run `npm run build` to ensure no build errors
- [x] 3.2 Confirm `/favicon.ico` 404 is gone in browser console
- [x] 3.3 Confirm `/rest/v1/challenges` 400 is gone in browser console
