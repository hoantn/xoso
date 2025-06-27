-- Thêm cột expires_at vào bảng proxy_orders nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'proxy_orders'
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE proxy_orders
        ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Đã thêm cột expires_at vào bảng proxy_orders';
    ELSE
        RAISE NOTICE 'Cột expires_at đã tồn tại trong bảng proxy_orders';
    END IF;
END $$;
