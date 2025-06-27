-- =====================================================
-- SCRIPT TOÀN DIỆN: TẠO LẠI HOÀN CHỈNH HỆ THỐNG PROXY
-- =====================================================

-- Đảm bảo bảng users có cột balance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='balance') THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC(15,2) DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột balance vào bảng users';
    ELSE
        RAISE NOTICE 'Cột balance đã tồn tại trong bảng users';
    END IF;
END
$$;

-- Tạo/cập nhật bảng proxy_plans
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

-- Thêm ràng buộc UNIQUE cho proxy_plans.name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proxy_plans_name_key') THEN
        ALTER TABLE proxy_plans ADD CONSTRAINT proxy_plans_name_key UNIQUE (name);
        RAISE NOTICE 'Đã thêm ràng buộc UNIQUE cho proxy_plans.name';
    END IF;
END
$$;

-- Tạo/cập nhật bảng proxy_orders với TẤT CẢ các cột cần thiết
CREATE TABLE IF NOT EXISTS proxy_orders (
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

-- Thêm các cột bị thiếu vào proxy_orders nếu chưa có
DO $$
BEGIN
    -- Thêm unit_price
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='unit_price') THEN
        ALTER TABLE proxy_orders ADD COLUMN unit_price DECIMAL(15,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột unit_price vào proxy_orders';
    END IF;
    
    -- Thêm total_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='total_amount') THEN
        ALTER TABLE proxy_orders ADD COLUMN total_amount DECIMAL(15,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột total_amount vào proxy_orders';
    END IF;
    
    -- Thêm duration_days
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='duration_days') THEN
        ALTER TABLE proxy_orders ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 30;
        RAISE NOTICE 'Đã thêm cột duration_days vào proxy_orders';
    END IF;
    
    -- Thêm plan_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='plan_id') THEN
        ALTER TABLE proxy_orders ADD COLUMN plan_id UUID REFERENCES proxy_plans(id);
        RAISE NOTICE 'Đã thêm cột plan_id vào proxy_orders';
    END IF;
    
    -- Thêm expires_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='expires_at') THEN
        ALTER TABLE proxy_orders ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Đã thêm cột expires_at vào proxy_orders';
    END IF;
    
    -- Thêm status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='status') THEN
        ALTER TABLE proxy_orders ADD COLUMN status VARCHAR(20) DEFAULT 'active';
        RAISE NOTICE 'Đã thêm cột status vào proxy_orders';
    END IF;
END
$$;

-- Đảm bảo bảng proxies có các cột cần thiết
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='type') THEN
        ALTER TABLE proxies ADD COLUMN type VARCHAR(20) DEFAULT 'mtproto';
        RAISE NOTICE 'Đã thêm cột type vào proxies';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='max_users') THEN
        ALTER TABLE proxies ADD COLUMN max_users INTEGER DEFAULT 1;
        RAISE NOTICE 'Đã thêm cột max_users vào proxies';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='current_users') THEN
        ALTER TABLE proxies ADD COLUMN current_users INTEGER DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột current_users vào proxies';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='visibility') THEN
        ALTER TABLE proxies ADD COLUMN visibility VARCHAR(20) DEFAULT 'public';
        RAISE NOTICE 'Đã thêm cột visibility vào proxies';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='created_at') THEN
        ALTER TABLE proxies ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Đã thêm cột created_at vào proxies';
    END IF;
END
$$;

-- Cập nhật giá trị mặc định cho các cột NULL
UPDATE users SET balance = 0 WHERE balance IS NULL;
UPDATE proxies SET type = 'mtproto' WHERE type IS NULL;
UPDATE proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE proxies SET current_users = 0 WHERE current_users IS NULL;
UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;
UPDATE proxy_orders SET unit_price = 0 WHERE unit_price IS NULL;
UPDATE proxy_orders SET total_amount = 0 WHERE total_amount IS NULL;
UPDATE proxy_orders SET duration_days = 30 WHERE duration_days IS NULL;
UPDATE proxy_orders SET status = 'active' WHERE status IS NULL;

-- Thêm dữ liệu mẫu cho proxy_plans
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type) VALUES
('Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 thiết bị', 10000, 30, 1, 'mtproto'),
('Gói HTTP Cơ Bản', 'Proxy HTTP cho 1 người dùng', 30000, 30, 1, 'http'),
('Gói SOCKS5 Cơ Bản', 'Proxy SOCKS5 cho 1 người dùng', 40000, 30, 1, 'socks5'),
('Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 thiết bị', 120000, 30, 3, 'mtproto'),
('Gói Premium', 'Proxy MTProto không giới hạn thiết bị', 200000, 30, 999, 'mtproto')
ON CONFLICT (name) DO NOTHING;

RAISE NOTICE 'Hoàn thành việc tạo/cập nhật schema cho hệ thống proxy';
