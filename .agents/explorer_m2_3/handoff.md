# Handoff Report - explorer_m2_3

## 1. Observation
* **函式定義與行號**：
  * `removeQuestionFromQuizSession` 定義於 `services/storage.ts:373`
  * `removeQuestionFromRecentMistakeSessions` 定義於 `services/storage.ts:655`
  * `deleteSpacedRepetitionItem` 定義於 `services/storage.ts:701`
* **內部調用點**：
  * 這三個函式均在 `services/storage.ts:717-722` 中的 `deleteQuestionArtifacts` 內部被調用：
    ```typescript
    export const deleteQuestionArtifacts = (questionId: string): void => {
      removeMistake(questionId);
      deleteSpacedRepetitionItem(questionId);
      removeQuestionFromRecentMistakeSessions(questionId);
      removeQuestionFromQuizSession(questionId);
    };
    ```
* **外部直接引用**：
  * 經 `grep_search` 搜尋，在 `services/storage.ts` 外部**無任何**直接對這三個名稱的 `import` 或調用。
* **間接引用鏈**：
  * `deleteQuestionArtifacts` 被 `services/localRepo.ts:64` 與 `services/cloudRepo.ts:80` 所導入並實現，最終由 `components/BankManager.tsx:513` 在使用者刪除題目時調用。
  * `src/__tests__/storage.questionArtifacts.test.ts:4` 導入並測試了 `deleteQuestionArtifacts`。
* **清理規劃文檔**：
  * `docs/reports/DEAD_CODE_REPORT_2026_06_10.md` 誤將此三函式列為「死碼（大部分可清理）」。
  * `openspec/changes/dead-code-cleanup/proposal.md:82` 與 `tasks.md:122` 修正了該誤判，並將策略調整為「取消 export 關鍵字，但保留函式本體」。

---

## 2. Logic Chain
1. 全域 grep 搜尋結果顯示，在 `services/storage.ts` 之外，完全沒有對 `removeQuestionFromQuizSession`、`removeQuestionFromRecentMistakeSessions`、`deleteSpacedRepetitionItem` 這三個函式的直接導入或調用。
2. 因此，這三個函式是模組的內部實作細節，將其 `export` 關鍵字拿掉是完全安全的，不會引起外部任何編譯或語法錯誤。
3. 然而，它們是 `deleteQuestionArtifacts` 內部正常運作的依賴。而 `deleteQuestionArtifacts` 會在使用者刪除題目（`BankManager.tsx` 的刪除流程）時被呼叫。
4. 若直接物理刪除這三個函式的本體，將導致 `deleteQuestionArtifacts` 在執行時拋出 `ReferenceError` 異常，破壞題目的刪除流程與資料完整性，且會使 `storage.questionArtifacts.test.ts` 單元測試失敗。
5. 由此推導出結論：不可直接刪除本體，但可以安全移除其 `export`。

---

## 3. Caveats
* 本分析完全基於當前專案分支的代碼實作。
* 若有其他並行開發的分支直接導入了這三個函式，在分支合併並應用「取消 export」的改動後可能會產生編譯錯誤，需在合併時重新核對。

---

## 4. Conclusion
* **引用情況**：外部直接引用數為 0；間接引用（透過 `deleteQuestionArtifacts`）在題目刪除流程（`BankManager.tsx`、`localRepo.ts`、`cloudRepo.ts` 及單元測試）中被調用。
* **安全性評估**：
  * **取消 `export` 導出**：**安全**，不會引發任何編譯錯誤。
  * **直接物理刪除本體**：**極危險**，會導致刪除題目功能崩潰，單元測試失敗，且 local 狀態無法妥善清理。
* **重構建議**：遵循 `openspec` 規劃，將其改為 `services/storage.ts` 內部函式（移除 `export`），但保留本體。

---

## 5. Verification Method
1. **編譯檢查**：在專案根目錄下執行：
   ```bash
   npx tsc --noEmit
   ```
   以確認當前沒有任何類型或匯出引用錯誤。
2. **單元測試**：在專案根目錄下執行：
   ```bash
   npm test src/__tests__/storage.questionArtifacts.test.ts
   ```
   以確保刪除題目的本地資料清理邏輯依然維持通過狀態。
