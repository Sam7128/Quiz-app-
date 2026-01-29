# 開發進度檢查清單 (Development Checklist)

此文件用於追蹤專案開發進度、待辦事項與已完成項目。

## 🟢 已完成 (Done)
- [x] **[AI]** 實作 Gemma 3 27B 解題小助手
    - [x] API Key 配置介面 (Settings.tsx)
    - [x] QuizCard 整合 AI 詢問按鈕 (AIHelper.tsx)
    - [x] 串接 LLM API (@google/genai)
    - [x] 撰寫 `配置示範.md`
- [x] **[Social]** 實作好友與題庫分享功能
    - [x] 好友系統 (新增/列表/邀請) (Social.tsx)
    - [x] 題庫傳送與接收 (Inbox / ShareModal.tsx)
    - [x] Supabase Schema 更新 (supabase_social_migration.sql)
- [x] **[UX]** 實作 Quiz UX 優化 (動畫/音效/錯誤解析) `quiz-ux-enhancement`
- [x] **[Backend]** 實作 Supabase 雲端遷移 `supabase-cloud-sync`
- [x] 建立檢查清單文件 (CHECKLIST.md)
- [x] 分析用戶需求 (增強測驗設定與 AI 提示詞)
- [x] 建立 OpenSpec 提案 (enhance-quiz-experience)
- [x] 實作功能 (enhance-quiz-experience)
    - [x] 解除題數 20 題限制 (Dashboard.tsx)
    - [x] 實作動態 AI 提示詞表單 (AIPromptGuide.tsx)
- [x] 初始專案設置確認
- [x] 檢查並更新 GEMINI.md
- [x] 實作 Supabase 認證系統 (Email/Password)
- [x] 實作雲端同步邏輯 (Local -> Cloud Migration)
- [x] 優化 QuizCard 動態反饋與解析 UI
- [x] **[UI/UX]** 修復手機端登入頁面捲動鎖死與底部導航遮擋問題 (Mobile Layout Fixes)



## 📝 備註 (Notes)
- 請隨時更新此文件以反映最新狀態。