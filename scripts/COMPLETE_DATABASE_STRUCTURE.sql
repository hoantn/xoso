-- =====================================================
-- TẠO CẤU TRÚC DATABASE ĐẦY ĐỦ
-- Script này sẽ tạo các bảng, cột, index, function cần thiết
-- mà không làm ảnh hưởng đến dữ liệu hiện có
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

-- 2. Tạo bảng proxies nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host VARCHAR(255),
  port INTEGER,
  secret VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'public',
  type VARCHAR(20) DEFAULT 'mtproto',
  max_users INTEGER DEFAULT 1,
  current_users INTEGER DEFAULT 0,
  source VARCHAR(100) DEFAULT 'Manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo bảng deposit_requests nếu chưa tồn tại
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

-- 4. Tạo bảng bank_accounts nếu chưa tồn tại
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

-- 5. Tạo bảng transactions nếu chưa tồn tại
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

-- 6. Tạo bảng proxy_plans nếu chưa tồn tại
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

-- 7. Tạo bảng proxy_orders nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS proxy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES proxy_plans(id),
  proxy_id UUID REFERENCES proxies(id),
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tạo bảng proxy_usage_stats nếu chưa tồn tại
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

-- 9. Thêm các cột vào bảng nếu chưa tồn tại
DO $$
BEGIN
    -- Thêm cột balance vào bảng users nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'balance') THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC(15, 2) DEFAULT 0.00;
    END IF;

    -- Thêm cột created_by vào bảng transactions nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'created_by') THEN
        ALTER TABLE transactions ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;

    -- Thêm các cột vào bảng proxies nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'visibility') THEN
        ALTER TABLE proxies ADD COLUMN visibility VARCHAR(20) DEFAULT 'public';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'type') THEN
        ALTER TABLE proxies ADD COLUMN type VARCHAR(20) DEFAULT 'mtproto';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'max_users') THEN
        ALTER TABLE proxies ADD COLUMN max_users INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'current_users') THEN
        ALTER TABLE proxies ADD COLUMN current_users INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'source') THEN
        ALTER TABLE proxies ADD COLUMN source VARCHAR(100) DEFAULT 'Manual';
    END IF;

    -- Thêm cột plan_id vào bảng proxy_orders nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_orders' AND column_name = 'plan_id') THEN
        ALTER TABLE proxy_orders ADD COLUMN plan_id UUID REFERENCES proxy_plans(id);
    END IF;

    -- Thêm cột price vào bảng proxy_orders nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_orders' AND column_name = 'price') THEN
        ALTER TABLE proxy_orders ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Thêm cột expires_at vào bảng proxy_orders nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_orders' AND column_name = 'expires_at') THEN
        ALTER TABLE proxy_orders ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;

    -- Thêm cột max_connections vào bảng proxy_plans nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_plans' AND column_name = 'max_connections') THEN
        ALTER TABLE proxy_plans ADD COLUMN max_connections INTEGER DEFAULT 1;
    END IF;
END $$;

-- 10. Tạo các index cần thiết
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_proxies_user_id ON proxies(user_id);
CREATE INDEX IF NOT EXISTS idx_proxies_visibility ON proxies(visibility);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_user_id ON proxy_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_proxy_id ON proxy_orders(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_status ON proxy_orders(status);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_proxy_id ON proxy_usage_stats(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_user_id ON proxy_usage_stats(user_id);

-- 11. Tạo function update_updated_at_column (xóa trước nếu đã tồn tại)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Xóa và tạo lại các trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxies_updated_at ON proxies;
CREATE TRIGGER update_proxies_updated_at BEFORE UPDATE ON proxies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deposit_requests_updated_at ON deposit_requests;
CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON deposit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxy_plans_updated_at ON proxy_plans;
CREATE TRIGGER update_proxy_plans_updated_at BEFORE UPDATE ON proxy_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxy_orders_updated_at ON proxy_orders;
CREATE TRIGGER update_proxy_orders_updated_at BEFORE UPDATE ON proxy_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proxy_usage_stats_updated_at ON proxy_usage_stats;
CREATE TRIGGER update_proxy_usage_stats_updated_at BEFORE UPDATE ON proxy_usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. Tạo function purchase_proxy_plan (xóa trước nếu đã tồn tại)
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

-- Commit transaction
COMMIT;

-- Thông báo hoàn thành
SELECT 'Cấu trúc database đã được tạo đầy đủ!' AS message;
