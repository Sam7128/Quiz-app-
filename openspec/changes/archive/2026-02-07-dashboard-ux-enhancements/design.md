# Design: Dashboard UX Enhancements

## 1. 成就系統互動化

### 1.1 互動流程
- `AchievementsCard.tsx` 已存在，需新增 `onClick` 開啟 Modal。
- `AchievementsModal.tsx` 已存在，確保其支援展開查看詳情。

### 1.2 UI 設計
- Modal 分兩區：「已解鎖」與「未解鎖」。
- 每個成就卡片顯示圖標、名稱、解鎖條件。
- 進度條顯示總完成百分比。

---

## 2. 預設題數調整

### 2.1 修改點
- `Dashboard.tsx` Line 48: `useState<number | 'all' | 'custom'>(20)` → `useState<number | 'all' | 'custom'>('all')`

---

## 3. 自定義休息間隔

### 3.1 類型擴展
```typescript
// types/battleTypes.ts
interface UserSettings {
  restBreakInterval: number; // 0 = Off, any positive integer = interval
}
```

### 3.2 UI 設計 (Settings.tsx)
- 保留 20/30/Off 快捷按鈕。
- 新增「自訂」按鈕，點擊後顯示輸入框。
- 輸入框接受 1-999 的正整數。

### 3.3 驗證邏輯
- 輸入非數字或 ≤0 時，自動回退為 20。

---

## 4. 最近 5 輪錯題 (Recent Mistakes)

### 4.1 資料結構
```typescript
// types/battleTypes.ts
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

### 4.2 儲存邏輯 (services/storage.ts)
- **Key**: `mindspark_recent_mistakes`
- **Functions**:
  - `getRecentMistakeSessions(): RecentMistakeSession[]`
  - `addRecentMistakeSession(session: RecentMistakeSession): void` (FIFO, max 5)
  - `clearRecentMistakeSession(sessionId: string): void`
  - `clearAllRecentMistakes(): void`

### 4.3 UI 設計 (RecentMistakesCard.tsx)
- 位置：Dashboard 右側欄，與 StreakCard/StudyStatsCard 並列。
- 標題：📋 最近錯題
- 每輪顯示：時間戳、題庫名、錯題數量。
- 點擊展開：顯示每題詳情（題目、選項、答案對比）。
- 操作按鈕：「練習這輪」、「刪除這輪」。
- 底部：「清空全部」按鈕。

### 4.4 資料流
1. `QuizCard.tsx` 結束時，將錯題資訊傳遞給 `App.tsx`。
2. `App.tsx` 呼叫 `addRecentMistakeSession()` 儲存。
3. `Dashboard.tsx` 讀取並渲染 `RecentMistakesCard`。

---

## 5. 檔案修改清單

| 檔案 | 修改類型 | 說明 |
|------|---------|------|
| `types/battleTypes.ts` | 修改 | 擴展 UserSettings, 新增 RecentMistakeSession |
| `services/storage.ts` | 修改 | 新增 4 個方法 |
| `components/Dashboard.tsx` | 修改 | 預設題數改 'all', 新增 RecentMistakesCard |
| `components/Settings.tsx` | 修改 | 自訂休息間隔 UI |
| `components/AchievementsCard.tsx` | 修改 | 新增 onClick 互動 |
| `components/RecentMistakesCard.tsx` | 新增 | 最近錯題卡片 |
| `App.tsx` | 修改 | 儲存錯題 Session |
