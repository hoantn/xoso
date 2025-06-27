-- Script sửa lỗi balance_before trong bảng transactions

BEGIN;

-- 1. Xóa ràng buộc NOT NULL cho cột balance_before (nếu có)
ALTER TABLE public.transactions ALTER COLUMN balance_before DROP NOT NULL;

-- 2. Đặt giá trị mặc định cho balance_before
ALTER TABLE public.transactions ALTER COLUMN balance_before SET DEFAULT 0;

-- 3. Cập nhật các record hiện có có balance_before = NULL
UPDATE public.transactions 
SET balance_before = 0 
WHERE balance_before IS NULL;

-- 4. Tạo lại function purchase_proxy_plan với balance_before
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION purchase_proxy_plan(p_user_id uuid, p_plan_id uuid)
RETURNS TABLE(success boolean, message text, order_id uuid, proxy_id uuid, expires_at timestamptz) AS $$
DECLARE
    v_plan_price numeric;
    v_plan_duration_days integer;
    v_plan_max_connections integer;
    v_plan_proxy_type text;
    v_user_balance numeric;
    v_new_balance numeric;
    v_order_id uuid;
    v_proxy_id uuid;
    v_expires_at timestamptz;
BEGIN
    -- Lock the user row to prevent race conditions
    SELECT balance INTO v_user_balance FROM public.users WHERE id = p_user_id FOR UPDATE;

    IF v_user_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Người dùng không tồn tại hoặc số dư chưa được khởi tạo.', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Get plan details
    SELECT price, duration_days, max_connections, proxy_type
    INTO v_plan_price, v_plan_duration_days, v_plan_max_connections, v_plan_proxy_type
    FROM public.proxy_plans
    WHERE id = p_plan_id AND is_active = TRUE;

    IF v_plan_price IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Gói proxy không tồn tại hoặc không hoạt động.', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Check if user has enough balance
    IF v_user_balance < v_plan_price THEN
        RETURN QUERY SELECT FALSE, 'Số dư không đủ để mua gói proxy này. Số dư hiện tại: ' || v_user_balance || ' VNĐ, cần: ' || v_plan_price || ' VNĐ', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Calculate new balance
    v_new_balance := v_user_balance - v_plan_price;

    -- Update user balance
    UPDATE public.users
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;

    -- Select an available proxy based on proxy_type
    SELECT id INTO v_proxy_id
    FROM public.proxies
    WHERE (proxy_type = v_plan_proxy_type OR type = v_plan_proxy_type) 
      AND is_active = TRUE 
      AND user_id IS NULL
    ORDER BY RANDOM()
    LIMIT 1
    FOR UPDATE;

    IF v_proxy_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Không có proxy khả dụng cho loại ' || v_plan_proxy_type || '. Vui lòng thử lại sau.', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Calculate expiration date
    v_expires_at := NOW() + (v_plan_duration_days || ' days')::interval;

    -- Create proxy order
    INSERT INTO public.proxy_orders (user_id, proxy_id, plan_id, price, expires_at, created_at, updated_at)
    VALUES (p_user_id, v_proxy_id, p_plan_id, v_plan_price, v_expires_at, NOW(), NOW())
    RETURNING id INTO v_order_id;

    -- Update proxy status
    UPDATE public.proxies
    SET user_id = p_user_id,
        expires_at = v_expires_at,
        max_users = v_plan_max_connections,
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_proxy_id;

    -- Record transaction với balance_before
    INSERT INTO public.transactions (
        user_id, 
        amount, 
        type, 
        status, 
        description, 
        reference_id, 
        balance_before, 
        balance_after, 
        created_at, 
        updated_at
    )
    VALUES (
        p_user_id, 
        -v_plan_price, 
        'purchase', 
        'completed', 
        'Mua gói proxy ' || v_plan_proxy_type, 
        v_order_id, 
        v_user_balance,  -- balance_before
        v_new_balance,   -- balance_after
        NOW(), 
        NOW()
    );

    -- Return success result
    RETURN QUERY SELECT TRUE, 'Mua proxy thành công! Proxy sẽ hết hạn vào ' || v_expires_at::text, v_order_id, v_proxy_id, v_expires_at;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE NOTICE 'Error in purchase_proxy_plan: %', SQLERRM;
        -- Return error result
        RETURN QUERY SELECT FALSE, 'Lỗi hệ thống khi xử lý yêu cầu mua proxy: ' || SQLERRM, NULL::uuid, NULL::uuid, NULL::timestamptz;
END;
$$ LANGUAGE plpgsql;

COMMIT;

SELECT 'Function purchase_proxy_plan đã được cập nhật với balance_before và balance_after!' AS message;
