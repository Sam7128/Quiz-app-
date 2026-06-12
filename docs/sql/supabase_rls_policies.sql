-- 2026 Supabase Security Hardening & RLS Policies
-- 包含挑戰提交、好友關係安全防護與成就系統防刷 SQL

-- ==========================================
-- 1. 成就系統防刷 RPC 函數
-- ==========================================
CREATE OR REPLACE FUNCTION public.unlock_achievement(
    p_achievement_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. 取得當前認證的用戶 ID，前端不可信
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '未授權的用戶訪問' USING ERRCODE = '42501';
    END IF;

    -- 2. 成就 ID 合法性校驗
    IF p_achievement_id IS NULL OR LENGTH(TRIM(p_achievement_id)) = 0 THEN
        RETURN FALSE;
    END IF;

    -- 3. 成就判定防刷安全校驗：限制單一用戶最大成就解鎖數，防範惡意腳本無限刷庫
    IF (SELECT COUNT(*) FROM public.user_achievements WHERE user_id = v_user_id) >= 100 THEN
        RAISE EXCEPTION '已達成就上限數量限制，疑似刷庫行為' USING ERRCODE = '22003';
    END IF;

    -- 4. 插入成就
    INSERT INTO public.user_achievements (user_id, achievement_id, created_at)
    VALUES (v_user_id, p_achievement_id, NOW())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    RETURN TRUE;
END;
$$;


-- ==========================================
-- 2. 好友關係安全防禦 RLS 策略 (friendships)
-- ==========================================
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 好友查詢 Policy: 只允許好友雙方查詢自己相關的好友對話或列表
DROP POLICY IF EXISTS "Users can view their own friendships." ON public.friendships;
CREATE POLICY "Users can view their own friendships." ON public.friendships
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 好友發起 Policy: 只允許為自己發送好友請求，且發送狀態預設必須為 pending
DROP POLICY IF EXISTS "Users can insert friendship requests for themselves." ON public.friendships;
CREATE POLICY "Users can insert friendship requests for themselves." ON public.friendships
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND status = 'pending'::friendship_status
    );

-- 好友更新 Policy (核准好友):
-- 嚴格限制：只有被邀請者 (friend_id) 才能更新狀態，發起者 (user_id) 無權核准自己發起的請求！
-- 並且只能將 pending 更新為 accepted
DROP POLICY IF EXISTS "Only friend_id can accept friendship requests." ON public.friendships;
CREATE POLICY "Only friend_id can accept friendship requests." ON public.friendships
    FOR UPDATE USING (
        auth.uid() = friend_id 
        AND status = 'pending'::friendship_status
    )
    WITH CHECK (
        auth.uid() = friend_id 
        AND status = 'accepted'::friendship_status
    );

-- 好友刪除 Policy: 只允許好友雙方解除好友或拒絕請求
DROP POLICY IF EXISTS "Users can delete their own friendships." ON public.friendships;
CREATE POLICY "Users can delete their own friendships." ON public.friendships
    FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);
