-- =====================================================
-- TẠO LẠI TẤT CẢ FUNCTION VÀ TRIGGER CHO HỆ THỐNG PROXY
-- =====================================================

-- Function cập nhật current_users real-time
CREATE OR REPLACE FUNCTION update_proxy_current_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật current_users cho proxy cũ (nếu có)
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.proxy_id IS DISTINCT FROM NEW.proxy_id) THEN
        IF OLD.proxy_id IS NOT NULL THEN
            UPDATE proxies 
            SET current_users = (
                SELECT COUNT(*) 
                FROM proxy_orders 
                WHERE proxy_id = OLD.proxy_id 
                AND status = 'active' 
                AND expires_at > NOW()
            )
            WHERE id = OLD.proxy_id;
        END IF;
    END IF;
    
    -- Cập nhật current_users cho proxy mới (nếu có)
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.proxy_id IS DISTINCT FROM NEW.proxy_id) THEN
        IF NEW.proxy_id IS NOT NULL THEN
            UPDATE proxies 
            SET current_users = (
                SELECT COUNT(*) 
                FROM proxy_orders 
                WHERE proxy_id = NEW.proxy_id 
                AND status = 'active' 
                AND expires_at > NOW()
            )
            WHERE id = NEW.proxy_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger
CREATE TRIGGER trigger_update_proxy_users
    AFTER INSERT OR UPDATE OR DELETE ON proxy_orders
    FOR EACH ROW EXECUTE FUNCTION update_proxy_current_users();

-- Function mua proxy hoàn chỉnh
CREATE OR REPLACE FUNCTION purchase_proxy_plan(
    p_user_id UUID,
    p_plan_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, transaction_id UUID, proxy_id UUID) AS $$
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
BEGIN
    -- Lấy thông tin gói proxy
    SELECT price, duration_days, max_connections, proxy_type, name
    INTO v_plan_price, v_plan_duration_days, v_plan_max_connections, v_plan_type, v_plan_name
    FROM proxy_plans
    WHERE id = p_plan_id AND is_active = true;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Gói proxy không tồn tại hoặc đã bị vô hiệu hóa', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Lấy số dư hiện tại của người dùng
    SELECT balance INTO v_user_balance
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Người dùng không tồn tại', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Kiểm tra số dư
    IF v_user_balance < v_plan_price THEN
        RETURN QUERY SELECT FALSE, 'Số dư không đủ để mua gói này', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Tìm proxy khả dụng
    SELECT p.id INTO v_selected_proxy_id
    FROM proxies p
    WHERE p.is_active = TRUE
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
        RETURN QUERY SELECT FALSE, 'Không có proxy ' || v_plan_type || ' khả dụng cho gói này', NULL::UUID, NULL::UUID;
        RETURN;
    END IF;

    -- Tính thời gian hết hạn
    v_expires_at := NOW() + (v_plan_duration_days || ' days')::INTERVAL;

    -- Thực hiện giao dịch
    BEGIN
        -- Trừ tiền từ tài khoản
        UPDATE users
        SET balance = balance - v_plan_price
        WHERE id = p_user_id;

        -- Ghi lại giao dịch
        INSERT INTO transactions (user_id, type, amount, status, description, balance_before, balance_after, metadata)
        VALUES (
            p_user_id,
            'proxy_purchase',
            -v_plan_price,
            'completed',
            'Mua gói proxy: ' || v_plan_name,
            v_user_balance,
            v_user_balance - v_plan_price,
            jsonb_build_object(
                'plan_id', p_plan_id, 
                'proxy_id', v_selected_proxy_id,
                'plan_name', v_plan_name,
                'duration_days', v_plan_duration_days
            )
        )
        RETURNING id INTO v_transaction_id;

        -- Tạo đơn hàng proxy
        INSERT INTO proxy_orders (
            user_id, 
            plan_id, 
            proxy_id, 
            unit_price, 
            total_amount, 
            duration_days, 
            status, 
            expires_at
        )
        VALUES (
            p_user_id, 
            p_plan_id, 
            v_selected_proxy_id, 
            v_plan_price,
            v_plan_price,
            v_plan_duration_days,
            'active',
            v_expires_at
        );

        RETURN QUERY SELECT TRUE, 'Mua proxy thành công! Proxy sẽ hết hạn vào ' || v_expires_at::text, v_transaction_id, v_selected_proxy_id;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Lỗi trong quá trình mua proxy: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function cleanup proxy hết hạn
CREATE OR REPLACE FUNCTION cleanup_expired_proxies()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE proxy_orders 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expires_at <= NOW();
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    -- Cập nhật lại current_users cho tất cả proxy
    UPDATE proxies 
    SET current_users = (
        SELECT COUNT(*) 
        FROM proxy_orders 
        WHERE proxy_id = proxies.id 
        AND status = 'active' 
        AND expires_at > NOW()
    );
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- Cập nhật current_users ban đầu
UPDATE proxies 
SET current_users = (
    SELECT COUNT(*) 
    FROM proxy_orders 
    WHERE proxy_id = proxies.id 
    AND status = 'active' 
    AND expires_at > NOW()
);
