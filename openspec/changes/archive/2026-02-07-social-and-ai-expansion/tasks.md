# Tasks: Social and AI Expansion

## Preparation
- [x] Create `配置示範.md` with instructions on how to get and configure API keys. <!-- id: create-docs -->
- [x] Install `@google/genai` dependency. <!-- id: install-sdk -->

## Backend (Supabase)
- [x] Execute SQL migration to create `friendships` table and policies. <!-- id: sql-friendships -->
- [x] Execute SQL migration to create `shared_banks` table and policies. <!-- id: sql-shared-banks -->
- [x] Update `types.ts` with `Friendship` and `SharedBank` interfaces. <!-- id: update-types -->

## Feature: AI Tutor
- [x] Create `services/ai.ts` to handle API calls (OpenAI compatible). <!-- id: ai-service -->
- [x] Add `API Key` input field in a new Settings modal or AIPromptGuide. <!-- id: ai-config-ui -->
- [x] Create `AIHelper` component (Chat interface). <!-- id: ai-component -->
- [x] Integrate `AIHelper` into `QuizCard.tsx`. <!-- id: ai-integrate -->

## Feature: Social Sharing
- [x] Create `SocialManager.tsx` view (Friends List + Inbox). (Renamed to `Social.tsx`) <!-- id: social-view -->
- [x] Implement "Add Friend" logic (search by username/email). <!-- id: friend-add -->
- [x] Implement "Share Bank" button in `Dashboard.tsx` bank card actions. <!-- id: share-action -->
- [x] Implement "Accept/Reject" logic for `shared_banks` in `SocialManager`. <!-- id: share-accept -->
- [x] On Accept: Import `bank_snapshot` into local `localStorage` banks. <!-- id: share-import -->