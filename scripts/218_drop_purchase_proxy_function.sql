-- Script để xóa hàm purchase_proxy_plan
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);
SELECT 'Hàm purchase_proxy_plan đã được xóa (nếu tồn tại).' AS message;
