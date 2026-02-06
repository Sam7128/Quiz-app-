# Proposal: Dashboard UX Enhancements

## Problem Statement
目前首頁的使用體驗存在以下改進空間：
1. **成就系統不可互動**：成就卡片只能查看，無法展開詳細列表。
2. **預設題數不合理**：用戶啟動測驗時預設是 20 題，但用戶期望改為「全部」。
3. **休息間隔缺乏彈性**：目前僅提供 20/30/Off 的固定選項，用戶希望自訂任意題數。
4. **缺少最近錯題入口**：沒有便捷方式查看「最近 5 輪測驗」的錯題，不利於即時複習。

## Proposed Solution

### 1. 成就系統互動化
- `AchievementsCard` 點擊可開啟 `AchievementsModal`。
- Modal 中分類展示「已解鎖」與「未解鎖」成就，可展開查看詳情。

### 2. 預設題數調整
- 將 `Dashboard.tsx` 中的 `quizSize` 初始值從 `20` 改為 `'all'`。

### 3. 自定義休息間隔
- 在 `Settings.tsx` 中新增「自訂」選項，用戶可輸入任意正整數。
- `UserSettings.restBreakInterval` 類型從 `20 | 30 | 0` 擴展為 `number`。

### 4. 最近錯題 (Recent 5 Sessions)
- **核心概念**：記錄最近 5 **輪測驗** (Session) 的錯題，而非單純 5 道題。
- **資料結構**：
  ```typescript
  interface RecentMistakeSession {
    sessionId: string;
    timestamp: number;
    bankNames: string[];
    mistakes: {
      questionId: string;
      questionText: string;
      userAnswer: string | string[];
      correctAnswer: string | string[];
      options: string[];
    }[];
  }
  ```
- **UI 功能**：
  - 在 `Dashboard` 新增「最近錯題」卡片/區塊。
  - 點擊可展開查看每輪的錯題詳情（題目、選項、用戶答案、正確答案）。
  - 每輪提供「練習這輪錯題」按鈕。
  - 支持手動清除單輪或全部記錄。
- **儲存邏輯**：
  - 使用 FIFO 機制，超過 5 輪自動剷除最舊的記錄。
  - 新增 `services/storage.ts` 方法：`getRecentMistakeSessions`, `addRecentMistakeSession`, `clearRecentMistakeSession`, `clearAllRecentMistakes`。

## Impacted Capabilities
- `components/Dashboard.tsx` (新增卡片、預設題數)
- `components/Settings.tsx` (自訂休息間隔)
- `components/AchievementsCard.tsx` (點擊互動)
- `components/AchievementsModal.tsx` (整合展開)
- `components/RecentMistakesCard.tsx` (新增)
- `services/storage.ts` (新增方法)
- `types/battleTypes.ts` (UserSettings, RecentMistakeSession)
- `App.tsx` (傳遞 Session 錯題記錄)

## Acceptance Criteria
1. 點擊成就卡片可展開查看所有成就（已解鎖/未解鎖分類）。
2. 測驗預設題數為「全部」。
3. 用戶可在設定中輸入自訂的休息間隔題數（任意正整數）。
4. 首頁顯示最近 5 輪測驗的錯題記錄。
5. 可展開查看每輪錯題的詳細內容（題目、選項、答案）。
6. 可手動清除單輪或全部錯題記錄，超過 5 輪自動剷除最舊的。
