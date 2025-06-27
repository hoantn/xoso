-- =====================================================
-- FIX AMBIGUOUS COLUMN REFERENCE IN purchase_proxy_plan
-- =====================================================

BEGIN;

-- Drop the existing function to recreate it
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);

-- Recreate the function with explicit table alias for proxy_id
CREATE OR REPLACE FUNCTION purchase_proxy_plan(
    p_user_id UUID,
    p_plan_id UUID
) RETURNS TABLE(success BOOLEAN, message TEXT, order_id UUID, proxy_id UUID, expires_at TIMESTAMPTZ) AS $$
DECLARE
    v_plan proxy_plans%ROWTYPE;
    v_user_balance DECIMAL(10,2);
    v_proxy_id UUID;
    v_order_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_balance_before DECIMAL(10,2);
    v_balance_after DECIMAL(10,2);
BEGIN
    -- Log function call
    RAISE NOTICE 'purchase_proxy_plan called with user_id: %, plan_id: %', p_user_id, p_plan_id;
    
    -- Lấy thông tin gói
    SELECT * INTO v_plan FROM proxy_plans WHERE id = p_plan_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE NOTICE 'Plan not found or inactive: %', p_plan_id;
        RETURN QUERY SELECT false, 'Gói proxy không tồn tại hoặc đã bị vô hiệu hóa'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found plan: % - Price: %', v_plan.name, v_plan.price;
    
    -- Kiểm tra số dư từ bảng users
    SELECT balance INTO v_user_balance FROM users WHERE id = p_user_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found or inactive: %', p_user_id;
        RETURN QUERY SELECT false, 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    RAISE NOTICE 'User balance: %', v_user_balance;
    
    IF v_user_balance < v_plan.price THEN
        RAISE NOTICE 'Insufficient balance. Required: %, Available: %', v_plan.price, v_user_balance;
        RETURN QUERY SELECT false, 'Số dư không đủ để mua gói proxy này'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Tìm proxy khả dụng
    SELECT p.id INTO v_proxy_id -- Use alias 'p' for proxies.id
    FROM proxies p -- Add alias 'p'
    WHERE p.is_active = true 
    AND p.visibility = 'public'
    AND p.id NOT IN (
        SELECT COALESCE(po.proxy_id, '00000000-0000-0000-0000-000000000000'::UUID)
        FROM proxy_orders po -- Add alias 'po' for proxy_orders
        WHERE po.status = 'active' 
        AND po.proxy_id IS NOT NULL 
        AND po.expires_at > NOW()
    )
    ORDER BY p.created_at ASC -- Use alias 'p'
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No available proxy found';
        RETURN QUERY SELECT false, 'Hiện tại không có proxy khả dụng. Vui lòng thử lại sau'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found available proxy: %', v_proxy_id;
    
    -- Tính ngày hết hạn
    v_expires_at := NOW() + INTERVAL '1 day' * v_plan.duration_days;
    RAISE NOTICE 'Expires at: %', v_expires_at;
    
    -- Lưu balance trước khi thay đổi
    v_balance_before := v_user_balance;
    v_balance_after := v_user_balance - v_plan.price;
    
    -- Tạo đơn hàng
    INSERT INTO proxy_orders (user_id, plan_id, proxy_id, price, expires_at, status)
    VALUES (p_user_id, p_plan_id, v_proxy_id, v_plan.price, v_expires_at, 'active')
    RETURNING id INTO v_order_id;
    
    RAISE NOTICE 'Created order: %', v_order_id;
    
    -- Trừ tiền từ bảng users
    UPDATE users SET balance = v_balance_after WHERE id = p_user_id;
    RAISE NOTICE 'Updated user balance from % to %', v_balance_before, v_balance_after;
    
    -- Tạo giao dịch
    INSERT INTO transactions (user_id, type, amount, description, status, balance_before, balance_after, reference_id)
    VALUES (
        p_user_id, 
        'proxy_purchase', 
        -v_plan.price, 
        'Mua gói proxy: ' || v_plan.name || ' (Thời hạn: ' || v_plan.duration_days || ' ngày)', 
        'completed', 
        v_balance_before, 
        v_balance_after,
        v_order_id
    );
    
    RAISE NOTICE 'Created transaction for order: %', v_order_id;
    
    RETURN QUERY SELECT true, 'Mua proxy thành công!'::TEXT, v_order_id, v_proxy_id, v_expires_at;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in purchase_proxy_plan: %', SQLERRM;
        RETURN QUERY SELECT false, ('Lỗi hệ thống: ' || SQLERRM)::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Thông báo hoàn thành
SELECT 'Hàm purchase_proxy_plan đã được cập nhật để khắc phục lỗi ambiguous proxy_id!' AS message;
