CREATE OR REPLACE FUNCTION purchase_proxy_plan(p_user_id uuid, p_plan_id uuid)
RETURNS TABLE(success boolean, message text, order_id uuid, proxy_id uuid, expires_at timestamp with time zone)
LANGUAGE plpgsql
AS $$
DECLARE
    v_plan_price numeric;
    v_plan_duration_days integer;
    v_plan_max_connections integer;
    v_plan_proxy_type text; -- Biến để lưu loại proxy từ gói
    v_user_balance numeric;
    v_order_id uuid := gen_random_uuid();
    v_proxy_id uuid;
    v_expires_at timestamp with time zone;
    v_transaction_id uuid := gen_random_uuid();
BEGIN
    -- Lấy thông tin gói proxy, bao gồm loại proxy
    SELECT price, duration_days, max_connections, proxy_type INTO v_plan_price, v_plan_duration_days, v_plan_max_connections, v_plan_proxy_type
    FROM proxy_plans
    WHERE id = p_plan_id;

    IF v_plan_price IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Gói proxy không tồn tại.', NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Lấy số dư hiện tại của người dùng
    SELECT balance INTO v_user_balance
    FROM user_profiles
    WHERE id = p_user_id;

    IF v_user_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Người dùng không tồn tại.', NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Kiểm tra số dư
    IF v_user_balance < v_plan_price THEN
        RETURN QUERY SELECT FALSE, 'Số dư không đủ để mua gói proxy này.', NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Tìm một proxy khả dụng (chưa được gán cho ai, có visibility là 'private' VÀ CÓ CÙNG LOẠI VỚI GÓI)
    SELECT id INTO v_proxy_id
    FROM proxies
    WHERE user_id IS NULL AND visibility = 'private' AND type = v_plan_proxy_type -- Thêm điều kiện lọc theo loại proxy
    ORDER BY random()
    LIMIT 1;

    IF v_proxy_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Không có proxy riêng tư khả dụng cho gói này với loại ' || v_plan_proxy_type || '. Vui lòng liên hệ hỗ trợ.', NULL, NULL, NULL;
        RETURN;
    END IF;

    -- Cập nhật thông tin proxy
    v_expires_at := NOW() + (v_plan_duration_days || ' days')::interval;

    UPDATE proxies
    SET
        user_id = p_user_id,
        expires_at = v_expires_at,
        max_users = v_plan_max_connections,
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_proxy_id;

    -- Cập nhật số dư người dùng
    UPDATE user_profiles
    SET balance = balance - v_plan_price, updated_at = NOW()
    WHERE id = p_user_id;

    -- Ghi lại giao dịch
    INSERT INTO transactions (id, user_id, type, amount, status, description, related_entity_id)
    VALUES (v_transaction_id, p_user_id, 'proxy_purchase', -v_plan_price, 'completed', 'Mua gói proxy ' || v_plan_price || ' VND', v_proxy_id);

    -- Ghi lại đơn hàng proxy
    INSERT INTO proxy_orders (id, user_id, proxy_id, plan_id, price, expires_at, status)
    VALUES (v_order_id, p_user_id, v_proxy_id, p_plan_id, v_plan_price, v_expires_at, 'active');

    RETURN QUERY SELECT TRUE, 'Mua gói proxy thành công!', v_order_id, v_proxy_id, v_expires_at;

EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, 'Lỗi hệ thống: ' || SQLERRM, NULL, NULL, NULL;
END;
$$;
