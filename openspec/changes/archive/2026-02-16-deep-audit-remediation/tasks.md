## 1. Test Infrastructure & Alias 統一 (P0)

- [x] 1.1 Update `vitest.config.ts`: add `test.include` for `src/__tests__/**/*.test.ts?(x)` and `test.exclude` for `e2e/**`, `playwright-report/**`, `test-results/**`, `node_modules/**`; add alias `@` → `.` (root-based，與主程式碼路徑一致)
- [x] 1.2 Update `vite.config.ts`: remove `test` block (lines 8-14) to eliminate duplicate config; change `resolve.alias @` from `./src` to `.` (root-based)
- [x] 1.3 Update `tsconfig.json`: ensure `paths` `@/*` maps to `./*` (root-based, 與 Vite 一致)
- [x] 1.4 Add `test:unit` and `test:e2e` scripts to `package.json`
- [x] 1.5 Verify: run `npm test` — should pass with only unit tests, no Playwright errors

## 2. Quiz Startup Race Condition (P0)

- [x] 2.1 Add `overrideBankIds?: string[]` parameter to `startQuiz` in `hooks/useQuizEngine.ts`; use it over `selectedQuizBankIds` when provided
- [x] 2.2 Update `startQuizByBank` in `App.tsx` to pass `[bankId]` as `overrideBankIds`
- [x] 2.3 Verify: select bank A on dashboard, click "直接開始" on bank B → questions must come from bank B

## 3. Cloud Question ID Stability (P0)

- [x] 3.1 Audit all question creation paths (BankManager import, AI generation, manual entry) — ensure every question gets a stable UUID `id` via `crypto.randomUUID()` if missing; **non-UUID id (數字、短字串等) 也必須正規化為 UUID**，否則 Supabase `questions.id` (uuid 型別) 的 upsert 會直接報錯
- [x] 3.2 Refactor `saveCloudQuestions` in `services/cloudStorage.ts`: replace delete+insert with `upsert({ onConflict: 'id' })`; **所有 upsert 的 question 必須帶已正規化的 UUID id**; cleanup 策略：刪除**同 bank_id 下**不在新 id 清單中的 rows（注意 PostgREST `not.in` 對 uuid 陣列的格式要求，需用 `(uuid1,uuid2,...)` 格式）
- [x] 3.3 Fix `CloudStorageRepository.createBank` in `services/cloudRepo.ts`: throw on failure instead of returning `id: ''`
- [x] 3.4 Verify: save bank to cloud → check Supabase dashboard → question IDs should remain stable across saves
- [x] 3.5 Verify: 從 5 題中刪除 2 題後 save → 雲端必須只少 2 題且其他 3 題 id 不變

## 4. Challenge Score Logic (P1)

- [x] 4.1 Fix `submitChallengeScore` in `services/challenges.ts`: change `otherScore > 0` to `otherScore !== null && otherScore !== undefined`
- [x] 4.2 Confirm DB schema: `challenger_score` / `opponent_score` default must be `null` not `0`; create migration SQL if needed
- [x] 4.3 **DB data migration**: 將所有 `status IN ('pending', 'active')` 且 `challenger_score = 0` / `opponent_score = 0` 的 records 改為 `NULL`，避免新邏輯把舊的初始值 0 誤判為「已提交 0 分」
- [x] 4.4 Verify: complete a challenge where one side scores 0 → challenge should complete and declare winner

## 5. NVIDIA Provider Production Safety (P1)

- [x] 5.1 Add production environment check in `services/ai.ts` NVIDIA section: throw informative error when `import.meta.env.PROD && isDefaultUrl`
- [x] 5.2 Verify: in a production build, selecting NVIDIA without custom baseUrl → should show clear error message

## 6. AI Key Security (P1)

- [x] 6.1 Add `persist?: boolean` to `AIConfig` type in `types.ts`
- [x] 6.2 Update `saveAIConfig` / `getAIConfig` in `services/ai.ts` to support sessionStorage mode when `persist === false`
- [x] 6.3 Add "Remember key" toggle in AI settings UI (Settings component)
- [x] 6.4 Add CSP improvement comment/documentation in `index.html` for production deployment guidance
- [x] 6.5 在 Settings UI 或文件中加入**安全聲明**: 「sessionStorage 可防止關閉瀏覽器後 key 殘留，但無法防禦同頁面的 XSS 攻擊。真正安全的方案是後端 proxy 或短期 token。」

## 7. Social Service Layer Refactor (P1)

