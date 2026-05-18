# Project Specification: MindSpark

## 1. Project Overview
**MindSpark** is a React-based AI Study Assistant designed to help users practice with AI-generated question banks. It emphasizes a local-first experience using browser storage and provides a bridge for using external LLMs (like Gemini/ChatGPT) to generate structured learning content.

## 2. Tech Stack
- **Frontend:** React 19 (TypeScript)
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS (Global CDN implementation)
- **Icons:** Lucide React
- **Charts:** Recharts (for performance/mistake analytics)
- **Persistence:** LocalStorage API

## 3. Architecture
- **View Management:** State-based routing within `App.tsx` (no external router library).
- **Service Layer:** `services/storage.ts` acts as the single source of truth for all data persistence and retrieval logic.
- **Type Safety:** Centralized interfaces in `types.ts` for `Question`, `BankMetadata`, and `QuizState`.
- **UI Logic:** Component-based architecture under `components/` categorized by feature (Dashboard, Quiz, Manager, Guide).

## 4. Development Conventions
- **Naming:** CamelCase for functions/variables, PascalCase for Components and Interfaces.
- **Persistence:** All data modifications must go through `services/storage.ts`. Direct `localStorage` access in UI components is prohibited.
- **Styling:** Use Tailwind utility classes.
- **AI Workflow:** Adhere to the "Prompt -> External Generate -> Import JSON" workflow defined in `AIPromptGuide.tsx`.

## 5. Directory Map
- `App.tsx`: Layout and main view controller.
- `components/`: Pure and Feature components.
- `services/`: Business logic and storage abstraction.
- `types.ts`: Domain models and TypeScript interfaces.
- `constants.ts`: Static configuration and default content.
