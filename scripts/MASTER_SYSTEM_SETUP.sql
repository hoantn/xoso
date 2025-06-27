-- =======================================================
-- MASTER SCRIPT KHÔI PHỤC HỆ THỐNG DATABASE
-- Script này thực hiện toàn bộ cấu hình cần thiết
-- để hệ thống hoạt động ổn định
-- =======================================================

-- Bắt đầu transaction
BEGIN;

-- 1. XÓA CÁC TRIGGER VÀ FUNCTION CÓ VẤN ĐỀ
DROP TRIGGER IF EXISTS ensure_last_sign_in_not_null ON users;
DROP FUNCTION IF EXISTS auth.set_last_sign_in_default() CASCADE;

-- 2. XÓA TẤT CẢ CÁC FUNCTION CŨ ĐỂ TẠO LẠI
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID) CASCADE;

-- 3. TẠO BẢO USERS NẾU CHƯA TỒN TẠI
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

-- 4. THÊM CÁC CỘT THIẾU VÀO BẢNG USERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'balance') THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC(15, 2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Xóa cột last_sign_in nếu có (không cần thiết)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_sign_in') THEN
        ALTER TABLE users DROP COLUMN last_sign_in;
    END IF;
END $$;

-- 5. TẮT ROW LEVEL SECURITY TRÊN BẢNG USERS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 6. XÓA TẤT CẢ POLICIES TRÊN BẢNG USERS
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(policy_record.policyname) || ' ON users';
    END LOOP;
END $$;

-- 7. TẠO BẢO PROXIES NẾU CHƯA TỒN TẠI
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. THÊM CÁC CỘT THIẾU VÀO BẢNG PROXIES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'user_id') THEN
        ALTER TABLE proxies ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
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
END $$;

-- 9. TẮT ROW LEVEL SECURITY TRÊN BẢNG PROXIES
ALTER TABLE proxies DISABLE ROW LEVEL SECURITY;

-- 10. TẠO BẢNG PROXY_PLANS
CREATE TABLE IF NOT EXISTS proxy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_connections INTEGER DEFAULT 1,
  proxy_type VARCHAR(20) NOT NULL DEFAULT 'mtproto', -- Đã thêm NOT NULL và DEFAULT
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. THÊM CÁC CỘT THIẾU VÀO BẢNG PROXY_PLANS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_plans' AND column_name = 'max_connections') THEN
        ALTER TABLE proxy_plans ADD COLUMN max_connections INTEGER DEFAULT 1;
    END IF;
    -- Thêm cột proxy_type nếu chưa tồn tại và đặt giá trị mặc định
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_plans' AND column_name = 'proxy_type') THEN
        ALTER TABLE proxy_plans ADD COLUMN proxy_type VARCHAR(20) NOT NULL DEFAULT 'mtproto';
    END IF;
END $$;

-- 12. TẠO BẢNG PROXY_ORDERS
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

-- 13. THÊM CÁC CỘT THIẾU VÀO BẢNG PROXY_ORDERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_orders' AND column_name = 'plan_id') THEN
        ALTER TABLE proxy_orders ADD COLUMN plan_id UUID REFERENCES proxy_plans(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_orders' AND column_name = 'price') THEN
        ALTER TABLE proxy_orders ADD COLUMN price DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxy_orders' AND column_name = 'expires_at') THEN
        ALTER TABLE proxy_orders ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 14. TẠO BẢNG TRANSACTIONS
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

-- 15. THÊM CÁC CỘT THIẾU VÀO BẢNG TRANSACTIONS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'created_by') THEN
        ALTER TABLE transactions ADD COLUMN created_by UUID REFERENCES users(id);
    END IF;
END $$;

-- 16. TẠO BẢNG DEPOSIT_REQUESTS
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

-- 17. TẠO BẢNG BANK_ACCOUNTS
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

-- 18. TẠO FUNCTION UPDATE_UPDATED_AT_COLUMN
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 19. TẠO TRIGGERS CHO UPDATE_UPDATED_AT_COLUMN
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

-- 20. TẠO CÁC INDEX CẦN THIẾT
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_proxies_user_id ON proxies(user_id);
CREATE INDEX IF NOT EXISTS idx_proxies_visibility ON proxies(visibility);
CREATE INDEX IF NOT EXISTS idx_proxy_plans_is_active ON proxy_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_user_id ON proxy_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_proxy_id ON proxy_orders(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_status ON proxy_orders(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);

-- 21. TẠO FUNCTION PURCHASE_PROXY_PLAN
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
    AND (id NOT IN (SELECT proxy_id FROM proxy_orders WHERE status = 'active' AND proxy_id IS NOT NULL) OR id IS NULL)
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
    INSERT INTO transactions (
        user_id, 
        type, 
        amount, 
        description, 
        status, 
        balance_before, 
        balance_after,
        reference_id
    )
    VALUES (
        p_user_id, 
        'purchase', 
        -v_plan.price, 
        'Mua gói proxy: ' || v_plan.name, 
        'completed', 
        v_user_balance, 
        v_user_balance - v_plan.price,
        v_order_id
    );
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Mua proxy thành công',
        'order_id', v_order_id,
        'proxy_id', v_proxy_id,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- 22. CẬP NHẬT GIÁ TRỊ MẶC ĐỊNH CHO CÁC CỘT NULL
UPDATE users SET balance = 0 WHERE balance IS NULL;
UPDATE proxies SET type = 'mtproto' WHERE type IS NULL;
UPDATE proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE proxies SET current_users = 0 WHERE current_users IS NULL;
UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;
UPDATE proxies SET source = 'Manual' WHERE source IS NULL;

-- 23. THÊM ADMIN ACCOUNT NẾU CHƯA CÓ
INSERT INTO users (username, password_hash, role, full_name, balance)
VALUES 
    ('admin', '$2a$10$2fv5JgzZ/HeQ07B8wD65Qecb22FbhxT22JmO/sYr5BsjnVS5Z.J72', 'admin', 'Administrator', 999999),
    ('superadmin', '$2a$10$2fv5JgzZ/HeQ07B8wD65Qecb22FbhxT22JmO/sYr5BsjnVS5Z.J72', 'super_admin', 'Super Administrator', 999999)
ON CONFLICT (username) DO NOTHING;

-- 24. THÊM PROXY PLANS MẪU NẾU CHƯA CÓ
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type) -- Đã thêm proxy_type
SELECT 'Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 thiết bị', 50000, 30, 1, 'mtproto'
WHERE NOT EXISTS (SELECT 1 FROM proxy_plans WHERE name = 'Gói Cơ Bản');

INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type) -- Đã thêm proxy_type
SELECT 'Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 thiết bị', 120000, 30, 3, 'mtproto'
WHERE NOT EXISTS (SELECT 1 FROM proxy_plans WHERE name = 'Gói Tiêu Chuẩn');

INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type) -- Đã thêm proxy_type
SELECT 'Gói Premium', 'Proxy MTProto không giới hạn thiết bị', 200000, 30, 999, 'mtproto'
WHERE NOT EXISTS (SELECT 1 FROM proxy_plans WHERE name = 'Gói Premium');

-- COMMIT TRANSACTION
COMMIT;

-- THÔNG BÁO HOÀN THÀNH
SELECT 'Hệ thống database đã được cấu hình thành công!' AS message;
SELECT 'Username: admin / Password: admin123' AS admin_account;
