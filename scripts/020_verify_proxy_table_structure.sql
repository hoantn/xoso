-- Kiểm tra cấu trúc bảng proxies
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'proxies' 
ORDER BY ordinal_position;

-- Kiểm tra constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'proxies';

-- Kiểm tra dữ liệu mẫu
SELECT COUNT(*) as total_proxies FROM proxies;

-- Kiểm tra admin users
SELECT id, username, role FROM users WHERE role = 'admin';

-- Test insert một proxy đơn giản
INSERT INTO proxies (server, port, username, password, description, type, is_active, user_id, created_at)
VALUES ('127.0.0.1', 8080, 'test', 'test', 'Test proxy', 'http', true, NULL, NOW())
ON CONFLICT DO NOTHING
RETURNING *;
