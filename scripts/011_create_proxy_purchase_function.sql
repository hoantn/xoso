-- Hàm cập nhật current_users real-time
CREATE OR REPLACE FUNCTION update_proxy_current_users()
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật current_users cho proxy cũ (nếu có)
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
    
    -- Cập nhật current_users cho proxy mới (nếu có)
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động cập nhật current_users
CREATE TRIGGER trigger_update_proxy_users
    AFTER INSERT OR UPDATE OR DELETE ON proxy_orders
    FOR EACH ROW EXECUTE FUNCTION update_proxy_current_users();

-- Hàm mua proxy
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
    v_user_balance DECIMAL(10, 2);
    v_selected_proxy_id UUID;
    v_transaction_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Lấy thông tin gói proxy
    SELECT price, duration_days, max_connections, proxy_type
    INTO v_plan_price, v_plan_duration_days, v_plan_max_connections, v_plan_type
    FROM proxy_plans
    WHERE id = p_plan_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Gói proxy không tồn tại', NULL, NULL;
        RETURN;
    END IF;

    -- Lấy số dư hiện tại của người dùng từ bảng users
    SELECT balance INTO v_user_balance
    FROM users
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Người dùng không tồn tại', NULL, NULL;
        RETURN;
    END IF;

    -- Kiểm tra số dư
    IF v_user_balance < v_plan_price THEN
        RETURN QUERY SELECT FALSE, 'Số dư không đủ để mua gói này', NULL, NULL;
        RETURN;
    END IF;

    -- Tìm một proxy khả dụng phù hợp với loại gói và giới hạn người dùng
    -- Đảm bảo:
    -- 1. Proxy đang hoạt động (is_active = TRUE)
    -- 2. Loại proxy phù hợp với gói (p.type = v_plan_type)
    -- 3. Số người dùng hiện tại ít hơn số người tối đa (current_users < max_users)
    -- 4. Người dùng hiện tại (p_user_id) chưa có đơn hàng active cho proxy này
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
      )
    ORDER BY p.current_users ASC, p.created_at ASC -- Ưu tiên proxy ít người dùng hơn
    LIMIT 1;

    IF v_selected_proxy_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Không có proxy khả dụng cho gói này', NULL, NULL;
        RETURN;
    END IF;

    -- Tính toán thời gian hết hạn
    v_expires_at := NOW() + (v_plan_duration_days || ' days')::INTERVAL;

    -- Bắt đầu giao dịch (transaction)
    BEGIN
        -- Cập nhật số dư người dùng trong bảng users
        UPDATE users
        SET balance = balance - v_plan_price
        WHERE id = p_user_id;

        -- Ghi lại giao dịch mua proxy
        INSERT INTO transactions (user_id, type, amount, status, description, balance_before, balance_after, metadata)
        VALUES (
            p_user_id,
            'proxy_purchase',
            -v_plan_price, -- Số tiền âm vì là chi tiêu
            'completed',
            'Mua gói proxy: ' || (SELECT name FROM proxy_plans WHERE id = p_plan_id),
            v_user_balance,
            v_user_balance - v_plan_price,
            jsonb_build_object('plan_id', p_plan_id, 'proxy_id', v_selected_proxy_id)
        )
        RETURNING id INTO v_transaction_id;

        -- Tạo đơn hàng proxy
        INSERT INTO proxy_orders (user_id, plan_id, proxy_id, unit_price, total_amount, status, expires_at) -- Đã thêm 'total_amount'
        VALUES (p_user_id, p_plan_id, v_selected_proxy_id, v_plan_price, v_plan_price, 'active', v_expires_at); -- Gán v_plan_price cho total_amount

        -- Tăng số lượng người dùng hiện tại của proxy
        UPDATE proxies
        SET current_users = current_users + 1
        WHERE id = v_selected_proxy_id;

        RETURN QUERY SELECT TRUE, 'Mua proxy thành công', v_transaction_id, v_selected_proxy_id;

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback nếu có lỗi và trả về thông báo lỗi
            RAISE EXCEPTION 'Lỗi trong quá trình mua proxy: %', SQLERRM;
            RETURN QUERY SELECT FALSE, 'Lỗi hệ thống khi mua proxy', NULL, NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- Hàm cleanup proxy hết hạn (chạy định kỳ)
CREATE OR REPLACE FUNCTION cleanup_expired_proxies()
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Cập nhật status của các đơn hàng hết hạn
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

-- Cập nhật current_users cho tất cả proxy hiện tại (chạy một lần sau khi tạo hàm)
UPDATE proxies 
SET current_users = (
    SELECT COUNT(*) 
    FROM proxy_orders 
    WHERE proxy_id = proxies.id 
    AND status = 'active' 
    AND expires_at > NOW()
);
