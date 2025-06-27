-- Script thêm dữ liệu mẫu

BEGIN;

-- 1. Thêm proxy plans mẫu
INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type)
SELECT 'Gói Cơ Bản', 'Proxy MTProto cơ bản cho 1 thiết bị', 50000, 30, 1, 'mtproto'
WHERE NOT EXISTS (SELECT 1 FROM proxy_plans WHERE name = 'Gói Cơ Bản');

INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type)
SELECT 'Gói Tiêu Chuẩn', 'Proxy MTProto cho 3 thiết bị', 120000, 30, 3, 'mtproto'
WHERE NOT EXISTS (SELECT 1 FROM proxy_plans WHERE name = 'Gói Tiêu Chuẩn');

INSERT INTO proxy_plans (name, description, price, duration_days, max_connections, proxy_type)
SELECT 'Gói Premium', 'Proxy MTProto không giới hạn thiết bị', 200000, 30, 999, 'mtproto'
WHERE NOT EXISTS (SELECT 1 FROM proxy_plans WHERE name = 'Gói Premium');

-- 2. Tạo indexes cần thiết
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
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);

COMMIT;

SELECT 'Dữ liệu mẫu và indexes đã được tạo thành công!' AS message;
SELECT 'Hệ thống đã sẵn sàng sử dụng!' AS status;
