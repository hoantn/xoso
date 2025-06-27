-- =====================================================
-- CLEAN UP HỆ THỐNG - XÓA CỘT TRÙNG LẶP VÀ CHUẨN HÓA
-- =====================================================

-- Kiểm tra và xóa cột access_type (giữ lại visibility)
DO $$
BEGIN
    -- Kiểm tra xem cột access_type có tồn tại không
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='access_type') THEN
        -- Copy dữ liệu từ access_type sang visibility nếu visibility null
        UPDATE proxies 
        SET visibility = access_type 
        WHERE visibility IS NULL AND access_type IS NOT NULL;
        
        -- Xóa cột access_type
        ALTER TABLE proxies DROP COLUMN access_type;
        
        RAISE NOTICE 'Đã xóa cột access_type trùng lặp';
    END IF;
    
    -- Đảm bảo visibility có giá trị mặc định
    UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;
    ALTER TABLE proxies ALTER COLUMN visibility SET DEFAULT 'public';
    
    RAISE NOTICE 'Đã chuẩn hóa cột visibility';
END
$$;

-- Kiểm tra và clean up các cột không cần thiết khác
DO $$
BEGIN
    -- Xóa các index không cần thiết nếu có
    DROP INDEX IF EXISTS idx_proxies_access_type;
    DROP INDEX IF EXISTS idx_proxies_visibility;
    
    -- Tạo lại index cho visibility
    CREATE INDEX IF NOT EXISTS idx_proxies_visibility ON proxies(visibility);
    CREATE INDEX IF NOT EXISTS idx_proxies_active_visible ON proxies(is_active, visibility) WHERE is_active = true;
    
    RAISE NOTICE 'Đã tối ưu hóa index';
END
$$;

-- Cập nhật tất cả proxy về trạng thái chuẩn
UPDATE proxies 
SET 
    visibility = 'public',
    is_active = true,
    type = COALESCE(type, 'mtproto'),
    max_users = COALESCE(max_users, 1),
    current_users = COALESCE(current_users, 0),
    source = COALESCE(source, 'Manual')
WHERE visibility IS NULL OR type IS NULL OR max_users IS NULL OR current_users IS NULL;

-- Hiển thị thống kê sau khi clean up
SELECT 
    'Proxies' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN visibility = 'public' THEN 1 END) as public_proxies,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_proxies
FROM proxies;
