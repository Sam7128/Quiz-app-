# Design: Social and AI Expansion

## 1. Database Schema (Supabase)

To support social features, we need two new tables.

### 1.1 `friendships`
Tracks relationships between users.
- `id`: uuid (PK)
- `user_id`: uuid (FK -> profiles.id) - The requester.
- `friend_id`: uuid (FK -> profiles.id) - The receiver.
- `status`: text ('pending', 'accepted')
- `created_at`: timestamp

**Policies:**
- Users can view their own friendships (where they are `user_id` or `friend_id`).
- Users can insert (send request).
- Users can update (accept).

### 1.2 `shared_banks`
Acts as an inbox for shared content.
- `id`: uuid (PK)
- `sender_id`: uuid (FK -> profiles.id)
- `receiver_id`: uuid (FK -> profiles.id)
- `bank_snapshot`: jsonb (Full copy of the bank at time of sending to ensure immutability/independence).
- `status`: text ('pending', 'accepted', 'rejected')
- `created_at`: timestamp

**Policies:**
- Users can view where they are `receiver_id` or `sender_id`.
- `sender_id` can insert.
- `receiver_id` can update (accept/reject).

## 2. AI Architecture

### 2.1 Configuration
- **Provider:** Google GenAI SDK (`@google/genai`).
- **Model:** Default to `gemini-3-flash-preview` (as per user-provided guide) or `gemma-3-27b-it` if available via the same API.
- **Storage:** API Key stored in `localStorage` under `mindspark_ai_config`.
- **Security:** Client-side only. Warn users that the key is stored locally and not synced to Supabase for security.

### 2.2 Integration
- **SDK:** Use `@google/genai` for structured and streaming responses.
- **Context:** When asking, prompt includes:
  - Current Question Text
  - Options
  - Correct Answer
  - User's selected answer (if any)
  - Role: "你是一位專業的助教，請根據題目提供詳細、好理解的解釋。"

## 3. UI/UX

### 3.1 Social
- **Friend List:** Simple list with "Add Friend" by email/username.
- **Inbox:** Notification badge on Dashboard. "Incoming Bank" modal.

### 3.2 AI
- **Quiz Card:** Small "Ask AI" button (Robot Icon).
- **Panel:** Slides up or opens on side (desktop) / modal (mobile).
- **Streaming:** Text streams in for better UX.
