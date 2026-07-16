# Components 模組

## 結構總覽

### 頁面級元件
- **Dashboard.tsx**: 首頁，題庫選擇、成就卡片、最近錯誤卡片、學習統計卡片
- **QuizCard.tsx**: 測驗介面，答題 → 驗證 → 解說流程，支援鍵盤快捷鍵 (1-4)
- **BankManager.tsx**: 題庫 CRUD + JSON 匯入/匯出 + AI PDF 上傳
- **AIPromptGuide.tsx**: AI 提示詞建構器，可選語言/題型
- **Social.tsx**: 好友系統、排行榜、挑戰比較

### 功能級元件
- **Settings.tsx**: 設定面板（遊戲模式、音效、AI Provider、休息間隔、危險區域）
- **GlobalModals.tsx**: 統一管理全域彈窗（Settings、Share、Resume、RestBreak）
- **QuizResult.tsx**: 測驗結果摘要頁（統計、錯題回顧、成就）
- **MiniTimer.tsx**: Pomodoro 計時器（預設 25 分鐘）
- **RestBreakModal.tsx**: 疲勞偵測休息提示

### 戰鬥系統元件
- **BattleArena.tsx**: 戰鬥畫面主容器（Underground 主題）；只消費 presentation event，不擁有 damage/timer 規則
- **BattleSkillOverlay.tsx**: 由 presentation event 驅動的唯一技能視覺覆蓋層；負責 CSS／image／WebM media completion 與 cleanup

戰鬥 runtime media 必須透過 `constants/battleAssetRegistry.ts`；禁止 data URL、遠端素材與 BattleArena unmount 時全域 `unloadSfx()`。

### 知識圖元件 (Beta)
- **KnowledgeGraphEditor.tsx**: ReactFlow 編輯器（需 Beta 功能開關）
- **KnowledgeGraphViewer.tsx**: 閱讀模式（L1→L2→L3 漸進式展開）
- 透過 `React.lazy` 代碼分割載入

## 開發慣例

1. **元件格式**：`React.FC<Props>` + Named exports
2. **動畫**: Framer Motion variants 必須抽取至模組層級常數（防止 re-render）
3. **Modal**: 新彈窗統一註冊至 `GlobalModals.tsx`
4. **無障礙**: 所有 icon-only button 必須有 `aria-label`
5. **樣式**: Tailwind CSS v4 utility classes，暗色模式用 `dark:` variant
6. **檔案命名**: PascalCase（`QuizCard.tsx`）
