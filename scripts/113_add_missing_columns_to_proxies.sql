-- Thêm các cột bị thiếu vào bảng proxies
DO $$
BEGIN
    -- Thêm cột source
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='source') THEN
        ALTER TABLE proxies ADD COLUMN source VARCHAR(100) DEFAULT 'Manual';
    END IF;
    
    -- Đảm bảo các cột khác tồn tại
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='type') THEN
        ALTER TABLE proxies ADD COLUMN type VARCHAR(20) DEFAULT 'mtproto';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='max_users') THEN
        ALTER TABLE proxies ADD COLUMN max_users INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='current_users') THEN
        ALTER TABLE proxies ADD COLUMN current_users INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proxies' AND column_name='visibility') THEN
        ALTER TABLE proxies ADD COLUMN visibility VARCHAR(20) DEFAULT 'public';
    END IF;
END
$$;

-- Cập nhật giá trị mặc định cho các cột NULL
UPDATE proxies SET source = 'Manual' WHERE source IS NULL;
UPDATE proxies SET type = 'mtproto' WHERE type IS NULL;
UPDATE proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE proxies SET current_users = 0 WHERE current_users IS NULL;
UPDATE proxies SET visibility = 'public' WHERE visibility IS NULL;
