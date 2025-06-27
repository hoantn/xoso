-- Xóa hàm purchase_proxy_plan nếu tồn tại
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID);
