# Specs: Dashboard UX Enhancements

## 1. 成就系統互動化

### Requirement: 成就卡片點擊開啟 Modal
- `AchievementsCard` 元件新增 `onClick` prop 或內部狀態控制 Modal。
- 點擊後開啟 `AchievementsModal`。

### Requirement: Modal 分類展示
- 「已解鎖」成就列表（帶圖標、名稱、解鎖時間）。
- 「未解鎖」成就列表（帶圖標、名稱、解鎖條件）。
- 進度條顯示完成百分比。

---

## 2. 預設題數調整

### Requirement: 預設值為「全部」
- `Dashboard.tsx` 中 `quizSize` 初始值改為 `'all'`。

---

## 3. 自定義休息間隔

### Requirement: 類型擴展
- `UserSettings.restBreakInterval` 類型改為 `number`。
- 0 表示關閉，任意正整數表示間隔題數。

### Requirement: UI 自訂輸入
- `Settings.tsx` 新增「自訂」選項按鈕。
- 點擊後顯示數字輸入框。
- 輸入驗證：1-999 正整數。

---

## 4. 最近 5 輪錯題

### Requirement: 資料結構
```typescript
interface MistakeDetail {
  questionId: string;
  questionText: string;
  options: string[];
  userAnswer: string | string[];
  correctAnswer: string | string[];
}

interface RecentMistakeSession {
  sessionId: string;
  timestamp: number;
  bankNames: string[];
  mistakes: MistakeDetail[];
}
```

### Requirement: Storage 方法
- `getRecentMistakeSessions(): RecentMistakeSession[]`
- `addRecentMistakeSession(session): void` (FIFO, max 5)
- `clearRecentMistakeSession(sessionId): void`
- `clearAllRecentMistakes(): void`

### Requirement: UI 元件
- 新增 `RecentMistakesCard.tsx`。
- 顯示最近 5 輪錯題摘要。
- 可展開查看每題詳情。
- 「練習這輪」、「刪除這輪」、「清空全部」操作。

### Requirement: 資料流整合
- `App.tsx` 在測驗結束後呼叫 `addRecentMistakeSession()`。
- 傳遞 `wrongQuestionIds` 並查詢完整題目資訊。
