# Design: Dynamic Configuration

## 1. Quiz Size Selection
- **Component:** `Dashboard.tsx`
- **State:** `quizSize` (number).
- **UI:** A simple `<select>` dropdown next to the "Start" button allowing [10, 20, 30, 50, All].
- **Logic:** `Math.min(selectedSize, totalQuestions)` if numeric, or `totalQuestions` if 'All'.

## 2. Prompt Builder
- **Component:** `AIPromptGuide.tsx`
- **State:**
  - `questionType`: 'mixed' | 'single' | 'multiple'
  - `langExplanation`: 'zh-TW' | 'en'
  - `langOutput`: 'zh-TW' | 'en'
- **Template Logic:**
  - Construct the string using template literals based on state.
  - *Constraint:* The JSON structure instruction must remain constant to ensure `BankManager` can still import it. Only the natural language instructions to the AI should change.
