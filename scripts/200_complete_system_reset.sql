-- =====================================================
-- RESET TOÀN BỘ HỆ THỐNG PROXY - PHIÊN BẢN CUỐI CÙNG
-- =====================================================

-- Xóa tất cả trigger và function cũ
DROP TRIGGER IF EXISTS trigger_update_proxy_users ON proxy_orders;
DROP TRIGGER IF EXISTS update_proxy_current_users_trigger ON proxy_orders;
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);
DROP FUNCTION IF EXISTS update_proxy_current_users();
DROP FUNCTION IF EXISTS cleanup_expired_proxies();

-- Đảm bảo bảng users có balance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='balance') THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC(15,2) DEFAULT 0;
    END IF;
END
$$;

-- Tạo lại bảng proxy_plans với cấu trúc chuẩn
CREATE TABLE IF NOT EXISTS proxy_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_connections INTEGER DEFAULT 1,
    proxy_type VARCHAR(20) DEFAULT 'mtproto',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Đảm bảo bảng proxies có đúng cấu trúc
DO $$
BEGIN
    -- Thêm các cột cần thiết nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='type') THEN
        ALTER TABLE proxies ADD COLUMN type VARCHAR(20) DEFAULT 'mtproto';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='max_users') THEN
        ALTER TABLE proxies ADD COLUMN max_users INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='current_users') THEN
        ALTER TABLE proxies ADD COLUMN current_users INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='visibility') THEN
        ALTER TABLE proxies ADD COLUMN visibility VARCHAR(20) DEFAULT 'public';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='source') THEN
        ALTER TABLE proxies ADD COLUMN source VARCHAR(100) DEFAULT 'Manual';
    END IF;
END
$$;

-- Tạo lại bảng proxy_orders với cấu trúc đầy đủ
DROP TABLE IF EXISTS proxy_orders CASCADE;
CREATE TABLE proxy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID REFERENCES proxy_plans(id),
    proxy_id UUID REFERENCES proxies(id),
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cập nhật giá trị mặc định
UPDATE users SET balance = 0 WHERE balance IS NULL;
UPDATE proxies SET type = 'mtproto' WHERE type IS NULL;
UPDATE proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE proxies SET current_users = 0 WHERE current_users IS NULL;
UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;
UPDATE proxies SET source = 'Manual' WHERE source IS NULL;

-- Thêm dữ liệu mẫu cho proxy_plans
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type) VALUES
('Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 thiết bị', 10000, 30, 1, 'mtproto'),
('Gói HTTP Cơ Bản', 'Proxy HTTP cho 1 người dùng', 30000, 30, 1, 'http'),
('Gói SOCKS5 Cơ Bản', 'Proxy SOCKS5 cho 1 người dùng', 40000, 30, 1, 'socks5'),
('Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 thiết bị', 120000, 30, 3, 'mtproto'),
('Gói Premium', 'Proxy MTProto không giới hạn thiết bị', 200000, 30, 999, 'mtproto')
ON CONFLICT (name) DO NOTHING;
