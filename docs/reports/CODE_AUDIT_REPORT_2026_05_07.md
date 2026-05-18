# 📝 MindSpark 全面程式碼審查報告 (Code Audit Report)

## 📅 基本資訊
- **審查日期**: 2026-05-07
- **審查版本**: 1.2.0 (Post-Refactor)
- **狀態**: 🟢 良好，但存在型別安全破口與架構風險

---

## 🔴 嚴重問題：違反鐵規 (Policy Violations)

### 1. 嚴禁使用 `any` 型別 (鐵規 3)
儘管之前的重構已修復多處，但專案中仍殘留關鍵的型別破口，這會導致型別檢查器的保護失效。
- **`components/AppContent.tsx`**: `user: any`, `mistakeLog: any`, `setMistakeLog: (log: any) => void`。這導致 App 頂層狀態管理完全失去型別保護。
- **`hooks/useBattleSystem.ts`**: `animationTimerRef` 與 `dialogueTimerRef` 使用 `any`。應改用 `ReturnType<typeof setTimeout>`。
- **`utils/isAbortError.ts`**: `error: any`。應改為 `unknown` 並配合現有的窄化邏輯。
- **`components/Login.tsx`**: `catch (err: any)`。應改為 `unknown` 並依規範進行窄化處理。

### 2. 資料識別的一致性 (鐵規 5 & 9)
- **`Question.id` 的聯合型別**: 目前定義為 `string | number`。這導致在 `storage.ts` 與 `useQuizEngine.ts` 中充斥著大量的 `String(q.id)` 強制轉型，增加了程式碼噪音與出錯機率。
- **建議**: 應統一將 `Question.id` 定義為 `string`。

---

## 🟡 中度風險：架構與健壯性 (Architectural Risks)

### 1. 雲端資料操作風險 (Supabase 整合)
- **`services/cloudStorage.ts`**: 在 `saveCloudQuestions` 中手動拼接字串來構建 PostgREST 的 `in` 過濾器（例如：`(${keepIds.join(',')})`）。
- **風險**: 若 `keepIds` 包含非預期字元或格式，可能導致查詢失敗或非預期的資料刪除。應改用 Supabase SDK 的標準用法：`.not('id', 'in', keepIds)`。

### 2. 狀態競爭與組件卸載 (Race Condition)
- **`components/QuizCard.tsx`**: 在 `submitAnswer` 中使用了 `setTimeout`（1.5秒）來觸發休息彈窗。
- **風險**: 若使用者在 1.5 秒內點擊「下一題」導致組件切換/卸載，該非同步操作可能會嘗試在已卸載的組件上更新狀態，導致 React 警告或邏輯錯誤。

### 3. Reducer 中的副作用 (Side Effects)
- **`reducers/appReducer.ts`**: `set_game_mode` 分支直接調用了 `saveGameMode(action.gameMode)`。
- **問題**: 根據 Redux/Reducer 的純函數原則，Reducer 內部不應包含 I/O 操作（如 localStorage 寫入）。這會讓狀態預測與測試變得困難。

### 4. 資料完整性風險
- **`hooks/useQuizEngine.ts`**: `handlePracticeMistakes` 在重建 `Question` 物件時，丟棄了 `tags`、`hint`、`explanation` 以外的潛在元數據。
- **問題**: 這會導致在錯題練習模式下，部分輔助學習資訊遺失。

---

## 🟢 優點與合規亮點 (Strengths & Compliance)

- **React 18 安全性 (鐵規 6)**: `AppContent.tsx` 正確使用了 `<Suspense>` 與 `SkeletonLoader` 保護延遲載入的 `KnowledgeGraphWorkspace` 模組。
- **架構模組化**: 成功將複雜邏輯抽離至 `useQuizEngine`, `useBattleSystem`, `useBankManager` 等領域 Hooks，職責分離清晰。
- **防禦式程式設計**: `services/spacedRepetition.ts` 與 `services/ai.ts` 的 JSON 清理邏輯非常穩健，能有效對抗 LLM 的不穩定回傳。
- **Provider 階層**: `index.tsx` 中的 Provider 包裹順序（Auth > Repository > App）設計合理，確保了相依性注入的正確性。

---

## 🚀 具體改進建議清單 (Action Plan)

1. **[P0]** 清除專案中所有 `as any` 與 `any` 定義，將 `Question.id` 統一修正為 `string`。
2. **[P0]** 重構 `CloudStorageRepository` 的 `delete` 語法，改用 SDK 原生陣列傳參，避免字串拼接。
3. **[P1]** 將 `appReducer` 中的持久化邏輯移出，改由組件層級或專門的 Effect 監控 `gameMode` 變化。
4. **[P1]** 在 `QuizCard` 中加入 `isMounted` 檢查或改用 `useEffect` 管理休息彈窗的觸發邏輯。
5. **[P2]** 優化 `useQuizEngine` 的 `handleAnswer` 依賴項，避免不必要的函數重新建立導致的子元件重渲染。

---

## 🎯 結論
目前的專案體質健康，重構方向正確。只要修正上述提到的「型別破口」與「副作用位置」，即可達到生產級別的穩定性與擴展性。

---
*審查者: Gemini CLI Agent*
*本報告自動生成於 2026-05-07*
