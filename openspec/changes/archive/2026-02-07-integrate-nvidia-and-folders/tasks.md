# Tasks: Integrate NVIDIA & Folders

## 1. AI Integration
- [x] Install `openai` package (or ensure fetch compatibility) <!-- id: install-deps -->
- [x] Update `AIConfig` interface in `services/ai.ts` and `types.ts` <!-- id: update-ai-types -->
- [x] Refactor `services/ai.ts` to support NVIDIA/OpenAI-compatible calls <!-- id: refactor-ai-service -->
- [x] Update `Settings.tsx` to include Provider selector and Base URL input <!-- id: update-settings-ui -->

## 2. Folder System
- [x] Define `Folder` type and update `BankMetadata` in `types.ts` <!-- id: define-folder-types -->
- [x] Implement `Folder` CRUD in `services/storage.ts` (`createFolder`, `deleteFolder`, `updateBankFolder`) <!-- id: implement-folder-storage -->
- [x] Update `Dashboard.tsx` to support `currentFolderId` state <!-- id: update-dashboard-state -->
- [x] Implement "Create Folder" UI in Dashboard <!-- id: ui-create-folder -->
- [x] Implement "Folder Card" component to enter folders <!-- id: ui-folder-card -->
- [x] Implement "Move Bank" functionality (Dropdown/Modal) <!-- id: ui-move-bank -->
- [x] Add Breadcrumb navigation to Dashboard <!-- id: ui-breadcrumbs -->
