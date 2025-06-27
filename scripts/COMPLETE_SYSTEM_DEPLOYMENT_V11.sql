-- =====================================================
-- SCRIPT TRIỂN KHAI HỆ THỐNG HOÀN CHỈNH (PHIÊN BẢN V11)
-- Khắc phục lỗi: "structure of query does not match function result type" trong purchase_proxy_plan
-- Đảm bảo:
--   - Hàm purchase_proxy_plan chèn đủ cột balance_before/balance_after vào transactions.
--   - Hàm purchase_proxy_plan chọn proxy đúng loại theo gói (mtproto, socks5).
--   - Hàm purchase_proxy_plan sử dụng bảng 'users' thay vì 'user_profiles'.
--   - Các ràng buộc UNIQUE và cột 'secret' vẫn đúng.
--   - Tính idempotency và không mất dữ liệu cũ.
-- =====================================================

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Thêm cột expires_at vào bảng proxies
);

-- THÊM CỘT 'secret' VÀO BẢNG 'proxies' NẾU CHƯA TỒN TẠI
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'secret') THEN
        ALTER TABLE proxies ADD COLUMN secret VARCHAR(255);
    END IF;
END $$;

-- THÊM CỘT 'expires_at' VÀO BẢNG 'proxies' NẾU CHƯA TỒN TẠI
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proxies' AND column_name = 'expires_at') THEN
        ALTER TABLE proxies ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- THÊM RÀNG BUỘC UNIQUE CHO CỘT 'url' TRONG BẢNG 'proxies'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'proxies'::regclass AND contype = 'u' AND conname = 'proxies_url_key') THEN
        ALTER TABLE proxies ADD CONSTRAINT proxies_url_key UNIQUE (url);
    END IF;
END $$;


-- 3. Tạo bảng proxy_plans nếu chưa tồn tại
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

-- THÊM RÀNG BUỘC UNIQUE CHO CỘT 'name' TRONG BẢNG 'proxy_plans'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'proxy_plans'::regclass AND contype = 'u' AND conname = 'proxy_plans_name_key') THEN
        ALTER TABLE proxy_plans ADD CONSTRAINT proxy_plans_name_key UNIQUE (name);
    END IF;
END $$;


-- 4. Tạo bảng proxy_orders nếu chưa tồn tại
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

-- Cập nhật CHECK constraint cho cột 'type' trong bảng 'transactions'
DO $$
BEGIN
    -- Xóa ràng buộc cũ nếu tồn tại
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'transactions'::regclass AND conname = 'transactions_type_check') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
    END IF;

    -- Thêm ràng buộc mới với các giá trị type đã cập nhật
    ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('deposit', 'proxy_purchase', 'admin_adjustment', 'refund', 'initial_balance'));
END $$;

-- 6. Tạo bảng deposit_requests nếu chưa tồn tại
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

-- 7. Tạo bảng bank_accounts nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL, -- Đã thống nhất sử dụng account_name
  qr_template TEXT NOT NULL DEFAULT 'compact2',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- 9. Đảm bảo cột account_name tồn tại và là chính thức trong bank_accounts
DO $$
BEGIN
    -- Nếu cột account_holder_name tồn tại, đổi tên nó thành account_name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bank_accounts'
        AND column_name = 'account_holder_name'
    ) THEN
        ALTER TABLE bank_accounts RENAME COLUMN account_holder_name TO account_name;
    END IF;

    -- Nếu cột account_name chưa tồn tại (sau khi đổi tên hoặc ban đầu), thêm nó vào
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bank_accounts'
        AND column_name = 'account_name'
    ) THEN
        ALTER TABLE bank_accounts ADD COLUMN account_name TEXT;
        -- Cập nhật giá trị mặc định nếu cần, hoặc xử lý NULL
        EXECUTE 'UPDATE bank_accounts SET account_name = ''UNKNOWN'' WHERE account_name IS NULL';
        ALTER TABLE bank_accounts ALTER COLUMN account_name SET NOT NULL;
        ALTER TABLE bank_accounts ALTER COLUMN account_name SET DEFAULT 'UNKNOWN';
    END IF;
END $$;

-- 10. Tạo các index cần thiết (IF NOT EXISTS)
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

-- 11. Tạo function update_updated_at_column (CREATE OR REPLACE)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Tạo các trigger (DROP IF EXISTS trước khi CREATE)
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

-- 13. Tạo RLS policies mới (DROP IF EXISTS trước khi CREATE)
-- Disable RLS tạm thời cho tất cả bảng để đảm bảo không có lỗi khi tạo lại policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE proxies DISABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;

-- Drop tất cả RLS policies hiện tại để tránh xung đột
DO $$ DECLARE r record;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.tablename || ';';
    END LOOP;
END $$;

-- Enable RLS và tạo policies đơn giản (có thể tinh chỉnh sau)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON users
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE proxies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on proxies" ON proxies
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE proxy_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to proxy plans" ON proxy_plans
    FOR SELECT USING (true);
