# Tasks: Integrate NVIDIA & Folders

## 1. AI Integration
- [ ] Install `openai` package (or ensure fetch compatibility) <!-- id: install-deps -->
- [ ] Update `AIConfig` interface in `services/ai.ts` and `types.ts` <!-- id: update-ai-types -->
- [ ] Refactor `services/ai.ts` to support NVIDIA/OpenAI-compatible calls <!-- id: refactor-ai-service -->
- [ ] Update `Settings.tsx` to include Provider selector and Base URL input <!-- id: update-settings-ui -->

## 2. Folder System
- [ ] Define `Folder` type and update `BankMetadata` in `types.ts` <!-- id: define-folder-types -->
- [ ] Implement `Folder` CRUD in `services/storage.ts` (`createFolder`, `deleteFolder`, `updateBankFolder`) <!-- id: implement-folder-storage -->
- [ ] Update `Dashboard.tsx` to support `currentFolderId` state <!-- id: update-dashboard-state -->
- [ ] Implement "Create Folder" UI in Dashboard <!-- id: ui-create-folder -->
- [ ] Implement "Folder Card" component to enter folders <!-- id: ui-folder-card -->
- [ ] Implement "Move Bank" functionality (Dropdown/Modal) <!-- id: ui-move-bank -->
- [ ] Add Breadcrumb navigation to Dashboard <!-- id: ui-breadcrumbs -->
