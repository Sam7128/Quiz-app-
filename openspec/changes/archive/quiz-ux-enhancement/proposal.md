# OpenSpec: Quiz UX Enhancement (quiz-ux-enhancement)

## 1. 概述 (Overview)
提升測驗過程的互動性與視覺回饋，包含動畫、音效與詳盡的錯誤解析 UI。

## 2. 核心功能 (Core Features)

### 2.1 互動式反饋 (Interactive Feedback)
- **正確 (Correct):**
    - **視覺:** 綠色脈衝動畫 (Pulse) 或微小的慶祝效果 (Confetti)。
    - **音效:** 清脆的 "Ding" 或 "Success" 音效。
    - **行為:** 自動跳轉下一題（可設定延遲）或顯示「下一題」按鈕。
- **錯誤 (Incorrect):**
    - **視覺:** 卡片輕微晃動 (Shake animation) + 紅色邊框警示。
    - **音效:** 低沈的 "Buzz" 或 "Error" 音效。
    - **行為:** **暫停流程**，進入「錯誤解析模式」。

### 2.2 錯誤解析模式 (Review Mode)
當用戶答錯時，QuizCard 不會直接切換題目，而是展開詳細視圖：
- **顯示選擇：** 用戶選的錯誤選項（標記為紅色 ❌）。
- **顯示正解：** 真正的正確選項（標記為綠色 ✅）。
- **顯示詳解：** 強制顯示 `explanation` 區塊，解釋為什麼選錯。
- **操作：** 用戶必須點擊「我懂了 / 下一題」才能繼續。

### 2.3 視覺優化 (Visual Polish)
- **進度條 (Progress Bar):** 在卡片頂部顯示線性進度條 (例如：第 5/20 題)。
- **過場動畫 (Transitions):** 使用 `framer-motion` 處理題目切換時的滑動 (Slide) 或淡入淡出 (Fade) 效果。

## 3. 技術選型 (Tech Stack)
- **動畫庫:** `framer-motion` (React 生態標準，輕量且強大)。
- **音效庫:** `use-sound` (簡單的 React Hook wrapper for Howler.js)。

## 4. 實作步驟 (Tasks)
1. [ ] 安裝依賴 (`framer-motion`, `use-sound`)。
2. [ ] 下載/生成音效素材 (correct.mp3, wrong.mp3) 並放入 `public/sounds/`。
3. [ ] 建立 `QuizFeedback` 元件，負責處理正確/錯誤的視覺狀態。
4. [ ] 修改 `QuizCard.tsx`：
    - 引入 `ReviewState` (答錯時的暫停狀態)。
    - 整合音效 Hook。
    - 加入進度條 UI。
