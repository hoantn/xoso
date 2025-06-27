-- Script sửa lỗi Realtime cho bảng transactions (đã sửa lỗi enablerls)

-- 1. Kiểm tra trạng thái RLS hiện tại (sửa lỗi enablerls)
SELECT 
    schemaname, 
    tablename, 
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 2. Kiểm tra các policy hiện tại
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
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 3. Tạm thời tắt RLS để test Realtime
-- CẢNH BÁO: Chỉ để debug, sau đó phải bật lại
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 4. Đảm bảo replica identity được set đúng cho Realtime
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- 5. Kiểm tra publication hiện tại
SELECT 
    p.pubname,
    p.puballtables,
    p.pubinsert,
    p.pubupdate,
    p.pubdelete
FROM pg_publication p
WHERE p.pubname = 'supabase_realtime';

-- 6. Kiểm tra xem bảng transactions đã có trong publication chưa
SELECT 
    pt.schemaname,
    pt.tablename
FROM pg_publication_tables pt
WHERE pt.pubname = 'supabase_realtime' AND pt.tablename = 'transactions';

-- 7. Thêm bảng transactions vào publication (có thể báo lỗi nếu đã tồn tại)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
        RAISE NOTICE 'Added transactions table to supabase_realtime publication';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Table transactions already exists in supabase_realtime publication';
    END;
END $$;

-- 8. Kiểm tra lại sau khi thêm
SELECT 
    pt.schemaname,
    pt.tablename
FROM pg_publication_tables pt
WHERE pt.pubname = 'supabase_realtime' AND pt.tablename = 'transactions';

-- 9. Tạo function test để kiểm tra Realtime
CREATE OR REPLACE FUNCTION test_realtime_update()
RETURNS TABLE(message text, transaction_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
    test_user_id uuid;
    test_transaction_id uuid;
BEGIN
    -- Lấy user_id đầu tiên
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RETURN QUERY SELECT 'No users found in database'::text, NULL::uuid;
        RETURN;
    END IF;
    
    -- Tạo test transaction
    INSERT INTO public.transactions (
        id,
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        status,
        description,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_user_id,
        'deposit',
        50000,
        0,
        50000,
        'pending',
        'TEST REALTIME - ' || NOW()::text,
        NOW(),
        NOW()
    ) RETURNING id INTO test_transaction_id;
    
    -- Đợi 1 giây
    PERFORM pg_sleep(1);
    
    -- Update để trigger realtime event
    UPDATE public.transactions 
    SET 
        status = 'completed',
        updated_at = NOW()
    WHERE id = test_transaction_id;
    
    RETURN QUERY SELECT 
        ('Test transaction created and updated. ID: ' || test_transaction_id::text)::text,
        test_transaction_id;
END;
$$;

-- 10. Chạy test function
SELECT * FROM test_realtime_update();

-- GHI CHÚ QUAN TRỌNG:
-- Sau khi test xong và xác nhận Realtime hoạt động, 
-- PHẢI chạy lệnh sau để bật lại RLS:
-- ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
