# BRIEFING — 2026-06-12T03:13:17Z

## Mission
審查 `constants/monstersData.ts` 和 `constants/skillsData.ts` 的常數/函式 export 收窄修改，確保無 TS 編譯錯誤且測試無崩潰，沒有任何實作內容的改動。

## 🔒 My Identity
- Archetype: reviewer, critic
- Roles: reviewer, critic
- Working directory: c:\Users\user\Desktop\Quiz-app--main\.agents\reviewer_m2_1
- Original parent: fdba7660-faef-4159-9d5f-31ec42007a62
- Milestone: M2_1
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code.
- 必須使用繁體中文。
- 所有互動必須使用繁體中文。
- 禁止截斷程式碼，必須輸出完整檔案內容。
- 嚴禁使用 any 型別，使用 unknown + 型別守衛。
- 專案程式碼與測試在修改後必須通過 `npx tsc --noEmit` 和 `npm test`。

## Current Parent
- Conversation ID: fdba7660-faef-4159-9d5f-31ec42007a62
- Updated: not yet

## Review Scope
- **Files to review**:
  - `constants/monstersData.ts`
  - `constants/skillsData.ts`
  - `hooks/useBattleSystem.ts` (確認引用關係)
- **Interface contracts**:
  - `types/battleTypes.ts`
- **Review criteria**:
  - 正確移除指定常數/函式的 export 關鍵字。
  - 正確保留被外部引用的常數 export。
  - 沒有修改任何實作內容。
  - 通過編譯和單元測試。

## Review Checklist
- [ ] 檢查 `monstersData.ts` 中移除 export：`NORMAL_MONSTERS`, `ELITE_MONSTERS`, `BOSS_MONSTERS`, `ALL_MONSTERS`。
- [ ] 檢查 `monstersData.ts` 中保留 export：`NORMAL_MONSTER_IDS`, `ELITE_MONSTER_IDS`, `BOSS_MONSTER_IDS`。
- [ ] 檢查 `skillsData.ts` 中移除 export：`BASIC_SKILLS`, `INTERMEDIATE_SKILLS`, `ADVANCED_SKILLS`, `ULTIMATE_SKILLS`, `EPIC_SKILLS`, `LEGENDARY_SKILLS`, `ALL_SKILLS`, `getSkillsByTier`。
- [ ] 執行 `npx tsc --noEmit` 確認無 TypeScript 錯誤。
- [ ] 執行 `npm test` 確認單元測試通過。
- [ ] 確認修改僅限於 `export` 關鍵字，無實作變更。

## Attack Surface
- **Hypotheses tested**: [TBD]
- **Vulnerabilities found**: [TBD]
- **Untested angles**: [TBD]

## Key Decisions Made
- [TBD]

## Artifact Index
- `c:\Users\user\Desktop\Quiz-app--main\.agents\reviewer_m2_1\ORIGINAL_REQUEST.md` — 原始任務請求。
- `c:\Users\user\Desktop\Quiz-app--main\.agents\reviewer_m2_1\progress.md` — 任務進度紀錄。
- `c:\Users\user\Desktop\Quiz-app--main\.agents\reviewer_m2_1\handoff.md` — 最終交接報告。
