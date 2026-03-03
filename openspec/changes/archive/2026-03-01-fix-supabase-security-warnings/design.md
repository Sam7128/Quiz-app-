## Context

系統目前的安全狀態掃描 (透過 database-linter 或 supabase 內部安全查核工具，見 `安全警告.md`) 發現了高風險弱點。五張核心功能資料表（`study_sessions`, `user_study_stats_30day`, `user_streaks`, `user_achievements`, `challenges`）處於完全暴露於 Public Schema 中，缺乏 RLS (Row Level Security) 保護。此外，包含使用者註冊時觸發的 `handle_new_user` 函數未鎖定 Search Path，存在遭受權限提升或 Injection 攻擊的可能性；並且身份管理 (Auth) 中忽略了防護被洩漏密碼的機制。

這表示任何獲得系統匿名存取金鑰 (anon key) 的人極有可能繞過驗證，直接操作資料表上的紀錄，這違反了軟體工程中最基本的最小存取權限 (PoLP) 與零信任架構原則。

## Goals / Non-Goals

**Goals:**
1. 保障使用者資料隱私，確保沒有任何未經驗證或未授權的 API 請求可以存取敏感資料表。
2. 消除所有已知的資料庫層級安全性警告（RLS 缺失、Search Path Mutable、Auth 弱點）。
3. 建立 **100% 可自動化的驗證基準**，為每個修正提供具體 SQL 查詢腳本，在發佈前自動檢查所有政策與函數組態生效，以便快速核實完成度。
4. 增強前端 Auth 體驗，適當捕獲密碼外洩被拒絕註冊時的錯誤。

**Non-Goals:**
1. 目前不涉及 API 重構或應用程式前端內部複雜架構大改（限於處理被拒絕請求的提示）。
2. 不對不在警告列表上的其他模組進行大幅度架構演進。

## Decisions

**1. RLS Policy Strategy**
- **Decision:** 為五個目標資料表加上 RLS，一律採用基於 UUID 之 `user_id` 比對原則 (例如 `auth.uid() = user_id`) 作為 `SELECT`, `INSERT`, `UPDATE`, `DELETE` 的依據。如果表結構沒有 `user_id` 則修改結構或依關聯設定。
- **Rationale:** 符合 Supabase 對公有 Schema 下的嚴格安全要求規範，避免資源濫用。
- **Auto-verification (全自動驗證):** 將撰寫測試用的 SQL 查詢腳本 (`verify_rls_enabled.sql`)，從 `pg_class` 系統表中驗證 `relrowsecurity` 設定是否為 true，並查詢 `pg_policies` 確定存在至少一條 policy。

**2. Function Search Path Fix**
- **Decision:** 修改 `public.handle_new_user` 函數，明確附加 `SET search_path = public` 或空字串。
- **Rationale:** 避免黑客建立惡意的同名物件並藉由變更執行期的 search_path 進行攻擊。
- **Auto-verification (全自動驗證):** 撰寫查詢 `pg_proc` 取得 `proconfig` 屬性，判斷特定字串是否精確出現，作為通過標準。

**3. Leaked Password Protection**
- **Decision:** 將手動或透過 Supabase Management API 啟用專案層級的 `auth_leaked_password_protection`。
- **Rationale:** 減少帳戶遭到撞庫攻擊成功的風險。

## Risks / Trade-offs

- **[Risk] 使用者無法讀取本身資料或導致重要功能崩潰** 
  - *Mitigation:* Policy 寫錯極易造成前端讀不到資料 (返回 200 HTTP 但資料陣列為空)。任務中將附帶建立可重複利用的測試腳本，自動在開發環境注入 mock user auth 並斷言只能看到自己的資料。
- **[Risk] RLS 造成的效能下降**
  - *Mitigation:* 在政策執行的 `user_id` 欄位確保已經存在 Index。這會在 RLS 佈署的 Migration 中同步確認。
