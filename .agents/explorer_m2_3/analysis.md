# 函式引用分析與安全性評估報告

本報告針對 `services/storage.ts` 中的三個特定項目清理輔助函式進行了完整的引用追蹤與安全性影響評估。

## 一、 目標函式定義與功能

這三個函式均定義於 `services/storage.ts` 中，主要負責清理與特定題目 ID（`questionId`）相關的本地快取與狀態數據：

### 1. `removeQuestionFromQuizSession`
* **定義位置**：`services/storage.ts` 第 373 - 392 行。
* **功能簡介**：從目前儲存於 `localStorage` 的 Quiz Session 中移除指定的題目 ID，並從 `wrongQuestionIds` 中過濾掉。若移除後無剩餘題目，則直接呼叫 `clearQuizSession()` 刪除該 Session；否則，重新計算作答索引並將更新後的 Session 寫回。
* **實作內容**：
  ```typescript
  export const removeQuestionFromQuizSession = (questionId: string): void => {
    const session = getQuizSession();
    if (!session) return;

    const nextQuestionIds = session.questionIds.filter((id) => id !== questionId);
    const nextWrongIds = session.wrongQuestionIds.filter((id) => id !== questionId);

    if (nextQuestionIds.length === 0) {
      clearQuizSession();
      return;
    }

    saveQuizSession({
      ...session,
      questionIds: nextQuestionIds,
      wrongQuestionIds: nextWrongIds,
      currentIndex: Math.min(session.currentIndex, nextQuestionIds.length - 1),
      savedAt: Date.now(),
    });
  };
  ```

### 2. `removeQuestionFromRecentMistakeSessions`
* **定義位置**：`services/storage.ts` 第 655 - 668 行。
* **功能簡介**：從近期錯題練習會話（`recentMistakeSessions`，限制最多 5 個）中過濾掉指定的題目 ID。若過濾後某個會話內已無任何錯題，則該會話亦會自列表中移除。
* **實作內容**：
  ```typescript
  export const removeQuestionFromRecentMistakeSessions = (questionId: string): void => {
    try {
      const list = getRecentMistakeSessions()
        .map((session) => ({
          ...session,
          mistakes: session.mistakes.filter((mistake) => mistake.questionId !== questionId),
        }))
        .filter((session) => session.mistakes.length > 0);

      localStorage.setItem(STORAGE_KEYS.RECENT_MISTAKES, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to remove question from recent mistake sessions', e);
    }
  };
  ```

### 3. `deleteSpacedRepetitionItem`
* **定義位置**：`services/storage.ts` 第 701 - 711 行。
* **功能簡介**：從 `localStorage` 的間隔重複（Spaced Repetition）資料中刪除特定題目 ID 的學習狀態（包含 Easiness Factor、複習間隔等）。
* **實作內容**：
  ```typescript
  export const deleteSpacedRepetitionItem = (questionId: string): void => {
    try {
      const data = getSpacedRepetition();
      if (data[questionId]) {
        delete data[questionId];
        localStorage.setItem(STORAGE_KEYS.SPACED_REPETITION, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to delete spaced repetition item', e);
    }
  };
  ```

---

## 二、 專案內引用情況追蹤

利用 `grep_search` 在專案中進行全域搜尋後，所得之引用情況如下：

### 1. 目標 3 個函式的直接引用情況
在 `services/storage.ts` 之外，**無任何正式代碼檔案直接導入（import）或調用這三個函式**。
它們在程式碼中唯一的調用點位於 `services/storage.ts` 內部的 `deleteQuestionArtifacts` 函式：
```typescript
export const deleteQuestionArtifacts = (questionId: string): void => {
  removeMistake(questionId);
  deleteSpacedRepetitionItem(questionId);
  removeQuestionFromRecentMistakeSessions(questionId);
  removeQuestionFromQuizSession(questionId);
};
```

