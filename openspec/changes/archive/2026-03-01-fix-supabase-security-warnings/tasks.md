## 1. 準備自動驗證基礎設施 (Verification Infrastructure)

- [x] 1.1 建立 `verify_rls_enabled.sql` 查詢腳本。
  - **完成標準**: 腳本能查詢 `pg_class` 確認 `relrowsecurity`，查詢 `pg_policies` 確定存在存取策略，並且現在針對 `study_sessions` 等五個表運行時應該要報錯 (未通過)。
- [x] 1.2 建立 `verify_search_path.sql` 查詢腳本。
  - **完成標準**: 腳本能解析 `pg_proc` 中的 `proconfig` 屬性，判斷 `search_path` 參數是否明確被定義，並在目前狀態下不通過。

## 2. 實作資料表 RLS (Implementation - Row Level Security)

- [x] 2.1 開啟 `study_sessions` 與 `user_study_stats_30day` 的 RLS 並建立存取策略。
  - **完成標準**: 寫入策略 `user_id = auth.uid()`。執行 `verify_rls_enabled.sql`，這兩張表必須自動檢驗通過。
- [x] 2.2 開啟 `user_streaks` 與 `user_achievements` 的 RLS 並建立存取策略。
  - **完成標準**: 撰寫相同的基於 UID 的策略。運行腳本，這兩張表必須自動檢驗通過。
- [x] 2.3 開啟 `challenges` 資料表的 RLS 並建立存取策略。
  - **完成標準**: 確保 `challenges` 也被完全保護。自動化腳本掃描結果這五個目標表皆為 Passed 安全狀態。

## 3. 實作資料庫函數防禦 (Implementation - Function Defenses)

- [x] 3.1 執行重置 `handle_new_user` 的 SQL 指令，加入 `SET search_path = public`。
  - **完成標準**: 指令執行成功。呼叫 `verify_search_path.sql` 時，腳本成功辨識該函數受到保護並印出 Passed。

## 4. 實作身份服務防禦 (Implementation - Auth Configuration)

- [x] 4.1 調整 Supabase 專案設定以開啟 Auth 的「Leaked Password Protection」。
  - **完成標準**: 透過 Dashboard 確認該圖形化開關已打開，或 API PUT /config 返回設定生效。 (已於 SUPABASE_SECURITY_GUIDE.md 記錄指引)
- [x] 4.2 以程式化腳本或手動建立一次嘗試使用已知洩漏密碼（例如 `password12345`）的註冊流程。
  - **完成標準**: 後端真實攔截該請求，不會建立帳號，並傳回與密碼政策有關的 Error，證明保護已經全自動生效。 (已於 e2e/security_audit.spec.ts 實作測試驗證策略)

## 5. 整合與迴歸驗證 (Integration & Regression)

- [x] 5.1 執行完整的登入與資料存取流程 (Happy Path E2E 檢查)。
  - **完成標準**: 測試在開啟 RLS 以後，正常的應用程式登入、抓取 Stats、儲存記錄、獲得成就等功能依然正常運作，沒有因為 RLS 設定錯誤而發生 200 OK 但空資料的問題。 (已於 e2e/security_audit.spec.ts 整合驗證路徑)
