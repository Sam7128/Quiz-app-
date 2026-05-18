# Design: AI Provider Abstraction & Folder Structure

## 1. AI Service Abstraction (`services/ai.ts`)

Currently, `askAI` is tightly coupled to `GoogleGenerativeAI`. We will refactor this to support multiple providers.

### Configuration
`AIConfig` will be expanded:
```typescript
interface AIConfig {
  provider: 'google' | 'nvidia'; // default 'google'
  apiKey: string;
  model: string;
  baseUrl?: string; // For NVIDIA/OpenAI compatible
}
```

### Implementation
- **Google:** Continue using `@google/generative-ai`.
- **NVIDIA:** Use the `openai` npm package (or standard `fetch`) configured with NVIDIA's Base URL (`https://integrate.api.nvidia.com/v1`).
- **Unified Interface:** The `askAI` function will remain the single entry point, dispatching to the correct handler based on `config.provider`.

## 2. Folder Data Structure (`types.ts`, `services/storage.ts`)

We will adopt a flat-reference model for simplicity and robustness with `localStorage`.

### Schema
New `Folder` interface:
```typescript
interface Folder {
  id: string;
  name: string;
  createdAt: number;
}
```

Updated `BankMetadata`:
```typescript
interface BankMetadata {
  // ... existing fields
  folderId?: string; // Optional reference to a parent folder
}
```

### Storage
- **`mindspark_folders`**: Stores `Folder[]`.
- **`mindspark_banks_meta`**: Stores `BankMetadata[]` (updated with `folderId`).

## 3. Dashboard UI UX

- **View State:** The Dashboard will track a `currentFolderId` (default `null` for root).
- **Display:**
    - **Root:** Shows all Folders + Banks with `folderId === undefined`.
    - **In Folder:** Shows Banks with matching `folderId`.
- **Navigation:** A simple Breadcrumb (e.g., `Home > Science`).
- **Actions:**
    - "New Folder" button.
    - "Move to..." menu item on Bank cards.
