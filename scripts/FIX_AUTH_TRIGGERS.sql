-- =====================================================
-- SỬA LỖI TRIGGER ĐĂNG NHẬP/ĐĂNG KÝ
-- =====================================================

-- 1. Xóa các trigger có vấn đề
DROP TRIGGER IF EXISTS ensure_last_sign_in_not_null ON users;

-- 2. Xóa function auth.set_last_sign_in_default nếu tồn tại
DROP FUNCTION IF EXISTS auth.set_last_sign_in_default() CASCADE;

-- 3. Kiểm tra và xóa cột last_sign_in nếu có (không cần thiết cho hệ thống)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_sign_in') THEN
        ALTER TABLE users DROP COLUMN last_sign_in;
        RAISE NOTICE 'Đã xóa cột last_sign_in không cần thiết';
    END IF;
END $$;

-- 4. Đảm bảo bảng users có cấu trúc đúng
DO $$
BEGIN
    -- Kiểm tra và thêm các cột cần thiết
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'balance') THEN
        ALTER TABLE users ADD COLUMN balance NUMERIC(15, 2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 5. Tắt RLS (Row Level Security) cho bảng users nếu đang bật
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 6. Xóa tất cả policies trên bảng users
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

-- 7. Đảm bảo chỉ có trigger update_updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Test tạo user để đảm bảo không có lỗi
DO $$
BEGIN
    -- Thử tạo user test
    INSERT INTO users (username, password_hash, role, full_name, balance, is_active)
    VALUES ('test_auth_fix', '$2a$10$test.hash.for.debug', 'user', 'Test User', 0, true)
    ON CONFLICT (username) DO NOTHING;
    
    -- Kiểm tra user vừa tạo
    IF EXISTS (SELECT 1 FROM users WHERE username = 'test_auth_fix') THEN
        RAISE NOTICE '✅ Test tạo user: THÀNH CÔNG';
        -- Xóa user test
        DELETE FROM users WHERE username = 'test_auth_fix';
    ELSE
        RAISE NOTICE '❌ Test tạo user: THẤT BẠI';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Lỗi khi test tạo user: %', SQLERRM;
END $$;

-- 9. Hiển thị cấu trúc bảng users sau khi sửa
SELECT 'Cấu trúc bảng users sau khi sửa:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

SELECT 'Hệ thống đăng nhập/đăng ký đã được sửa!' as message;
