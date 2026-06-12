-- 挑戰分數提交 RPC 安全函數
-- 強制在資料庫端校驗 user_id 並且限定防護邏輯，杜絕前端越權修改他人挑戰成績。

CREATE OR REPLACE FUNCTION public.submit_challenge_score(
    p_challenge_id UUID,
    p_score INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- 使用定義者權限，確保可以更新 challenges 表
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_challenger_id UUID;
    v_opponent_id UUID;
BEGIN
    -- 1. 取得當前認證的用戶 ID，前端不可信
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION '未授權的用戶訪問' USING ERRCODE = '42501';
    END IF;

    -- 2. 獲取挑戰的參與者資訊
    SELECT challenger_id, opponent_id
    INTO v_challenger_id, v_opponent_id
    FROM public.challenges
    WHERE id = p_challenge_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '挑戰不存在' USING ERRCODE = 'P0002';
    END IF;

    -- 3. 強制檢查當前用戶是否為該挑戰的參與者 (BOLA 防禦)
    IF v_user_id <> v_challenger_id AND v_user_id <> v_opponent_id THEN
        RAISE EXCEPTION '無權訪問或更新此挑戰分數' USING ERRCODE = '42501';
    END IF;

    -- 4. 安全分數邊界校驗 (防止前端提交負數或天價大數作弊)
    IF p_score < 0 OR p_score > 10000 THEN
        RAISE EXCEPTION '分數超出合理限制範圍' USING ERRCODE = '22003';
    END IF;

    -- 5. 根據用戶角色更新對應分數
    IF v_user_id = v_challenger_id THEN
        UPDATE public.challenges
        SET challenger_score = p_score,
            status = CASE 
                WHEN opponent_score IS NOT NULL THEN 'completed'::challenge_status 
                ELSE status 
            END,
            winner_id = CASE
                WHEN opponent_score IS NOT NULL THEN
                    CASE
                        WHEN p_score > opponent_score THEN v_challenger_id
                        WHEN opponent_score > p_score THEN v_opponent_id
                        ELSE NULL -- 平手
                    END
                ELSE winner_id
            END,
            updated_at = NOW()
        WHERE id = p_challenge_id;
    ELSIF v_user_id = v_opponent_id THEN
        UPDATE public.challenges
        SET opponent_score = p_score,
            status = CASE 
                WHEN challenger_score IS NOT NULL THEN 'completed'::challenge_status 
                ELSE status 
            END,
            winner_id = CASE
                WHEN challenger_score IS NOT NULL THEN
                    CASE
                        WHEN challenger_score > p_score THEN v_challenger_id
                        WHEN p_score > challenger_score THEN v_opponent_id
                        ELSE NULL -- 平手
                    END
                ELSE winner_id
            END,
            updated_at = NOW()
        WHERE id = p_challenge_id;
    END IF;

END;
$$;
