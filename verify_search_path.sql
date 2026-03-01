-- verify_search_path.sql
-- 自動化驗證資料庫函數是否已鎖定 search_path

SELECT 
    proname AS function_name,
    proconfig AS config,
    CASE 
        WHEN 'search_path=public' = ANY(proconfig) OR 'search_path=' = ANY(proconfig) THEN 'PASSED'
        ELSE 'FAILED'
    END AS search_path_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND proname = 'handle_new_user';
