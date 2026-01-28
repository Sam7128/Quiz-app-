# OpenSpec: Supabase Cloud Migration (supabase-cloud-sync)

## 1. 概述 (Overview)
將目前的 Local-First 架構升級為 Hybrid-Cloud 架構。
- **目標：** 允許用戶登入/註冊，並將本地題庫永久保存至雲端資料庫。
- **平台：** Supabase (Auth + PostgreSQL)。

## 2. 資料庫設計 (Schema Design)

### Tables

#### `profiles` (用戶資料)
- `id` (uuid, PK, references auth.users)
- `username` (text)
- `avatar_url` (text)
- `updated_at` (timestamp)

#### `banks` (題庫元數據)
- `id` (uuid, PK, default: gen_random_uuid())
- `user_id` (uuid, FK references profiles.id)
- `title` (text, required)
- `description` (text)
- `category` (text)
- `is_public` (boolean, default: false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `questions` (題目內容)
- `id` (uuid, PK, default: gen_random_uuid())
- `bank_id` (uuid, FK references banks.id, ON DELETE CASCADE)
- `type` (text, check: 'single' | 'multiple')
- `content` (text, 題目敘述)
- `options` (jsonb, 選項陣列)
- `answer` (jsonb, 正確答案 - 支援單字串或字串陣列)
- `explanation` (text, 詳解)
- `hint` (text, 提示)

## 3. 認證與同步策略 (Auth & Sync Strategy)

### 3.1 混合儲存層 (Hybrid Storage Service)
改造 `services/storage.ts`，引入 `StorageProvider` 介面：
- **Guest Mode (訪客):** 繼續使用 `localStorage`。
- **User Mode (已登入):** 優先讀取 Supabase，本地 `localStorage` 作為快取 (Cache)。

### 3.2 同步流程 (Migration Flow)
當用戶首次登入時：
1. 偵測 `localStorage` 中是否有存在的題庫。
2. 彈出對話框：「偵測到本地題庫，是否同步至雲端？」
3. 若同意，將本地 JSON 轉換格式並 `INSERT` 入 `banks` 與 `questions` 表。
4. 清除本地暫存或標記為「已同步」。

## 4. 實作步驟 (Tasks)
1. [ ] 安裝 `@supabase/supabase-js`。
2. [ ] 設定環境變數 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)。
3. [ ] 建立 `Login` 頁面 (Email/Password & Google Auth)。
4. [ ] 實作 Supabase Client Context。
5. [ ] 重構 `BankManager` 以支援非同步的雲端操作。
