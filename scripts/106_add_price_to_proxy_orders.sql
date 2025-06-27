-- Thêm cột price vào bảng proxy_orders nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'proxy_orders'
        AND column_name = 'price'
    ) THEN
        ALTER TABLE proxy_orders
        ADD COLUMN price NUMERIC(15,2) NOT NULL DEFAULT 0; -- Đặt giá trị mặc định để tránh lỗi NOT NULL
        
        RAISE NOTICE 'Đã thêm cột price vào bảng proxy_orders';
    ELSE
        RAISE NOTICE 'Cột price đã tồn tại trong bảng proxy_orders';
    END IF;
END $$;
