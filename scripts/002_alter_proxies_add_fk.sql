-- Cho phép user_id trong bảng proxies có thể NULL
DO $$
BEGIN
    -- Kiểm tra và thay đổi cột user_id để cho phép NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proxies' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE proxies ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE 'Đã cho phép user_id trong bảng proxies có thể NULL';
    ELSE
        RAISE NOTICE 'Cột user_id đã cho phép NULL';
    END IF;
END $$;

-- Thêm khóa ngoại từ proxies.user_id đến users.id (chỉ thêm nếu chưa tồn tại)
DO $$
BEGIN
    -- Kiểm tra xem constraint đã tồn tại chưa
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_proxies_user_id' 
        AND table_name = 'proxies'
    ) THEN
        -- Xóa các proxy có user_id không tồn tại trước khi thêm constraint
        DELETE FROM proxies WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users);
        
        -- Thêm foreign key constraint
        ALTER TABLE proxies
        ADD CONSTRAINT fk_proxies_user_id
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL; -- Nếu user bị xóa, proxy của họ sẽ trở thành public (user_id = NULL)
        
        RAISE NOTICE 'Đã thêm foreign key constraint fk_proxies_user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_proxies_user_id đã tồn tại';
    END IF;
END $$;

-- Tạo index cho user_id trong bảng proxies để tăng tốc độ truy vấn (chỉ tạo nếu chưa tồn tại)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_proxies_user_id'
    ) THEN
        CREATE INDEX idx_proxies_user_id ON proxies(user_id);
        RAISE NOTICE 'Đã tạo index idx_proxies_user_id';
    ELSE
        RAISE NOTICE 'Index idx_proxies_user_id đã tồn tại';
    END IF;
END $$;

-- Thống kê sau khi cập nhật
DO $$
DECLARE
    total_proxies INTEGER;
    public_proxies INTEGER;
    private_proxies INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_proxies FROM proxies;
    SELECT COUNT(*) INTO public_proxies FROM proxies WHERE user_id IS NULL;
    SELECT COUNT(*) INTO private_proxies FROM proxies WHERE user_id IS NOT NULL;
    
    RAISE NOTICE '=== THỐNG KÊ PROXY ===';
    RAISE NOTICE 'Tổng số proxy: %', total_proxies;
    RAISE NOTICE 'Proxy công khai (user_id IS NULL): %', public_proxies;
    RAISE NOTICE 'Proxy riêng tư (user_id IS NOT NULL): %', private_proxies;
    RAISE NOTICE '======================';
END $$;

-- Ghi chú: Hiện tại, chúng ta sẽ dựa vào user_id IS NULL để xác định proxy công khai.
-- Nếu user_id là NULL, proxy đó là công khai.
-- Nếu user_id có giá trị, proxy đó thuộc về user tương ứng.

SELECT 'Bảng proxies đã được cập nhật thành công!' AS message;
