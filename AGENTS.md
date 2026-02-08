# AGENTS.md - Development Guide

## Build, Test, and Run Commands

### Development
```bash
npm install                  # Install dependencies
npm run dev                  # Start dev server
npm run build               # Build for production (outputs to dist/)
npm run preview             # Preview production build
npm test                    # Run tests (Vitest)
```

### Testing
- **Framework**: Vitest + React Testing Library.
- **Location**: Tests are located in `src/__tests__/`.
- **Requirement**: Run tests before pushing. Add tests for new logic in `services/`.

### Environment Setup
1. Create `.env` from `.env.example` (if available) or scratch.
2. Required variables:
   - `VITE_SUPABASE_URL`: Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key
   - `GEMINI_API_KEY`: Google Gemini API key for AI features

## Project Architecture

### Entry Points
- **index.tsx**: Root entry, wraps `App` with `AuthProvider` and `ThemeProvider`.
- **App.tsx**: Main routing and layout logic.
- **index.html**: Entry HTML.

### Directory Structure (Root-based)
```
├── components/          # React components (Functional, typed)
├── services/           # Business logic (Supabase, AI, Storage)
├── contexts/           # React Contexts (Auth, Theme)
├── hooks/              # Custom React hooks
├── types/              # TypeScript definitions
├── src/                # Contains tests (__tests__) and legacy files
└── constants.ts        # App-wide constants
```

### Key Patterns
- **Local-first + Cloud Sync**: `localStorage` for guests, Supabase for auth users.
- **Service Layer**: Components call `services/*.ts`, never DB directly.
- **Alias**: `@/*` maps to project root `./*`.

## Code Style Guidelines

### Import Organization
1. **Core**: `react`, `react-dom`, external libs.
2. **Types**: `../types`.
3. **Services/Utils**: `../services/*`, `../utils/*`.
4. **Constants**: `../constants`.
5. **Components**: `./Component`.
6. **Hooks/Contexts**: `../hooks`, `../contexts`.
7. **Assets**: Icons, images.

### Component Structure
- Use **functional components** with `React.FC<Props>`.
- **Named exports** (e.g., `export const MyComponent...`).
- **Interfaces** defined above the component.

```typescript
interface Props {
  data: string[];
}

export const MyComponent: React.FC<Props> = ({ data }) => {
  const [state, setState] = useState<string>('');
  // ...
};
```

### TypeScript
- **Strict Typing**: No `any`. Use `unknown` or specific types.
- **Explicit Returns**: Services must have return types.
- **State**: `useState<T>(initial)`.

### Naming
- **Components/Files**: PascalCase (`QuizCard.tsx`).
- **Functions/Vars**: camelCase (`handleSubmit`, `isLoading`).
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`).
- **Booleans**: Prefix with `is`, `has`, `should`.

### State Management
- Use **Functional Updates** for state depending on previous value: `setCount(c => c + 1)`.
- **Context**: Use `useAuth()` to access user state.

### Error Handling
- **Services**: `try-catch` blocks, throw typed Errors.
- **Components**: Handle service errors, show user feedback (toast/alert).

## Integrations

### Supabase
- **Auth**: Handled in `AuthContext`.
- **Data**: Check `user` existence. If present -> `services/cloudStorage.ts`. Else -> `services/storage.ts`.

### AI (Gemini)
- Config stored in `localStorage` (`mindspark_ai_config`).
- Service: `services/ai.ts`.

## Git & Review

### Commit Style
- **Imperative**: "Add feature", "Fix bug".
- **Descriptive**: "Fix white screen: add index.tsx entry".

### Pre-Commit Checklist
- [ ] `npm run build` passes.
- [ ] `npm test` passes.
- [ ] No `any` types.
- [ ] Imports sorted.
- [ ] Components typed properly.
