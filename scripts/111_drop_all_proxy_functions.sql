-- Xóa tất cả trigger và hàm liên quan đến proxy
DROP TRIGGER IF EXISTS trigger_update_proxy_users ON proxy_orders;
DROP TRIGGER IF EXISTS update_proxy_current_users_trigger ON proxy_orders;

DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);
DROP FUNCTION IF EXISTS update_proxy_current_users();
DROP FUNCTION IF EXISTS cleanup_expired_proxies();

RAISE NOTICE 'Đã xóa tất cả hàm và trigger cũ';
