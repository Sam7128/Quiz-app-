# 邏輯與架構審查報告 (Logic & Architecture Audit Report)
**審查日期**：2026-06-08  
**審查員**：Agent 2 [邏輯與架構審查員] (Project Inquisitor)  
**專案名稱**：MindSpark Quiz App  

---

## 🔍 執行摘要
本報告針對 `Quiz-app--main` 進行了深度、無害的靜態代碼與架構稽核。我們從**商業邏輯矛盾**、**狀態管理與競爭條件**、**架構設計對齊度**以及**組件生命週期與效能**四個維度，挖掘出數個具備高隱患的設計缺陷與實現漏洞，並為每個漏洞提供了成因剖析、連鎖影響評估及具體的偽代碼（Pseudo-code）修復方案。

---

## 1. 商業邏輯矛盾 (Business Logic Flaws)

### 🚨 漏洞 1.1：戰鬥與答題系統狀態單向盲信，缺乏雙向狀態校驗
- **檔案路徑**：
  - [components/QuizCard.tsx](file:///c:/Users/user/Desktop/Quiz-app--main/components/QuizCard.tsx#L209-L211)
  - [hooks/useBattleSystem.ts](file:///c:/Users/user/Desktop/Quiz-app--main/hooks/useBattleSystem.ts#L309-L330)
- **問題成因**：
  在 `QuizCard.tsx` 中提交答案時，系統僅以單純的 `isCorrect` 布林值觸發 `triggerAnswer(isCorrect)`，而戰鬥狀態機（`useBattleSystem`）對此布林值採取「完全盲信」態度。戰鬥系統與 Quiz 引擎（`useQuizEngine`）之間缺乏雙向校驗機制。惡意使用者或前端腳本可輕易繞過答題邏輯，直接在 Console 或透過 React Developer Tools 修改 state，甚至直接調用暴露的 `triggerAnswer(true)`，即可在不回答任何問題的情況下造成怪物傷害、觸發高階技能並解鎖戰鬥成就。
- **連鎖影響**：
  - 破壞成就系統與排行榜（Challenge System）的公平性。
  - 用戶可透過竄改前端 Memory / Event Payload 達到無限暴擊與無傷通關。
- **偽代碼修復方案**：
  在 `useBattleSystem` 中引入答題金鑰（Question Token）或與 `useQuizEngine` 的 Session State 進行安全雜湊/狀態同步校驗。
  ```typescript
  // 建議在 triggerAnswer 中加入當前題目 ID 與答題防偽雜湊校驗
  interface AnswerVerification {
    questionId: string;
    answerPayload: string | string[];
    timestamp: number;
    securityHash: string; // 由 Quiz Engine 基於 salt 生成
  }

  const triggerAnswer = (
    isCorrect: boolean, 
    verification?: AnswerVerification
  ) => {
    if (gameMode) {
      // 驗證答題時效與雜湊，防止惡意 replay 或直接偽造 isCorrect
      const isValid = verifyAnswerSecurity(verification);
      if (!isValid) {
        console.error("答題校驗失敗，可能存在惡意篡改");
        return;
      }
      // 執行原戰鬥狀態流轉
    }
  };
  ```

---

## 2. 狀態管理與競爭條件 (State Management & Race Conditions)

### 🚨 漏洞 2.1：雲端存檔成功後直接刪除本機備份，離線/網路波動導致進度徹底遺失
- **檔案路徑**：
  - [services/cloudRepo.ts](file:///c:/Users/user/Desktop/Quiz-app--main/services/cloudRepo.ts#L180-L195)
  - [services/storage.ts](file:///c:/Users/user/Desktop/Quiz-app--main/services/storage.ts#L186-L189)
- **問題成因**：
  在 `CloudStorageRepository.savePracticeSession` 中，當雲端 `saveCloudPracticeSession` 成功時，系統會立即調用 `removeLocalPracticeSessionCache(session.id)` 將該 session 從本地 localStorage 的 `mindspark_practice_sessions` 中徹底移除。
  然而，`getPracticeSessions` 讀取資料的邏輯是：如果雲端回傳的 session 列表為空（例如 API 限流、短暫斷網或 Supabase 傳回空回應），則會回退讀取本地備份。由於本地備份已被 `removeLocalPracticeSessionCache` 刪除，使用者再次整理網頁時，其進行中或已完成的練習進度將**完全消失**。
- **連鎖影響**：
  - 網路瞬斷或雲端服務短暫不可用時，用戶進度發生致命丟失。
  - 本機已產生的 chunk drafts 失去父 Session 關聯，成為永久殘留在 localStorage 中的孤兒資料。
- **偽代碼修復方案**：
  不要刪除本地的 Practice Session。而是僅將其 `dirty` 標記設為 `false`，並在本地保留一份與雲端一致的快照，只有在用戶主動「放棄 (abandon)」或「刪除 (delete)」該 session 時才真正做實體刪除。
  ```typescript
  // services/cloudRepo.ts 重構建議
  async savePracticeSession(session: ChunkedPracticeSession): Promise<void> {
    try {
      await saveCloudPracticeSession(session);
      // 僅清除 dirty 標記並保留本地快照，而不是刪除本地 session
      saveLocalPracticeSession({
        ...session,
        dirty: false,
        lastSyncedAt: Date.now()
      });
    } catch (error) {
      // 容錯回退，標記為 dirty
      saveLocalPracticeSession({
        ...session,
        dirty: true,
        lastSyncError: error.message,
        updatedAt: Date.now()
      });
    }
  }
  ```

### 🚨 漏洞 2.2：`syncLocalPracticeSessions` 異步更新 Race Condition（遺失更新）
- **檔案路徑**：
  - [services/cloudStorage.ts](file:///c:/Users/user/Desktop/Quiz-app--main/services/cloudStorage.ts)
- **問題成因**：
  當使用者開啟多個分頁，或在網路恢復瞬間快速觸發同步時，多個 `syncLocalPracticeSessions` 會被並行調用。雖然當前程式碼在全域 window 上設定了 `__MINDSPARK_SYNC_LOCK__`，但這僅限於單一分頁內防護。跨分頁的多個渲染執行序會同時讀取舊的 localStorage 狀態，並向 Supabase 發送並行 upsert 請求。當 Supabase 異步處理完成並回傳時，各分頁會基於自己持有之舊 snapshot 覆寫 `localStorage`，導致其中一個分頁的寫入被另一個覆蓋（經典的 Read-Modify-Write 競爭條件）。
- **連鎖影響**：
  - 本地 localStorage 數據損毀或狀態倒退。
  - 同步鎖在跨標籤頁環境下形同虛設。
- **偽代碼修復方案**：
  使用 Web Locks API (`navigator.locks`) 或 BroadcastChannel 來實現可靠的跨分頁同步排他鎖，或在寫入 localStorage 前重新執行「讀取-合併-寫入」的原子操作。
  ```typescript
  // 跨標籤頁安全同步鎖設計
  const safeSyncLocalPracticeSessions = async () => {
    if (!navigator.locks) {
      // Fallback 邏輯
      return performSync();
    }
    
    return await navigator.locks.request('mindspark_practice_sync_lock', async () => {
      // 進入此區間代表已取得跨分頁排他鎖
      return await performSync();
    });
  };
  ```

---

## 3. 架構與設計對齊度 (Architecture Alignment)

### 🚨 漏洞 3.1：元件直接繞過 Service/Hook 層，直接進行 Storage I/O 操作（違背專案鐵規）
- **檔案路徑**：
  - [components/QuizCard.tsx](file:///c:/Users/user/Desktop/Quiz-app--main/components/QuizCard.tsx#L6-L11)
  - [App.tsx](file:///c:/Users/user/Desktop/Quiz-app--main/App.tsx#L4)
- **問題成因**：
  根據專案 `AGENTS.md` 的核心架構規範：
  > **Service Layer + Domain Hooks Model**:
  > - Components never access storage/Supabase directly
  > - Services handle all I/O
  
  然而，在 `QuizCard.tsx` 中，卻直接從 `../services/storage` 導入並使用了 `getMistakeLog`、`getQuizSession`、`saveQuizSession`、`clearQuizSession` 與 `getUserSettings`。這使得 UI 組件與本機儲存層強耦合。同樣地，`App.tsx` 作為根元件，也直接導入了 `nukeAllBanks`、`saveGameMode`，繞過了應有的 Domain Hooks（例如 `useSettings`）或統一的 Repository 注入。
- **連鎖影響**：
  - 違背了 Clean Architecture 的關注點分離原則。
  - 難以進行單元測試與 Mock 儲存層行為。
  - 若未來更換儲存媒介（如改為全雲端或 IndexedDB），需要大規模修改 UI 元件。
- **偽代碼修復方案**：
  將 `getUserSettings` 與 `saveQuizSession` 等操作收攏至現有的 `useQuizEngine` 或建立獨立的 `useSettings` 領域 Hook，並由 Props 或 Context 注入 UI 元件。
  ```typescript
  // 建立 useSettings.ts Hook 進行架構對齊
  export const useSettings = () => {
    const repository = useRepository();
    const [settings, setSettings] = useState(repository.getUserSettings());

    const updateSettings = (newSettings: UserSettings) => {
      repository.saveUserSettings(newSettings);
      setSettings(newSettings);
    };

    return { settings, updateSettings };
  };
  ```

---

## 4. 組件生命週期與渲染效能 (Component Lifecycle)

### 🚨 漏洞 4.1：在 Render 階段直接修改 Mutable Ref 屬性（違背 React 純函數渲染規範）
- **檔案路徑**：
  - [App.tsx](file:///c:/Users/user/Desktop/Quiz-app--main/App.tsx#L108-L111)
- **問題成因**：
  在 `App.tsx` 中，為了解決 `useQuizEngine` 與 `useChunkedPractice` 相互依賴的循環引用問題，採用了 Mutable Ref `chunkedPracticeRef` 來傳遞 callback：
  ```typescript
  chunkedPracticeRef.current = {
    completeChunk: chunkedPractice.completeChunk,
    updateChunkDraft: chunkedPractice.updateChunkDraft,
  };
  ```
  然而，這段寫入代碼被**直接寫在組件的 Render Body 中**，而不是在 `useEffect` 或事件處理器內。在 React 18 的 Concurrent Mode 下，Render 階段可能會被多次執行、中斷或丟棄。在 Render 階段產生副作用（Side-Effect，如修改外部 Mutable Ref）會導致不一致的狀態，甚至在並發渲染時使 callback 執行過時的閉包（Stale Closures）。
- **連鎖影響**：
  - 在 React 18 StrictMode 下可能被執行兩次，導致狀態不穩定。
  - 易產生閉包捕獲過時 state 的 Bug。
- **偽代碼修復方案**：
  將 Ref 的更新動作移入 `useEffect`，確保其在 Commit 階段才安全地被寫入。
  ```typescript
  // 修正 Render Side-Effect 漏洞
  useEffect(() => {
    chunkedPracticeRef.current = {
      completeChunk: chunkedPractice.completeChunk,
      updateChunkDraft: chunkedPractice.updateChunkDraft,
    };
  }, [chunkedPractice.completeChunk, chunkedPractice.updateChunkDraft]);
  ```

### 🚨 漏洞 4.2：領域 Hook 回傳全生命週期不變的字面量物件，造成依賴 effect 無效重跑
- **檔案路徑**：
  - [hooks/useChunkedPractice.ts](file:///c:/Users/user/Desktop/Quiz-app--main/hooks/useChunkedPractice.ts#L455-L470)
- **問題成因**：
  `useChunkedPractice` 回傳一個全新的字面量物件 `{ activeSessions, isLoading, ... }`。因為每次內部 state（如 `isLoading`）改變時，回傳的物件引用都會不同。而在 `App.tsx` 中，`useEffect` 監聽了這個回傳的 `chunkedPractice` 物件：
  ```typescript
  useEffect(() => {
    // 同步邏輯...
  }, [chunkedPractice, toast, user]);
  ```
  這會導致每當 `chunkedPractice` 的任何狀態更新，該 `useEffect` 都會被迫重新調用，雖然內部有 `hasSyncedPracticeRef` 防護，但這依然是不必要的 CPU 計算與效能浪費。
- **連鎖影響**：
  - 觸發非必要的 React Effect 重新評估，降低整體渲染效能。
  - 容易在未來代碼維護中，因忘記加 Ref 防護而導致無限循環（Infinite Loop）。
- **偽代碼修復方案**：
  不應在 `useEffect` 的依賴項中直接監聽整個 Hook 回傳物件，而是僅監聽該物件中真正需要的屬性（例如具體的方法引用或狀態值）。
  ```typescript
  // App.tsx 修正依賴項
  const { loadActiveSessions } = chunkedPractice;
  
  useEffect(() => {
    // 僅監聽解構出來的特定狀態與方法，避免因整個字面量物件引用改變而重跑
    void syncLocalPracticeSessions().then((result) => {
      // ...
      void loadActiveSessions();
    });
  }, [loadActiveSessions, toast, user]); // 移除 chunkedPractice 物件本身
  ```

---

## 💡 總結與修復建議
本專案目前的邏輯設計與同步容錯已經具備一定的防禦性（例如版本守衛與 dirty fallbacks），但依然存在上述**架構越界、Render 副作用、離線數據安全與並發競態**等高風險漏洞。

建議在後續的架構優化中：
1. **收攏 I/O 存取**：重構 `QuizCard.tsx` 與 `App.tsx`，將所有的 localStorage 讀寫收歸至專案規定的 Repository 層與對應 Domain Hooks 中。
2. **修正 React 生命週期違規**：將 Render 階段對 Ref 的寫入全部移至 `useEffect`。
3. **安全同步設計**：重新設計 `savePracticeSession` 與同步鎖，確保在雲端成功儲存後，本地依然留有完整的練習快照，且引入排他鎖來防止跨分頁衝突。
