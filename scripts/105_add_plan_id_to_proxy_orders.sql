-- Thêm cột plan_id vào bảng proxy_orders nếu chưa tồn tại
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'proxy_orders'
        AND column_name = 'plan_id'
    ) THEN
        ALTER TABLE proxy_orders
        ADD COLUMN plan_id UUID;
        
        -- Thêm khóa ngoại nếu cần (chỉ khi bảng proxy_plans đã tồn tại)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proxy_plans') THEN
            ALTER TABLE proxy_orders
            ADD CONSTRAINT fk_proxy_orders_plan_id
            FOREIGN KEY (plan_id) REFERENCES proxy_plans(id);
        END IF;
        
        RAISE NOTICE 'Đã thêm cột plan_id vào bảng proxy_orders';
    ELSE
        RAISE NOTICE 'Cột plan_id đã tồn tại trong bảng proxy_orders';
    END IF;
END $$;
