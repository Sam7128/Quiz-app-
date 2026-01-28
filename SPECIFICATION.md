# MindSpark System Specification

**Last Updated:** 2026-01-28
**Version:** 1.0.0 (Cloud-Hybrid Edition)

## 1. System Architecture

MindSpark is a **Hybrid-Cloud** Single Page Application (SPA) built with React and Vite. It supports both local-only usage (Guest Mode) and cloud synchronization (User Mode).

### 1.1 Tech Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **State Management:** React Context (Auth), Local Component State
- **Storage:** 
  - **Local:** Browser `localStorage` (Guest / Cache)
  - **Cloud:** Supabase (PostgreSQL + Auth)
- **Routing:** Custom View Router (No `react-router`)

### 1.2 Storage Strategy
- **Guest Mode:** All data (`banks`, `questions`, `mistakeLog`) resides in `localStorage`.
- **User Mode:** 
  - `banks` and `questions` are fetched from Supabase.
  - `mistakeLog` remains in `localStorage` (device-specific learning progress).
  - On login, local banks can be migrated to the cloud via `syncLocalToCloud`.

## 2. Core Modules & Features

### 2.1 Dashboard (`Dashboard.tsx`)
- **Bank Selection:** Users can toggle multiple banks to form a quiz pool.
- **Mastery Visualization:** Pie chart showing "Mastered" vs "Needs Review" (calculated by intersecting `mistakeLog` with current pool).
- **Quiz Configuration:**
  - Standard sizes: 10, 20, 30, 50, All.
  - **Custom Size:** Users can input any number via a text input.
- **Entry Points:** "Start Quiz" (Random) and "Review Mistakes" (Mistake Mode).

### 2.2 Quiz Engine (`App.tsx` & `QuizCard.tsx`)
- **Modes:**
  - `random`: Shuffles questions from the selected pool.
  - `mistake`: Filters questions that exist in `mistakeLog`.
  - `retry_session`: (New) Reviews only questions missed in the *immediate* previous session.
- **Interactive Feedback:**
  - **Correct:** Green pulse animation, success sound, auto-advance logic.
  - **Incorrect:** Red shake animation, error sound, **Review Mode** (shows explanation, correct answer, and requires manual advance).
- **Progress:** Visual progress bar at the top of the card.
- **State Tracking:** Updates `mistakeLog` immediately upon answer submission.

### 2.3 Bank Manager (`BankManager.tsx`)
- **CRUD:** Create, Delete banks (Cloud-aware).
- **Import:** Parse JSON string/file to populate questions.
- **Export:** Download current bank as JSON.
- **Clear Mistakes:** Wipes `mistakeLog` and **notifies App via callback** to refresh UI immediately.

### 2.4 Auth & Cloud (`contexts/AuthContext.tsx`, `services/cloudStorage.ts`)
- **Login/Signup:** Email/Password authentication.
- **Guest Fallback:** Button to bypass login.
- **Migration:** Detects local data on first login and offers sync.

### 2.5 AI Prompt Guide (`AIPromptGuide.tsx`)
- **Dynamic Config:** Users set question count, type (single/multi), and language.
- **Template Generation:** Generates a strict JSON-enforcing prompt for LLMs.

## 3. Data Flow & State Synchronization

### 3.1 Mistake Logging
1.  **User answers wrong:**
    - `logMistake(id)` writes to `localStorage`.
    - `setMistakeLog(getMistakeLog())` updates `App.tsx` state.
    - `QuizState.wrongQuestionIds` appends the ID.
2.  **User answers right (in Mistake Mode):**
    - `removeMistake(id)` updates `localStorage`.
    - `setMistakeLog(getMistakeLog())` updates `App.tsx` state.

### 3.2 Quiz Pool Loading
- **Trigger:** `selectedQuizBankIds` changes or `user` status changes.
- **Action:** Async fetch from `getCloudQuestions` (User) or `getQuestions` (Guest).
- **Result:** `quizPoolQuestions` state is updated, forcing `Dashboard` to re-calculate mastery.

## 4. Key Data Structures (`types.ts`)

```typescript
interface Question {
  id: string | number; // UUID (Cloud) or Timestamp/Index (Local)
  question: string;
  options: string[];
  answer: string | string[];
  type?: 'single' | 'multiple';
  hint?: string;
  explanation?: string;
}

interface QuizState {
  // ...
  mode: 'random' | 'mistake' | 'retry_session';
  wrongQuestionIds: string[]; // For session review
}
```

## 5. Critical Checkpoints (For Future Audits)

1.  **State Sync:** Does `Dashboard` reflect mistake count changes immediately after a quiz or clear action?
2.  **ID Consistency:** Do local questions (IDs) conflict with Cloud questions (UUIDs) in `mistakeLog`? (Current Logic: No, they are just keys).
3.  **Compilability:** Run `npx tsc --noEmit` to ensure type safety.
4.  **Asset Integrity:** Ensure `public/sounds/` contains `correct.mp3` and `wrong.mp3`.

---
*Use this document to verify system integrity before every deployment.*
