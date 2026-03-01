-- verify_rls_enabled.sql
-- 自動化驗證資料表是否已啟用 RLS 並存在相關 POLICY

WITH target_tables AS (
    SELECT unnest(ARRAY['study_sessions', 'user_study_stats_30day', 'user_streaks', 'user_achievements', 'challenges']) AS table_name
)
SELECT 
    t.table_name,
    CASE WHEN c.relrowsecurity THEN 'PASSED' ELSE 'FAILED' END AS rls_enabled,
    (SELECT count(*) FROM pg_policy WHERE polrelid = c.oid) AS policy_count,
    CASE 
        WHEN c.relrowsecurity AND (SELECT count(*) FROM pg_policy WHERE polrelid = c.oid) > 0 THEN 'SECURE'
        ELSE 'VULNERABLE'
    END AS status
FROM target_tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY t.table_name;