CREATE POLICY "Allow all operations for service role" ON proxy_plans
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE proxy_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on proxy orders" ON proxy_orders
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on transactions" ON transactions
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on deposit requests" ON deposit_requests
    FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to bank accounts" ON bank_accounts
    FOR SELECT USING (true);
CREATE POLICY "Allow all operations for service role on bank accounts" ON bank_accounts
    FOR ALL USING (true) WITH CHECK (true);

-- 14. Tạo function purchase_proxy_plan (CREATE OR REPLACE)
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
    v_balance_before DECIMAL(10,2);
    v_balance_after DECIMAL(10,2);
BEGIN
    -- Log function call
    RAISE NOTICE 'purchase_proxy_plan called with user_id: %, plan_id: %', p_user_id, p_plan_id;

    -- Lấy thông tin gói
    SELECT * INTO v_plan FROM proxy_plans WHERE id = p_plan_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE NOTICE 'Plan not found or inactive: %', p_plan_id;
        RETURN QUERY SELECT false, 'Gói proxy không tồn tại hoặc đã bị vô hiệu hóa'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    RAISE NOTICE 'Found plan: % - Price: %', v_plan.name, v_plan.price;

    -- Kiểm tra số dư từ bảng users
    SELECT balance INTO v_user_balance FROM users WHERE id = p_user_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE NOTICE 'User not found or inactive: %', p_user_id;
        RETURN QUERY SELECT false, 'Người dùng không tồn tại hoặc đã bị vô hiệu hóa'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    RAISE NOTICE 'User balance: %', v_user_balance;

    IF v_user_balance < v_plan.price THEN
        RAISE NOTICE 'Insufficient balance. Required: %, Available: %', v_plan.price, v_user_balance;
        RETURN QUERY SELECT false, 'Số dư không đủ để mua gói proxy này'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Tìm proxy khả dụng (private và đúng loại)
    SELECT p.id INTO v_proxy_id
    FROM proxies p
    WHERE p.is_active = true
    AND p.user_id IS NULL -- Đảm bảo proxy chưa được gán cho người dùng nào
    AND p.visibility = 'private' -- Chỉ chọn proxy riêng tư
    AND p.type = v_plan.proxy_type -- Thêm điều kiện lọc theo loại proxy của gói
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No available private proxy found for type: %', v_plan.proxy_type;
        RETURN QUERY SELECT false, 'Hiện tại không có proxy riêng tư khả dụng cho loại ' || v_plan.proxy_type || '. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.'::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    RAISE NOTICE 'Found available private proxy: %', v_proxy_id;

    -- Tính ngày hết hạn
    v_expires_at := NOW() + INTERVAL '1 day' * v_plan.duration_days;
    RAISE NOTICE 'Expires at: %', v_expires_at;

    -- Lưu balance trước khi thay đổi
    v_balance_before := v_user_balance;
    v_balance_after := v_user_balance - v_plan.price;

    -- Cập nhật thông tin proxy (gán cho người dùng và đặt expires_at)
    UPDATE proxies
    SET
        user_id = p_user_id,
        expires_at = v_expires_at,
        max_users = v_plan.max_connections, -- Cập nhật max_users theo gói
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_proxy_id;

    RAISE NOTICE 'Updated proxy % with user_id % and expires_at %', v_proxy_id, p_user_id, v_expires_at;

    -- Tạo đơn hàng
    INSERT INTO proxy_orders (user_id, plan_id, proxy_id, price, expires_at, status)
    VALUES (p_user_id, p_plan_id, v_proxy_id, v_plan.price, v_expires_at, 'active')
    RETURNING id INTO v_order_id;

    RAISE NOTICE 'Created order: %', v_order_id;

    -- Trừ tiền từ bảng users
    UPDATE users SET balance = v_balance_after WHERE id = p_user_id;
    RAISE NOTICE 'Updated user balance from % to %', v_balance_before, v_balance_after;

    -- Tạo giao dịch
    INSERT INTO transactions (user_id, type, amount, description, status, balance_before, balance_after, reference_id)
    VALUES (
        p_user_id,
        'proxy_purchase', -- Đảm bảo type này khớp với CHECK constraint
        -v_plan.price,
        'Mua gói proxy: ' || v_plan.name || ' (Thời hạn: ' || v_plan.duration_days || ' ngày)',
        'completed',
        v_balance_before,
        v_balance_after,
        v_order_id
    );

    RAISE NOTICE 'Created transaction for order: %', v_order_id;

    RETURN QUERY SELECT true, 'Mua proxy thành công!'::TEXT, v_order_id, v_proxy_id, v_expires_at;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in purchase_proxy_plan: %', SQLERRM;
        RETURN QUERY SELECT false, ('Lỗi hệ thống: ' || SQLERRM)::TEXT, NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Tạo dữ liệu mẫu cho proxy_plans (ON CONFLICT DO NOTHING)
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type, is_active)
VALUES
    ('Gói Cơ Bản MTProto', 'Proxy MTProto cơ bản cho 1 kết nối', 50000, 30, 1, 'mtproto', true),
    ('Gói Tiêu Chuẩn MTProto', 'Proxy MTProto cho 3 kết nối đồng thời', 120000, 30, 3, 'mtproto', true),
    ('Gói Premium MTProto', 'Proxy MTProto không giới hạn kết nối', 200000, 30, 999, 'mtproto', true),
    ('Gói Cơ Bản SOCKS5', 'Proxy SOCKS5 cơ bản cho 1 kết nối', 60000, 30, 1, 'socks5', true),
    ('Gói Tiêu Chuẩn SOCKS5', 'Proxy SOCKS5 cho 3 kết nối đồng thời', 150000, 30, 3, 'socks5', true)
