# Tasks: Dashboard UX Enhancements

## 1. 成就系統互動化
- [x] 修改 `AchievementsCard.tsx` 新增點擊開啟 Modal 功能 <!-- id: achievements-click -->
- [x] 確認 `AchievementsModal.tsx` 支援分類展示與展開詳情 <!-- id: achievements-modal -->

## 2. 預設題數調整
- [x] 修改 `Dashboard.tsx` 將 `quizSize` 預設值改為 `'all'` <!-- id: default-quiz-size -->

## 3. 自定義休息間隔
- [x] 修改 `types/battleTypes.ts` 將 `restBreakInterval` 類型改為 `number` <!-- id: rest-interval-type -->
- [x] 修改 `Settings.tsx` 新增「自訂」輸入框與驗證邏輯 <!-- id: rest-interval-ui -->
- [x] 修改 `QuizCard.tsx` 支援任意數字的休息間隔 <!-- id: rest-interval-logic -->

## 4. 最近 5 輪錯題
- [x] 新增 `MistakeDetail` 與 `RecentMistakeSession` 類型至 `types/battleTypes.ts` <!-- id: recent-mistakes-types -->
- [x] 新增 `services/storage.ts` 方法：get/add/clear recent mistakes <!-- id: recent-mistakes-storage -->
- [x] 新增 `components/RecentMistakesCard.tsx` 元件 <!-- id: recent-mistakes-card -->
- [x] 修改 `Dashboard.tsx` 整合 `RecentMistakesCard` <!-- id: recent-mistakes-dashboard -->
- [x] 修改 `App.tsx` 在測驗結束後儲存錯題 Session <!-- id: recent-mistakes-save -->

## 5. 測試與驗證
- [x] 執行 `npm run build` 確認無編譯錯誤 <!-- id: verify-build -->
- [x] 手動測試所有 4 項功能 <!-- id: verify-manual -->
