# AGENTS.md - Development Guide for MindSpark Quiz App

## Build, Test, and Run Commands

### Development
```bash
npm install                  # Install dependencies
npm run dev                  # Start dev server with --host flag (accessible on network)
npm run build               # Build for production (outputs to dist/)
npm run preview             # Preview production build
```

### Testing
- **No test framework configured** - Tests should be added before implementing new features
- Manual testing: Run `npm run dev` and test in browser

### Environment Setup
1. Copy `.env` (if exists) or create new `.env` file
2. Set required variables:
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key
   - `GEMINI_API_KEY` - For AI features (Google Gemini)

## Project Architecture

### Entry Points
- **index.tsx** - React app initialization, wraps App with AuthProvider
- **App.tsx** - Main application component with routing logic and state management
- **index.html** - HTML entry point

### Directory Structure
```
├── components/          # React components (Dashboard, QuizCard, BankManager, etc.)
├── services/           # Business logic (storage, cloudStorage, ai, supabase)
├── contexts/           # React contexts (AuthContext)
├── types.ts            # TypeScript type definitions
├── constants.ts        # App constants and default data
└── vite.config.ts      # Vite configuration with proxy setup
```

### Key Patterns
- **Local-first with cloud sync**: localStorage for guest mode, Supabase for authenticated users
- **Service layer separation**: All data operations go through services/, not direct in components
- **Context for auth**: AuthProvider wraps app, useAuth() hook for consuming
- **Folder-based bank organization**: Banks can be grouped into folders (stored in localStorage + cloud)

## Code Style Guidelines

### Import Organization
1. React and core libraries first
2. Type imports from local files
3. Service/utility functions
4. Constants
5. Components (group by feature)
6. Hooks
7. Icons/assets last

**Example:**
```typescript
import React, { useState, useEffect } from 'react';
import { Question, BankMetadata, Folder } from '../types';
import { getQuestions, saveQuestions, getBanksMeta } from '../services/storage';
import { getCloudBanks, syncLocalToCloud } from '../services/cloudStorage';
import { DEFAULT_QUESTIONS, APP_NAME } from '../constants';
import { Dashboard } from './components/Dashboard';
import { useAuth } from './contexts/AuthContext';
import { BrainCircuit, LayoutDashboard, Settings } from 'lucide-react';
```

### Component Structure

**Preferred Pattern:**
```typescript
// 1. Interface/type definitions at top
interface ComponentProps {
  data: string[];
  onAction: (id: string) => void;
}

// 2. Arrow function with React.FC
export const ComponentName: React.FC<ComponentProps> = ({ data, onAction }) => {
  // 3. Hooks (state, effects, etc.)
  const [state, setState] = useState<string>('');
  
  // 4. Helper functions
  const handleClick = () => {
    // implementation
  };
  
  // 5. Return JSX
  return (
    <div>...</div>
  );
};
```

**Export Style:**
- Named exports for components: `export const ComponentName: React.FC<Props> = ...`
- Default export ONLY for App.tsx: `export default App;`

### TypeScript Conventions

**Type Definitions (types.ts):**
- Use `interface` for object shapes
- Use `type` for unions, primitives, or complex compositions
- Export all types/interfaces
- Add JSDoc comments for complex types

**Examples:**
```typescript
export interface Question {
  id: string | number;
  question: string;
  options: string[];
  answer: string | string[];
}

export type AppView = 'dashboard' | 'quiz' | 'mistakes' | 'manager' | 'guide' | 'social';
```

**Type Usage:**
- Always specify function parameter types
- Always specify function return types for services
- Use explicit types for useState: `useState<string>('')`
- Avoid `any` - use `unknown` if type is truly unknown

### Naming Conventions

**Components:**
- PascalCase: `Dashboard`, `QuizCard`, `BankManager`
- Descriptive, feature-based names

**Functions:**
- camelCase: `handleAnswer`, `startQuiz`, `refreshBanksData`
- Event handlers prefix with `handle`: `handleClick`, `handleSubmit`
- Async operations prefix with verb: `getQuestions`, `saveQuestions`, `syncLocalToCloud`

