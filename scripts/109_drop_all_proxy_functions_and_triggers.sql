-- Xóa trigger trước khi xóa hàm
DROP TRIGGER IF EXISTS trigger_update_proxy_users ON proxy_orders;

-- Xóa các hàm liên quan
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);
DROP FUNCTION IF EXISTS update_proxy_current_users();
DROP FUNCTION IF EXISTS cleanup_expired_proxies();
