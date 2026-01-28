# Tasks

1.  [x] **Add Quiz Size Logic**
    - Update `Dashboard.tsx` to include a question count selector.
    - Pass user-selected count to `onStartQuiz`.
    - Verification: Start quiz with >20 questions (mock data if needed).

2.  [x] **Implement Dynamic Prompt Builder**
    - Create `PromptConfig` interface in `AIPromptGuide.tsx`.
    - Add UI controls (Select/Radio) for Type, Explainer Language, Output Language.
    - Implement prompt generation logic.
    - Verification: Check generated prompt text changes based on selection.