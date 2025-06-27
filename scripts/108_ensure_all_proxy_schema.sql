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

-- Đảm bảo bảng proxy_plans tồn tại và có đủ các cột
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

-- Thêm ràng buộc UNIQUE cho cột 'name' trong proxy_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proxy_plans_name_key' AND conrelid = 'proxy_plans'::regclass) THEN
        ALTER TABLE proxy_plans ADD CONSTRAINT proxy_plans_name_key UNIQUE (name);
        RAISE NOTICE 'Đã thêm ràng buộc UNIQUE cho cột name trong bảng proxy_plans';
    ELSE
        RAISE NOTICE 'Ràng buộc UNIQUE cho cột name đã tồn tại trong bảng proxy_plans';
    END IF;
END
$$;

-- Đảm bảo bảng proxy_orders tồn tại và có đủ các cột
CREATE TABLE IF NOT EXISTS proxy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id), -- Đảm bảo tham chiếu đến bảng users
    plan_id UUID REFERENCES proxy_plans(id),
    proxy_id UUID REFERENCES proxies(id),
    unit_price DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL, -- Đã thêm cột 'total_amount'
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Xử lý đổi tên cột 'price' thành 'unit_price' nếu 'price' đã tồn tại
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='price') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='unit_price') THEN
            ALTER TABLE proxy_orders RENAME COLUMN price TO unit_price;
            RAISE NOTICE 'Đã đổi tên cột price thành unit_price trong bảng proxy_orders';
        ELSE
            RAISE NOTICE 'Cả cột price và unit_price đều tồn tại trong proxy_orders. Vui lòng kiểm tra thủ công.';
        END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='unit_price') THEN
        RAISE NOTICE 'Cột unit_price sẽ được tạo bởi CREATE TABLE IF NOT EXISTS.';
    END IF;

    -- Thêm cột total_amount nếu chưa tồn tại
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxy_orders' AND column_name='total_amount') THEN
        ALTER TABLE proxy_orders ADD COLUMN total_amount DECIMAL(15,2) NOT NULL DEFAULT 0; -- Thêm với DEFAULT 0 để tránh lỗi NOT NULL
        RAISE NOTICE 'Đã thêm cột total_amount vào bảng proxy_orders';
    ELSE
        RAISE NOTICE 'Cột total_amount đã tồn tại trong bảng proxy_orders';
    END IF;
END
$$;

-- Đảm bảo bảng proxies có các cột cần thiết
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='type') THEN
        ALTER TABLE proxies ADD COLUMN type VARCHAR(20) DEFAULT 'mtproto'; -- Sử dụng 'type' theo yêu cầu của bạn
        RAISE NOTICE 'Đã thêm cột type vào bảng proxies';
    ELSE
        RAISE NOTICE 'Cột type đã tồn tại trong bảng proxies';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='max_users') THEN
        ALTER TABLE proxies ADD COLUMN max_users INTEGER DEFAULT 1;
        RAISE NOTICE 'Đã thêm cột max_users vào bảng proxies';
    ELSE
        RAISE NOTICE 'Cột max_users đã tồn tại trong bảng proxies';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='current_users') THEN
        ALTER TABLE proxies ADD COLUMN current_users INTEGER DEFAULT 0;
        RAISE NOTICE 'Đã thêm cột current_users vào bảng proxies';
    ELSE
        RAISE NOTICE 'Cột current_users đã tồn tại trong bảng proxies';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='visibility') THEN
        ALTER TABLE proxies ADD COLUMN visibility VARCHAR(20) DEFAULT 'public';
        RAISE NOTICE 'Đã thêm cột visibility vào bảng proxies';
    ELSE
        RAISE NOTICE 'Cột visibility đã tồn tại trong bảng proxies';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='purchased_at') THEN
        ALTER TABLE proxies ADD COLUMN purchased_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Đã thêm cột purchased_at vào bảng proxies';
    ELSE
        RAISE NOTICE 'Cột purchased_at đã tồn tại trong bảng proxies';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='created_at') THEN
        ALTER TABLE proxies ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Đã thêm cột created_at vào bảng proxies';
    ELSE
        RAISE NOTICE 'Cột created_at đã tồn tại trong bảng proxies';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='updated_at') THEN
        ALTER TABLE proxies ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Đã thêm cột updated_at vào bảng proxies';
    ELSE
        RAISE NOTICE 'Cột updated_at đã tồn tại trong bảng proxies';
    END IF;
END
$$;

-- Cập nhật giá trị mặc định cho các cột mới nếu cần
UPDATE proxies SET type = 'mtproto' WHERE type IS NULL;
UPDATE proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE proxies SET current_users = 0 WHERE current_users IS NULL;
UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;

-- Cập nhật giá trị mặc định cho các cột mới trong proxy_orders nếu cần
UPDATE proxy_orders SET unit_price = 0 WHERE unit_price IS NULL;
UPDATE proxy_orders SET total_amount = 0 WHERE total_amount IS NULL; -- Cập nhật giá trị mặc định cho total_amount
UPDATE proxy_orders SET status = 'active' WHERE status IS NULL;
UPDATE proxy_orders SET created_at = NOW() WHERE created_at IS NULL;
UPDATE proxy_orders SET updated_at = NOW() WHERE updated_at IS NULL;

-- Thêm dữ liệu mẫu cho proxy_plans nếu chưa có
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type) VALUES
('Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 thiết bị', 50000, 30, 1, 'mtproto'),
('Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 thiết bị', 120000, 30, 3, 'mtproto'),
('Gói Premium', 'Proxy MTProto không giới hạn thiết bị', 200000, 30, 999, 'mtproto'),
('Gói SOCKS5 Cơ Bản', 'Proxy SOCKS5 cho 1 người dùng', 40000, 30, 1, 'socks5'),
('Gói HTTP Cơ Bản', 'Proxy HTTP cho 1 người dùng', 30000, 30, 1, 'http')
ON CONFLICT (name) DO NOTHING; -- Tránh lỗi khi chạy lại
