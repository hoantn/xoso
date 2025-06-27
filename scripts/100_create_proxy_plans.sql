-- Tạo bảng gói proxy để bán
CREATE TABLE IF NOT EXISTS proxy_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_connections INTEGER DEFAULT 1,
    proxy_type VARCHAR(20) DEFAULT 'mtproto',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tạo bảng đơn hàng mua proxy
CREATE TABLE IF NOT EXISTS proxy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id), -- Đã sửa từ user_profiles thành users
    plan_id UUID NOT NULL REFERENCES proxy_plans(id),
    proxy_id UUID REFERENCES proxies(id),
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thêm dữ liệu mẫu
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections) VALUES
('Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 thiết bị', 50000, 30, 1),
('Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 thiết bị', 120000, 30, 3),
('Gói Premium', 'Proxy MTProto không giới hạn thiết bị', 200000, 30, 999);

-- Tạo function mua proxy (sửa lại để sử dụng bảng users)
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
    
    -- Kiểm tra số dư từ bảng users thay vì user_profiles
    SELECT balance INTO v_user_balance FROM users WHERE id = p_user_id;
    IF v_user_balance < v_plan.price THEN
        RETURN json_build_object('success', false, 'message', 'Số dư không đủ');
    END IF;
    
    -- Tìm proxy khả dụng
    SELECT id INTO v_proxy_id 
    FROM proxies 
    WHERE is_active = true 
    AND id NOT IN (SELECT proxy_id FROM proxy_orders WHERE status = 'active' AND proxy_id IS NOT NULL)
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Không có proxy khả dụng');
    END IF;
    
    -- Tính ngày hết hạn
    v_expires_at := NOW() + INTERVAL '1 day' * v_plan.duration_days;
    
    -- Tạo đơn hàng
    INSERT INTO proxy_orders (user_id, plan_id, proxy_id, price, expires_at)
    VALUES (p_user_id, p_plan_id, v_proxy_id, v_plan.price, v_expires_at)
    RETURNING id INTO v_order_id;
    
    -- Trừ tiền từ bảng users thay vì user_profiles
    UPDATE users SET balance = balance - v_plan.price WHERE id = p_user_id;
    
    -- Tạo giao dịch
    INSERT INTO transactions (user_id, type, amount, description, status)
    VALUES (p_user_id, 'purchase', -v_plan.price, 'Mua gói proxy: ' || v_plan.name, 'completed');
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Mua proxy thành công',
        'order_id', v_order_id,
        'proxy_id', v_proxy_id,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql;
