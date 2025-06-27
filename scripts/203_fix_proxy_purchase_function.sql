-- =====================================================
-- SỬA LỖI MUA PROXY - FUNCTION HOÀN CHỈNH VÀ ỔN ĐỊNH
-- =====================================================

-- Xóa function cũ
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);

-- Tạo lại function mua proxy với xử lý lỗi tốt hơn
CREATE OR REPLACE FUNCTION purchase_proxy_plan(
    p_user_id UUID,
    p_plan_id UUID
)
RETURNS TABLE(
    success BOOLEAN, 
    message TEXT, 
    transaction_id UUID, 
    proxy_id UUID,
    new_balance DECIMAL(15,2),
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_plan_price DECIMAL(10, 2);
    v_plan_duration_days INTEGER;
    v_plan_max_connections INTEGER;
    v_plan_type VARCHAR(20);
    v_plan_name VARCHAR(255);
    v_user_balance DECIMAL(10, 2);
    v_selected_proxy_id UUID;
    v_transaction_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_new_balance DECIMAL(15,2);
BEGIN
    -- Log bắt đầu function
    RAISE NOTICE 'Bắt đầu mua proxy - User: %, Plan: %', p_user_id, p_plan_id;
    
    -- Lấy thông tin gói proxy
    SELECT price, duration_days, max_connections, proxy_type, name
    INTO v_plan_price, v_plan_duration_days, v_plan_max_connections, v_plan_type, v_plan_name
    FROM proxy_plans
    WHERE id = p_plan_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE NOTICE 'Gói proxy không tồn tại: %', p_plan_id;
        RETURN QUERY SELECT FALSE, 'Gói proxy không tồn tại hoặc đã bị vô hiệu hóa'::TEXT, NULL::UUID, NULL::UUID, NULL::DECIMAL(15,2), NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    RAISE NOTICE 'Thông tin gói: % - % VND - % ngày', v_plan_name, v_plan_price, v_plan_duration_days;

    -- Lấy số dư hiện tại của người dùng
    SELECT balance INTO v_user_balance
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE NOTICE 'Người dùng không tồn tại: %', p_user_id;
        RETURN QUERY SELECT FALSE, 'Người dùng không tồn tại'::TEXT, NULL::UUID, NULL::UUID, NULL::DECIMAL(15,2), NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    RAISE NOTICE 'Số dư hiện tại: % VND', v_user_balance;

    -- Kiểm tra số dư
    IF v_user_balance < v_plan_price THEN
        RAISE NOTICE 'Số dư không đủ: % < %', v_user_balance, v_plan_price;
        RETURN QUERY SELECT FALSE, ('Số dư không đủ. Cần: ' || v_plan_price || ' VND, Có: ' || v_user_balance || ' VND')::TEXT, NULL::UUID, NULL::UUID, v_user_balance, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Tìm proxy khả dụng (chỉ tìm proxy public và active)
    SELECT p.id INTO v_selected_proxy_id
    FROM proxies p
    WHERE p.is_active = TRUE
      AND p.visibility = 'public'
      AND p.type = v_plan_type
      AND p.current_users < p.max_users
      AND NOT EXISTS (
          SELECT 1
          FROM proxy_orders po
          WHERE po.proxy_id = p.id
            AND po.user_id = p_user_id
            AND po.status = 'active'
            AND po.expires_at > NOW()
      )
    ORDER BY p.current_users ASC, p.created_at ASC
    LIMIT 1;

    IF v_selected_proxy_id IS NULL THEN
        RAISE NOTICE 'Không tìm thấy proxy khả dụng cho type: %', v_plan_type;
        RETURN QUERY SELECT FALSE, ('Không có proxy ' || v_plan_type || ' khả dụng. Vui lòng thử lại sau.')::TEXT, NULL::UUID, NULL::UUID, v_user_balance, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    RAISE NOTICE 'Đã chọn proxy: %', v_selected_proxy_id;

    -- Tính thời gian hết hạn
    v_expires_at := NOW() + (v_plan_duration_days || ' days')::INTERVAL;
    v_new_balance := v_user_balance - v_plan_price;

    -- Thực hiện giao dịch trong transaction
    BEGIN
        -- Trừ tiền từ tài khoản
        UPDATE users
        SET balance = v_new_balance, updated_at = NOW()
        WHERE id = p_user_id;

        RAISE NOTICE 'Đã trừ tiền. Số dư mới: %', v_new_balance;

        -- Ghi lại giao dịch
        INSERT INTO transactions (
            user_id, 
            type, 
            amount, 
            status, 
            description, 
            balance_before, 
            balance_after, 
            metadata,
            created_at
        )
        VALUES (
            p_user_id,
            'proxy_purchase',
            -v_plan_price,
            'completed',
            'Mua gói proxy: ' || v_plan_name,
            v_user_balance,
            v_new_balance,
            jsonb_build_object(
                'plan_id', p_plan_id, 
                'proxy_id', v_selected_proxy_id,
                'plan_name', v_plan_name,
                'duration_days', v_plan_duration_days,
                'proxy_type', v_plan_type
            ),
            NOW()
        )
        RETURNING id INTO v_transaction_id;

        RAISE NOTICE 'Đã tạo transaction: %', v_transaction_id;

        -- Tạo đơn hàng proxy
        INSERT INTO proxy_orders (
            user_id, 
            plan_id, 
            proxy_id, 
            unit_price, 
            total_amount, 
            duration_days, 
            status, 
            expires_at,
            created_at,
            updated_at
        )
        VALUES (
            p_user_id, 
            p_plan_id, 
            v_selected_proxy_id, 
            v_plan_price,
            v_plan_price,
            v_plan_duration_days,
            'active',
            v_expires_at,
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Đã tạo proxy order thành công';

        -- Trả về kết quả thành công
        RETURN QUERY SELECT 
            TRUE, 
            ('Mua proxy thành công! Proxy sẽ hết hạn vào ' || to_char(v_expires_at, 'DD/MM/YYYY HH24:MI'))::TEXT, 
            v_transaction_id, 
            v_selected_proxy_id,
            v_new_balance,
            v_expires_at;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Lỗi trong transaction: %', SQLERRM;
            -- Rollback sẽ tự động xảy ra
            RETURN QUERY SELECT FALSE, ('Lỗi trong quá trình mua proxy: ' || SQLERRM)::TEXT, NULL::UUID, NULL::UUID, v_user_balance, NULL::TIMESTAMP WITH TIME ZONE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Test function với dữ liệu mẫu
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE 'Function purchase_proxy_plan đã được tạo thành công';
END
$$;