**Variables:**
- camelCase: `mistakeLog`, `quizState`, `selectedBankIds`
- Boolean prefix with `is/has/should`: `isFinished`, `hasError`, `shouldRefresh`

**Constants:**
- SCREAMING_SNAKE_CASE for true constants: `STORAGE_KEYS`, `DEFAULT_QUESTIONS`
- camelCase for exported named constants: `APP_NAME`

**Files:**
- PascalCase for components: `Dashboard.tsx`, `QuizCard.tsx`
- camelCase for services/utilities: `storage.ts`, `cloudStorage.ts`, `ai.ts`
- lowercase for config: `vite.config.ts`, `tsconfig.json`

### State Management

**useState Pattern:**
```typescript
const [state, setState] = useState<Type>(initialValue);
```

**Functional Updates (when depending on previous state):**
```typescript
setState(prev => ({ ...prev, newField: value }));
setArray(prev => [...prev, newItem]);
setArray(prev => prev.filter(item => item.id !== id));
```

**useEffect Pattern:**
```typescript
useEffect(() => {
  // Setup logic
  const init = async () => {
    // async operations
  };
  init();
  
  // Cleanup if needed
  return () => {
    // cleanup
  };
}, [dependencies]);
```

### Error Handling

**Services (try-catch with user-friendly messages):**
```typescript
export const functionName = async (): Promise<ReturnType> => {
  try {
    const result = await someOperation();
    return result;
  } catch (error: any) {
    console.error("Context:", error);
    throw new Error(error.message || "使用者友善的錯誤訊息");
  }
};
```

**Components (handle errors from services):**
```typescript
const handleAction = async () => {
  try {
    await someServiceCall();
  } catch (error: any) {
    alert(error.message); // Or use proper error UI
  }
};
```

**Validation:**
- Validate user input before processing
- Use early returns for invalid states
- Provide helpful error messages in Chinese (since app is in Chinese)

## Supabase Integration

### Pattern
```typescript
// 1. Check if user is authenticated
if (user) {
  // Use cloud storage (Supabase)
  const data = await getCloudBanks();
} else {
  // Use local storage
  const data = getBanksMeta();
}
```

### Service Functions
- **Local**: Functions in `services/storage.ts` (localStorage operations)
- **Cloud**: Functions in `services/cloudStorage.ts` (Supabase operations)
- **Bridge**: App.tsx handles switching between local/cloud based on auth state

## AI Integration

### Providers Supported
- Google Gemini (default)
- NVIDIA API (via proxy in dev mode)

### Configuration Storage
- Stored in localStorage under `mindspark_ai_config`
- Contains: `provider`, `apiKey`, `model`, `baseUrl`

### Proxy Setup
- Dev mode: Vite proxy at `/api/nvidia` → NVIDIA API
- Production: Requires backend proxy (not included)

## Common Pitfalls

1. **Type Safety**: Never use `as any` or `@ts-ignore` - fix type issues properly
2. **State Updates**: Always use functional updates when new state depends on old state
3. **Async Operations**: Always handle errors in async functions
4. **Local/Cloud Sync**: Always check auth state before choosing storage method
5. **Folder Map Persistence**: Use `getBankFolderMap()` to overlay folder assignments on banks after loading

## Git Commit Style

Based on recent commits:
- Imperative mood: "Fix white screen", "Add feature"
- Descriptive: Include what AND why when non-obvious
- Example: `Fix white screen: add index.tsx entry and vite react plugin`

## Code Review Checklist

Before submitting changes:
- [ ] No TypeScript errors (`tsc --noEmit` or check editor)
- [ ] Follows import organization pattern
- [ ] Component uses React.FC with typed props
- [ ] All functions have return types
- [ ] Error handling implemented for async operations
- [ ] State updates use functional form when depending on previous state
- [ ] No `any` types used
- [ ] User-facing text in Chinese (if applicable)
- [ ] Tested in both authenticated and guest mode (if relevant)
- [ ] Build succeeds: `npm run build`

## Additional Notes

- **CSS Framework**: Tailwind CSS (utility classes throughout)
- **Icons**: lucide-react
- **Charts**: recharts
- **Animation**: framer-motion
- **Audio**: use-sound for quiz feedback
- **Path Aliases**: `@/*` maps to project root (tsconfig.json)
