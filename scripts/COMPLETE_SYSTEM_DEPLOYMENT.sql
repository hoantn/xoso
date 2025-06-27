-- =====================================================
-- SCRIPT TRIỂN KHAI HỆ THỐNG HOÀN CHỈNH
-- Phiên bản cập nhật với tính năng thêm proxy đã hoàn thiện
-- =====================================================

-- Bắt đầu transaction để đảm bảo tính nhất quán
BEGIN;

-- 1. Tạo bảng users nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  full_name VARCHAR(100),
  balance NUMERIC(15, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng proxies với cấu trúc đầy đủ
CREATE TABLE IF NOT EXISTS proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL, -- URL đầy đủ của proxy
  server VARCHAR(255), -- Host/IP của proxy
  port INTEGER, -- Port của proxy
  username VARCHAR(255), -- Username cho auth (nếu có)
  password VARCHAR(255), -- Password cho auth (nếu có)
  secret VARCHAR(255), -- Secret cho MTProto
  type VARCHAR(20) DEFAULT 'mtproto' CHECK (type IN ('mtproto', 'socks5', 'http', 'https')),
  description TEXT, -- Mô tả proxy
  notes TEXT, -- Ghi chú thêm
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  max_users INTEGER DEFAULT 1,
  current_users INTEGER DEFAULT 0,
  source VARCHAR(100) DEFAULT 'Manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo bảng proxy_plans
CREATE TABLE IF NOT EXISTS proxy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_connections INTEGER DEFAULT 1,
  proxy_type VARCHAR(20) DEFAULT 'mtproto',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo bảng proxy_orders
CREATE TABLE IF NOT EXISTS proxy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES proxy_plans(id),
  proxy_id UUID REFERENCES proxies(id),
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tạo bảng transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  balance_before NUMERIC(15, 2) NOT NULL,
  balance_after NUMERIC(15, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tạo bảng deposit_requests
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  transaction_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  payment_info_snapshot JSONB,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tạo bảng bank_accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  qr_template TEXT NOT NULL DEFAULT 'compact2',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tạo bảng proxy_usage_stats
CREATE TABLE IF NOT EXISTS proxy_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proxy_id UUID NOT NULL REFERENCES proxies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bytes_sent BIGINT DEFAULT 0,
  bytes_received BIGINT DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tạo các index cần thiết
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_proxies_user_id ON proxies(user_id);
CREATE INDEX IF NOT EXISTS idx_proxies_visibility ON proxies(visibility);
CREATE INDEX IF NOT EXISTS idx_proxies_is_active ON proxies(is_active);
CREATE INDEX IF NOT EXISTS idx_proxies_type ON proxies(type);

CREATE INDEX IF NOT EXISTS idx_proxy_plans_is_active ON proxy_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_plans_price ON proxy_plans(price);

CREATE INDEX IF NOT EXISTS idx_proxy_orders_user_id ON proxy_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_proxy_id ON proxy_orders(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_status ON proxy_orders(status);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_expires_at ON proxy_orders(expires_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);

-- 10. Tạo function update_updated_at_column
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. Tạo các trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxies_updated_at ON proxies;
CREATE TRIGGER update_proxies_updated_at BEFORE UPDATE ON proxies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxy_plans_updated_at ON proxy_plans;
CREATE TRIGGER update_proxy_plans_updated_at BEFORE UPDATE ON proxy_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxy_orders_updated_at ON proxy_orders;
CREATE TRIGGER update_proxy_orders_updated_at BEFORE UPDATE ON proxy_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deposit_requests_updated_at ON deposit_requests;
CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON deposit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Tạo function purchase_proxy_plan
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);
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
BEGIN
    -- Lấy thông tin gói
    SELECT * INTO v_plan FROM proxy_plans WHERE id = p_plan_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Gói proxy không tồn tại hoặc đã bị vô hiệu hóa'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Kiểm tra số dư từ bảng users
    SELECT balance INTO v_user_balance FROM users WHERE id = p_user_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    IF v_user_balance < v_plan.price THEN
        RETURN QUERY SELECT false, 'Số dư không đủ để mua gói proxy này'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Tìm proxy khả dụng
    SELECT id INTO v_proxy_id 
    FROM proxies 
    WHERE is_active = true 
    AND visibility = 'public'
    AND id NOT IN (
        SELECT proxy_id 
        FROM proxy_orders 
        WHERE status = 'active' 
        AND proxy_id IS NOT NULL 
        AND expires_at > NOW()
    )
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Hiện tại không có proxy khả dụng. Vui lòng thử lại sau'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Tính ngày hết hạn
    v_expires_at := NOW() + INTERVAL '1 day' * v_plan.duration_days;
    
    -- Tạo đơn hàng
    INSERT INTO proxy_orders (user_id, plan_id, proxy_id, price, expires_at, status)
    VALUES (p_user_id, p_plan_id, v_proxy_id, v_plan.price, v_expires_at, 'active')
    RETURNING id INTO v_order_id;
    
    -- Trừ tiền từ bảng users
    UPDATE users SET balance = balance - v_plan.price WHERE id = p_user_id;
    
    -- Tạo giao dịch
    INSERT INTO transactions (user_id, type, amount, description, status, balance_before, balance_after, reference_id)
    VALUES (
        p_user_id, 
        'proxy_purchase', 
        -v_plan.price, 
        'Mua gói proxy: ' || v_plan.name || ' (Thời hạn: ' || v_plan.duration_days || ' ngày)', 
        'completed', 
        v_user_balance, 
        v_user_balance - v_plan.price,
        v_order_id
    );
    
    RETURN QUERY SELECT true, 'Mua proxy thành công!'::TEXT, v_order_id, v_proxy_id, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- 13. Tạo dữ liệu mẫu cho proxy_plans
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type, is_active)
VALUES 
    ('Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 kết nối', 50000, 30, 1, 'mtproto', true),
    ('Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 kết nối đồng thời', 120000, 30, 3, 'mtproto', true),
    ('Gói Premium', 'Proxy MTProto không giới hạn kết nối', 200000, 30, 999, 'mtproto', true),
    ('Gói 3 Tháng', 'Proxy MTProto 3 tháng với giá ưu đãi', 400000, 90, 5, 'mtproto', true),
    ('Gói 6 Tháng', 'Proxy MTProto 6 tháng tiết kiệm nhất', 700000, 180, 10, 'mtproto', true)
ON CONFLICT DO NOTHING;

-- 14. Tạo tài khoản admin mặc định (nếu chưa có)
INSERT INTO users (username, password_hash, role, full_name, balance, is_active)
VALUES (
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'super_admin',
    'System Administrator',
    0,
    true
)
ON CONFLICT (username) DO NOTHING;

-- 15. Tạo bank account mẫu
INSERT INTO bank_accounts (bank_id, bank_name, account_number, account_name, qr_template, is_active)
VALUES (
    'VCB',
    'Vietcombank',
    '1234567890',
    'NGUYEN VAN A',
    'compact2',
    true
)
ON CONFLICT (account_number) DO NOTHING;

-- Commit transaction
COMMIT;

-- Thông báo hoàn thành
SELECT 'Hệ thống đã được triển khai thành công!' AS message;
