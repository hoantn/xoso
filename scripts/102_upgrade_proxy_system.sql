-- Thêm cột proxy_type, max_users, current_users vào bảng proxies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='proxy_type') THEN
        ALTER TABLE proxies ADD COLUMN proxy_type VARCHAR(20) DEFAULT 'mtproto';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='max_users') THEN
        ALTER TABLE proxies ADD COLUMN max_users INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='current_users') THEN
        ALTER TABLE proxies ADD COLUMN current_users INTEGER DEFAULT 0;
    END IF;
END
$$;

-- Cập nhật giá trị mặc định cho các proxy hiện có nếu cần
UPDATE proxies SET proxy_type = 'mtproto' WHERE proxy_type IS NULL;
UPDATE proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE proxies SET current_users = 0 WHERE current_users IS NULL;

-- Thêm cột visibility vào bảng proxies nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='visibility') THEN
        ALTER TABLE proxies ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'; -- 'public', 'private', 'hidden'
    END IF;
END
$$;

-- Cập nhật giá trị visibility cho các proxy hiện có nếu cần
UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;

-- Thêm cột purchased_at vào bảng proxies nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='purchased_at') THEN
        ALTER TABLE proxies ADD COLUMN purchased_at TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- Thêm cột expires_at vào bảng proxy_orders nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='expires_at') THEN
        ALTER TABLE proxy_orders ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- Thêm cột is_active vào bảng proxy_plans nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_plans' AND column_name='is_active') THEN
        ALTER TABLE proxy_plans ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END
$$;

-- Thêm cột created_at và updated_at vào bảng proxy_plans nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_plans' AND column_name='created_at') THEN
        ALTER TABLE proxy_plans ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_plans' AND column_name='updated_at') THEN
        ALTER TABLE proxy_plans ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END
$$;

-- Thêm cột created_at và updated_at vào bảng proxy_orders nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='created_at') THEN
        ALTER TABLE proxy_orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='updated_at') THEN
        ALTER TABLE proxy_orders ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END
$$;

-- Thêm cột created_at và updated_at vào bảng proxies nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='created_at') THEN
        ALTER TABLE proxies ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='updated_at') THEN
        ALTER TABLE proxies ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END
$$;

-- Bước 3: Cập nhật bảng proxy_plans để có proxy_type
ALTER TABLE proxy_plans ADD COLUMN IF NOT EXISTS proxy_type VARCHAR(20) DEFAULT 'mtproto';

-- Bước 4: Tạo function cập nhật current_users real-time
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

-- Bước 5: Tạo trigger để tự động cập nhật current_users
DROP TRIGGER IF EXISTS trigger_update_proxy_users ON proxy_orders;
CREATE TRIGGER trigger_update_proxy_users
    AFTER INSERT OR UPDATE OR DELETE ON proxy_orders
    FOR EACH ROW EXECUTE FUNCTION update_proxy_current_users();

-- Bước 6: Cập nhật function purchase_proxy_plan với logic mới
CREATE OR REPLACE FUNCTION purchase_proxy_plan(
    p_user_id UUID,
    p_plan_id UUID
) RETURNS JSON AS $$
DECLARE
    v_plan proxy_plans%ROWTYPE;
    v_user_balance DECIMAL(10,2);
    v_proxy_id UUID;
    v_order_id UUID;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Lấy thông tin gói
    SELECT * INTO v_plan FROM proxy_plans WHERE id = p_plan_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Gói proxy không tồn tại');
    END IF;
    
    -- Kiểm tra số dư
    SELECT balance INTO v_user_balance FROM user_profiles WHERE id = p_user_id;
    IF v_user_balance < v_plan.price THEN
        RETURN json_build_object('success', false, 'message', 'Số dư không đủ');
    END IF;
    
    -- Tìm proxy khả dụng theo loại và còn slot
    SELECT id INTO v_proxy_id 
    FROM proxies 
    WHERE is_active = true 
    AND type = v_plan.proxy_type
    AND current_users < max_users
    ORDER BY current_users ASC, created_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Không có proxy ' || v_plan.proxy_type || ' khả dụng');
    END IF;
    
    -- Tính ngày hết hạn
    v_expires_at := NOW() + INTERVAL '1 day' * v_plan.duration_days;
    
    -- Tạo đơn hàng
    INSERT INTO proxy_orders (user_id, plan_id, proxy_id, price, expires_at)
    VALUES (p_user_id, p_plan_id, v_proxy_id, v_plan.price, v_expires_at)
    RETURNING id INTO v_order_id;
    
    -- Trừ tiền
    UPDATE user_profiles SET balance = balance - v_plan.price WHERE id = p_user_id;
    
    -- Tạo giao dịch
    INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (p_user_id, 'purchase', -v_plan.price, 'Mua gói proxy ' || v_plan.proxy_type || ': ' || v_plan.name, 'completed');
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Mua proxy thành công',
        'order_id', v_order_id,
        'proxy_id', v_proxy_id,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- Bước 7: Function để cleanup proxy hết hạn (chạy định kỳ)
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

-- Bước 8: Cập nhật current_users cho tất cả proxy hiện tại
UPDATE proxies 
SET current_users = (
    SELECT COUNT(*) 
    FROM proxy_orders 
    WHERE proxy_id = proxies.id 
    AND status = 'active' 
    AND expires_at > NOW()
);

-- Bước 9: Thêm dữ liệu mẫu với proxy_type
UPDATE proxy_plans SET proxy_type = 'mtproto' WHERE proxy_type IS NULL;

-- Thêm gói mẫu cho các loại proxy khác
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type) VALUES
('Gói SOCKS5 Cơ Bản', 'Proxy SOCKS5 cho 1 người dùng', 40000, 30, 1, 'socks5'),
('Gói HTTP Cơ Bản', 'Proxy HTTP cho 1 người dùng', 30000, 30, 1, 'http')
ON CONFLICT DO NOTHING;
