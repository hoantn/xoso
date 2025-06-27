-- =====================================================
-- KHÔI PHỤC DATABASE CHO PHIÊN BẢN V241 (FIXED)
-- Script này sẽ tái tạo lại database theo đúng cấu trúc
-- mà code v241 đang sử dụng - Xử lý các object đã tồn tại
-- =====================================================

-- 1. Tạo bảng users (bảng chính cho người dùng)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  full_name VARCHAR(100),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00, -- Số dư tài khoản
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho bảng users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Tạo bảng proxies nếu chưa có
CREATE TABLE IF NOT EXISTS proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  secret VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'public',
  type VARCHAR(20) DEFAULT 'mtproto',
  max_users INTEGER DEFAULT 1,
  current_users INTEGER DEFAULT 0,
  source VARCHAR(100) DEFAULT 'Manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thêm các cột cho bảng proxies nếu chưa có
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'mtproto';
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1;
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS current_users INTEGER DEFAULT 0;
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS source VARCHAR(100) DEFAULT 'Manual';
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE proxies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Tạo bảng deposit_requests
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

-- 4. Tạo bảng bank_accounts
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Tạo bảng proxy_plans
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

-- 7. Tạo bảng proxy_orders
CREATE TABLE IF NOT EXISTS proxy_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id), -- Sử dụng users thay vì user_profiles
    plan_id UUID NOT NULL REFERENCES proxy_plans(id),
    proxy_id UUID REFERENCES proxies(id),
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tạo các index cần thiết
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proxies_user_id ON proxies(user_id);

-- 9. Tạo function update_updated_at_column (xóa trước nếu đã tồn tại)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Xóa và tạo lại các trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
DROP TRIGGER IF EXISTS update_proxies_updated_at ON proxies;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxies_updated_at BEFORE UPDATE ON proxies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Thêm admin accounts mặc định (chỉ thêm nếu chưa có)
INSERT INTO users (id, username, password_hash, role, full_name, balance) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', '$2a$10$rQJ5qJZvQJ5qJZvQJ5qJZuO', 'admin', 'Administrator', 0),
  ('00000000-0000-0000-0000-000000000002', 'superadmin', '$2a$10$rQJ5qJZvQJ5qJZvQJ5qJZuO', 'super_admin', 'Super Administrator', 0)
ON CONFLICT (id) DO NOTHING;

-- 12. Thêm dữ liệu mẫu cho proxy_plans (chỉ thêm nếu chưa có)
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections) VALUES
('Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 thiết bị', 50000, 30, 1),
('Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 thiết bị', 120000, 30, 3),
('Gói Premium', 'Proxy MTProto không giới hạn thiết bị', 200000, 30, 999)
ON CONFLICT DO NOTHING;

-- 13. Xóa và tạo lại function purchase_proxy_plan
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);
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
    
    -- Kiểm tra số dư từ bảng users
    SELECT balance INTO v_user_balance FROM users WHERE id = p_user_id;
    IF v_user_balance < v_plan.price THEN
        RETURN json_build_object('success', false, 'message', 'Số dư không đủ');
    END IF;
    
    -- Tìm proxy khả dụng
    SELECT id INTO v_proxy_id 
    FROM proxies 
    WHERE is_active = true 
    AND visibility = 'public'
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
    
    -- Trừ tiền từ bảng users
    UPDATE users SET balance = balance - v_plan.price WHERE id = p_user_id;
    
    -- Tạo giao dịch
    INSERT INTO transactions (user_id, type, amount, description, status, balance_before, balance_after)
    VALUES (p_user_id, 'purchase', -v_plan.price, 'Mua gói proxy: ' || v_plan.name, 'completed', v_user_balance, v_user_balance - v_plan.price);
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Mua proxy thành công',
        'order_id', v_order_id,
        'proxy_id', v_proxy_id,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- 14. Cập nhật giá trị mặc định cho các cột có thể null
UPDATE users SET balance = 0 WHERE balance IS NULL;
UPDATE proxies SET type = 'mtproto' WHERE type IS NULL;
UPDATE proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE proxies SET current_users = 0 WHERE current_users IS NULL;
UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;
UPDATE proxies SET source = 'Manual' WHERE source IS NULL;

-- 15. Thông báo hoàn thành
SELECT 'Database đã được khôi phục thành công cho phiên bản v241!' AS message;
