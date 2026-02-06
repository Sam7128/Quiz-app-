# Proposal: Social Sharing and AI Tutor Expansion

## 1. Background
Users want to enhance their learning experience by interacting with an AI tutor (specifically leveraging models like Gemma 3 27B) during quizzes for deeper explanations. Additionally, they desire a social feature to easily share question banks with friends without the friction of manual file export/import.

## 2. Goals
1.  **AI Tutor:** Integrate an AI Chat interface within the Quiz view, allowing users to ask questions about the current problem.
2.  **Social Sharing:** Implement a "Friend" system and a "Direct Send" feature for question banks using Supabase as the backend.
3.  **Documentation:** Provide clear guides on configuring API keys (`配置示範.md`).

## 3. Scope
-   **Frontend:**
    -   New `Settings` modal/view for API Key configuration.
    -   New `AIHelp` component in `QuizCard`.
    -   New `Social` view for managing friends and inbox.
-   **Backend (Supabase):**
    -   New `friendships` table.
    -   New `shared_banks` table.
    -   RLS policies for secure sharing.
-   **Documentation:**
    -   Create `配置示範.md`.

## 4. Timeline
-   Phase 1: Database Schema & AI Configuration UI.
-   Phase 2: Social features (Friend add, Bank share).
-   Phase 3: AI Chat integration.
-   Phase 4: Documentation & Final Polish.
