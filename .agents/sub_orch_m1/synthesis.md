# Analysis Synthesis - M1 型別與介面清理

## Consensus (共識)
1. **清理對象的使用情況**：
   - `types.ts` 的 `MistakeLogEntry`：僅在 `types.ts` 被 `MistakeLog` 引用，外部無引用。可改為內部介面。
   - `types/battleTypes.ts` 的 `SkillAnimationType`, `SkillThreshold`, `SKILL_THRESHOLDS`, `PracticeChunkStatus`：皆只在該檔案內部使用。可改為內部定義（移除 `export`）。
   - `types/battleTypes.ts` 的 `Hero` 與 `BattleEvent`：除了定義外，在專案中無任何其他地方使用。可物理刪除。
   - `services/analytics.ts` 的 `StudySession`：專案內部無引用。可物理刪除。
   - `hooks/useChunkedPractice.ts` 的 `UseChunkedPracticeReturn`：僅在該行定義，專案中無其他引用。可物理刪除。
   - `contexts/ToastContext.tsx` 的 `Toast`：雖在 contexts 內部被使用，並透過 `useToast()` 被外部推導，但外部無直接 import。可改為內部介面。

2. **安全與風險評估**：
   - 移除不必要的 `export` 與物理刪除死代碼將限制其作用域或減少冗餘程式碼，並不會對外部檔案的使用與類型推導產生任何破壞性影響。
   - 變更完成後，透過 `npx tsc --noEmit`、`npm test`、`npm run build` 三個階段進行確認，便能完整檢驗安全性。

## Proposed Action Steps (變更步驟)
由 Worker 在獨立的 workspace 下依序執行下列檔案的修改（具體行號見 Explorer 3 Handoff 報告）：
1. 修改 `types.ts`
2. 修改 `types/battleTypes.ts`
3. 修改 `services/analytics.ts`
4. 修改 `hooks/useChunkedPractice.ts`
5. 修改 `contexts/ToastContext.tsx`
每一動完成後需進行編譯與測試驗證，並在最後提請 Review 審查。
