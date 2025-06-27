-- Thêm cột max_connections vào bảng proxy_plans nếu nó chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'proxy_plans' AND column_name = 'max_connections'
    ) THEN
        ALTER TABLE proxy_plans
        ADD COLUMN max_connections INTEGER DEFAULT 1;
        RAISE NOTICE 'Column max_connections added to proxy_plans table.';
    ELSE
        RAISE NOTICE 'Column max_connections already exists in proxy_plans table.';
    END IF;
END
$$;

-- Cập nhật giá trị mặc định cho các gói proxy mẫu nếu cần
UPDATE proxy_plans
SET max_connections = 1
WHERE name = 'Gói Cơ Bản' AND max_connections IS NULL;

UPDATE proxy_plans
SET max_connections = 3
WHERE name = 'Gói Tiêu Chuẩn' AND max_connections IS NULL;

UPDATE proxy_plans
SET max_connections = 999
WHERE name = 'Gói Premium' AND max_connections IS NULL;
