-- =====================================================
-- KIỂM TRA HỆ THỐNG ĐĂNG NHẬP/ĐĂNG KÝ
-- =====================================================

-- 1. Kiểm tra bảng users có tồn tại không
SELECT 'Checking users table...' as step;
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 2. Kiểm tra dữ liệu trong bảng users
SELECT 'Checking users data...' as step;
SELECT 
    id,
    username,
    role,
    full_name,
    balance,
    is_active,
    created_at,
    CASE 
        WHEN password_hash IS NOT NULL THEN 'Has password hash'
        ELSE 'No password hash'
    END as password_status
FROM users 
LIMIT 10;

-- 3. Kiểm tra constraint và index
SELECT 'Checking constraints...' as step;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;

-- 4. Kiểm tra RLS (Row Level Security)
SELECT 'Checking RLS policies...' as step;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users';

-- 5. Kiểm tra policies nếu có
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 6. Test tạo user mới (sẽ fail nếu có vấn đề)
SELECT 'Testing user creation...' as step;
DO $$
BEGIN
    -- Thử tạo user test
    INSERT INTO users (username, password_hash, role, full_name, balance, is_active)
    VALUES ('test_user_debug', '$2a$10$test.hash.for.debug', 'user', 'Test User', 0, true)
    ON CONFLICT (username) DO NOTHING;
    
    -- Kiểm tra user vừa tạo
    IF EXISTS (SELECT 1 FROM users WHERE username = 'test_user_debug') THEN
        RAISE NOTICE 'User creation test: SUCCESS';
    ELSE
        RAISE NOTICE 'User creation test: FAILED';
    END IF;
    
    -- Xóa user test
    DELETE FROM users WHERE username = 'test_user_debug';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'User creation test ERROR: %', SQLERRM;
END $$;

-- 7. Kiểm tra function và trigger
SELECT 'Checking triggers...' as step;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users';