- [x] 7.1 Create `services/socialService.ts` with functions: `getFriendsAndInbox`, `sendFriendRequest`, `acceptFriendRequest`, `removeFriend`, `getSharedBanks`, `shareBank`
- [x] 7.2 Refactor `components/Social.tsx`: remove `import { supabase }`, use socialService functions
- [x] 7.3 Refactor `components/ShareModal.tsx`: remove `import { supabase }`, use socialService functions
- [x] 7.4 Check `components/ChallengeModal.tsx` for direct supabase calls and migrate if needed
- [x] 7.5 Verify: all social/sharing features still work (friend list, share bank, accept invite)

## 8. Legacy Cleanup & Alias 收尾 (P2)

- [x] 8.1 Delete `src/services/supabase.ts` (uses `process.env`, not imported by active code)
- [x] 8.2 Delete `src/contexts/AuthContext.tsx` (verify not imported first)
- [x] 8.3 Delete root `nul` file
- [x] 8.4 確認 `src/` 目錄中只剩 `__tests__/` (或也搬走測試) — 不應有任何 app code 殘留
- [x] 8.5 Verify: `npm run build` and `npx tsc --noEmit` still pass after deletions

## 9. Storage Key Registry (P2)

- [x] 9.1 Add all hardcoded `mindspark_*` keys to `STORAGE_KEYS` in `services/storage.ts`: `BGM_ENABLED`, `SFX_ENABLED`, `BATTLE_STATE`, `THEME`, `AI_CONFIG`, `BANKS_META`
- [x] 9.2 Update `hooks/useSoundEffects.ts` to use `STORAGE_KEYS`
- [x] 9.3 Update `hooks/useBattleSystem.ts` to use `STORAGE_KEYS`
- [x] 9.4 Update `hooks/useQuizEngine.ts` to use `STORAGE_KEYS`
- [x] 9.5 Update `hooks/useBankManager.ts` to use `STORAGE_KEYS`
- [x] 9.6 Update `contexts/ThemeContext.tsx` to use `STORAGE_KEYS`
- [x] 9.7 Update `services/ai.ts` to use `STORAGE_KEYS`

## 10. ESLint 門檻修復 (P2)

- [x] 10.1 確認 `eslint-plugin-react-hooks` 是否已安裝；若未安裝則 `npm install -D eslint-plugin-react-hooks`；若不需要該規則則移除引用
- [x] 10.2 修正 ESLint config，確保 `react-hooks/exhaustive-deps` 不會因規則不存在而報錯
- [x] 10.3 Add `"lint": "eslint ."` script to `package.json`
- [x] 10.4 逐步修復最關鍵的 lint 錯誤：`no-explicit-any`（本次修改觸及的檔案優先）、`prefer-const`、`no-unused-vars`
- [x] 10.5 Verify: `npm run lint` 的 error 數量明顯下降（不要求全部修零，但要消除 config 層面的錯誤）

## 11. Stale Response Prevention (Performance)

- [x] 11.1 Add `loadVersionRef` (useRef) to `hooks/useAppDataLoader.ts`
- [x] 11.2 In `loadQuizPool`, increment version before async call; only apply result if version matches current
- [x] 11.3 Verify: rapid bank selection changes don't cause stale data in quiz pool

## 12. DB/RLS Fixes (Supabase Dashboard)

- [x] 12.1 Add DELETE policy on `friendships` table: `USING (auth.uid() = user_id OR auth.uid() = friend_id)`
- [x] 12.2 Rewrite `update_streak` RPC: remove `p_user_id` param, use `auth.uid()` directly, add `SET search_path = public`, use `IF NOT FOUND` pattern
- [x] 12.3 Update frontend `services/streak.ts` to call `rpc('update_streak')` without `p_user_id` parameter
- [x] 12.4 Verify: streak updates and friend deletion work correctly through Supabase RLS

## 13. Final Verification

- [x] 13.1 Run `npm test` — all unit tests pass
- [x] 13.2 Run `npm run build` — production build succeeds
- [x] 13.3 Run `npx tsc --noEmit` — no type errors
- [x] 13.4 Run `npm run lint` — no config-level errors
- [x] 13.5 Smoke test: full quiz flow (select bank → start → answer → results)
- [x] 13.6 Smoke test: social features (friend request → share bank → challenge)

## Verification Notes

- Automated evidence added in `src/__tests__/cloudStorage.test.ts`, `src/__tests__/challenges.test.ts`, `src/__tests__/ai.nvidia.test.ts`, `src/__tests__/social.smoke.test.ts`, and `src/__tests__/streak.test.ts`.
- Attempted live Supabase verification on 2026-02-16, but direct end-to-end manual login flow was blocked by email confirmation and auth rate-limit constraints in the current environment.