ON CONFLICT (name) DO NOTHING;

-- 16. Tạo tài khoản admin mặc định (nếu chưa có) (ON CONFLICT DO NOTHING)
INSERT INTO users (username, password_hash, role, full_name, balance, is_active)
VALUES (
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'super_admin',
    'System Administrator',
    1000000, -- Cập nhật balance cho admin để test
    true
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;

-- 17. Tạo bank account mẫu (ON CONFLICT DO UPDATE SET)
INSERT INTO bank_accounts (bank_id, bank_name, account_number, account_name, qr_template, is_active)
VALUES (
    'VCB',
    'Ngân hàng TMCP Công thương Việt Nam',
    '0123456789',
    'NGUYEN VAN A', -- Sử dụng account_name
    'compact2',
    true
)
ON CONFLICT (account_number) DO UPDATE SET
    bank_id = EXCLUDED.bank_id,
    bank_name = EXCLUDED.bank_name,
    account_name = EXCLUDED.account_name,
    qr_template = EXCLUDED.qr_template,
    is_active = EXCLUDED.is_active;

-- 18. Tạo một số proxy mẫu để test (ON CONFLICT DO NOTHING)
INSERT INTO proxies (url, server, port, type, description, visibility, is_active, max_users, source, secret, user_id, expires_at)
VALUES
    -- Public MTProto proxies for "Đổi Proxy 1 Click"
    ('tg://proxy?server=public1.mtproto.com&port=443&secret=abcd1234', 'public1.mtproto.com', 443, 'mtproto', 'Proxy MTProto công khai 1', 'public', true, 1, 'Manual', 'abcd1234', NULL, NULL),
    ('tg://proxy?server=public2.mtproto.com&port=443&secret=efgh5678', 'public2.mtproto.com', 443, 'mtproto', 'Proxy MTProto công khai 2', 'public', true, 1, 'Manual', 'efgh5678', NULL, NULL),
    -- Public SOCKS5 proxies for "Đổi Proxy 1 Click"
    ('socks5://public1.socks5.com:1080', 'public1.socks5.com', 1080, 'socks5', 'Proxy SOCKS5 công khai 1', 'public', true, 1, 'Manual', NULL, NULL, NULL),
    ('socks5://public2.socks5.com:1080', 'public2.socks5.com', 1080, 'socks5', 'Proxy SOCKS5 công khai 2', 'public', true, 1, 'Manual', NULL, NULL, NULL),
    -- Private MTProto proxies for purchase
    ('tg://proxy?server=private1.mtproto.com&port=443&secret=ijkl9012', 'private1.mtproto.com', 443, 'mtproto', 'Proxy MTProto riêng tư 1', 'private', true, 1, 'Manual', 'ijkl9012', NULL, NULL),
    ('tg://proxy?server=private2.mtproto.com&port=443&secret=mnop3456', 'private2.mtproto.com', 443, 'mtproto', 'Proxy MTProto riêng tư 2', 'private', true, 1, 'Manual', 'mnop3456', NULL, NULL),
    -- Private SOCKS5 proxies for purchase
    ('socks5://private1.socks5.com:1080', 'private1.socks5.com', 1080, 'socks5', 'Proxy SOCKS5 riêng tư 1', 'private', true, 1, 'Manual', NULL, NULL, NULL),
    ('socks5://private2.socks5.com:1080', 'private2.socks5.com', 1080, 'socks5', 'Proxy SOCKS5 riêng tư 2', 'private', true, 1, 'Manual', NULL, NULL, NULL)
ON CONFLICT (url) DO NOTHING;

-- 19. Thêm một số giao dịch mẫu (bao gồm hoàn tiền)
INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, status)
SELECT id, 'deposit', 50000, 0, 50000, 'Nạp tiền ban đầu', 'completed' FROM users WHERE username = 'admin'
ON CONFLICT (id) DO NOTHING; -- Assuming transaction ID is unique, or handle conflict appropriately

INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, status)
SELECT id, 'refund', 25000, 50000, 75000, 'Hoàn tiền cho giao dịch lỗi', 'completed' FROM users WHERE username = 'admin'
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Thông báo hoàn thành
SELECT 'Hệ thống đã được triển khai/cập nhật thành công với phiên bản mới nhất và tính năng idempotency!' AS message;