### 2. `deleteQuestionArtifacts` 的調用鏈與引用點
雖然目標三個函式無直接外部引用，但由於它們是 `deleteQuestionArtifacts` 內部不可或缺的部分，故會隨 `deleteQuestionArtifacts` 的觸發而被**間接引用**。`deleteQuestionArtifacts` 的引用情況如下：
* **`services/repository.ts`**：
  在 `IStorageRepository` 介面中聲明了此方法：
  ```typescript
  deleteQuestionArtifacts(questionId: string): Promise<void>;
  ```
* **`services/localRepo.ts`** (本地儲存庫)：
  導入 `deleteQuestionArtifacts` 並實現介面方法：
  ```typescript
  async deleteQuestionArtifacts(questionId: string): Promise<void> {
    deleteQuestionArtifacts(questionId);
  }
  ```
* **`services/cloudRepo.ts`** (雲端儲存庫)：
  導入並作為 `deleteLocalQuestionArtifacts` 調用，同時清理雲端的資料：
  ```typescript
  async deleteQuestionArtifacts(questionId: string): Promise<void> {
    deleteLocalQuestionArtifacts(questionId);
    await deleteCloudSpacedRepetition(questionId);
  }
  ```
* **`components/BankManager.tsx`**：
  在使用者刪除題目的流程（`handleDeleteQuestion`）中，負責清理該題目的本地狀態：
  ```typescript
  await repository.saveQuestions(currentBankId, updatedQuestions);
  await repository.deleteQuestionArtifacts(questionId);
  ```
* **`src/__tests__/storage.questionArtifacts.test.ts`**：
  專屬的單元測試，用以驗證 `deleteQuestionArtifacts` 是否能正確清除錯題記錄、間隔重複、近期錯題以及進行中 quiz session 的引用。

---

## 三、 死碼清理規範與歷史背景

我們在專案的規範與歷史文件中發現了關於這三個函式的討論：
1. **`docs/reports/DEAD_CODE_REPORT_2026_06_10.md`**：
   * **誤判**：該報告將這三個函式誤列為「死碼（大部分可清理）」，理由是專案引進了 UUID 識別，舊的清理機制被廢棄。
2. **`openspec/changes/dead-code-cleanup/proposal.md` & `tasks.md`**：
   * **修正**：專案隨後的清理規劃中修正了上述誤判。明確指出這三個函式仍被 `deleteQuestionArtifacts` 內部調用，**絕不能刪除函式本體**。
   * **清理策略**：將這三個函式的 `export` 關鍵字拿掉，轉為 `services/storage.ts` 的內部函式，僅向外暴露 `deleteQuestionArtifacts`。

---

## 四、 安全性評估與建議

### 1. 移除 `export` 關鍵字的安全性：高（完全安全）
* **評估**：經全域搜尋，除 `services/storage.ts` 本身外，沒有其他檔案直接 import 這三個函式。
* **結論**：將這三個函式改為非導出（`const` 代替 `export const`）是**百分之百安全**的，不會影響任何模組的編譯，並有助於內聚設計，減少外部 API 的暴露。

### 2. 刪除函式本體的危險性：極高（不可刪除）
* **評估**：若直接將這三個函式從 `services/storage.ts` 中移除，將會導致：
  1. `deleteQuestionArtifacts` 呼叫時拋出 `ReferenceError` 崩潰。
  2. 導致 `components/BankManager.tsx` 在使用者刪除題目時，執行到 `deleteQuestionArtifacts(questionId)` 時拋出未捕獲錯誤，造成刪除流程中斷、UI 出現錯誤提示，或資料保存不完全。
  3. 單元測試 `storage.questionArtifacts.test.ts` 失敗。
  4. 殘留已刪除題目的間隔重複資料與近期錯題 Session，導致 `localStorage` 冗餘，且未來讀取到這些無效 ID 時，可能因查無對應題目而引發前端 UI 閃退。
* **結論**：這三個函式絕不可被物理刪除，必須維持其本體完整性。

### 3. 建議方案
* 遵循 `openspec/changes/dead-code-cleanup/tasks.md` 的規劃，僅將 `export const` 修改為 `const`，保留函式功能，並維持 `deleteQuestionArtifacts` 對它們的正確調用。
