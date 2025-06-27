-- Kiểm tra và sửa lỗi RLS cho Realtime trên bảng transactions
-- Script này sẽ đảm bảo Realtime có thể hoạt động đúng cách

-- 1. Kiểm tra trạng thái hiện tại của RLS
SELECT schemaname, tablename, rowsecurity, enablerls 
FROM pg_tables 
JOIN pg_class ON pg_tables.tablename = pg_class.relname 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 2. Kiểm tra các policy hiện tại
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 3. Tạm thời tắt RLS để test Realtime (CHỈ ĐỂ DEBUG)
-- CẢNH BÁO: Điều này sẽ cho phép tất cả user đọc tất cả transactions
-- Chỉ sử dụng để test, sau đó phải bật lại RLS
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 4. Kiểm tra xem bảng transactions có được bật Realtime không
SELECT 
    schemaname,
    tablename,
    replica_identity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' AND tablename = 'transactions';

-- 5. Đảm bảo replica identity được set đúng cho Realtime
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- 6. Kiểm tra publication cho Realtime
SELECT 
    p.pubname,
    p.puballtables,
    p.pubinsert,
    p.pubupdate,
    p.pubdelete,
    pt.schemaname,
    pt.tablename
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE p.pubname = 'supabase_realtime' OR pt.tablename = 'transactions';

-- 7. Thêm bảng transactions vào publication nếu chưa có
-- (Lệnh này có thể fail nếu đã tồn tại, đó là bình thường)
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- 8. Tạo một function để test Realtime
CREATE OR REPLACE FUNCTION test_realtime_notification()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Tạo một test transaction update
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
        (SELECT id FROM public.users LIMIT 1),
        'deposit',
        100000,
        0,
        100000,
        'pending',
        'Test realtime notification',
        NOW(),
        NOW()
    );
    
    -- Update status to completed để trigger realtime event
    UPDATE public.transactions 
    SET 
        status = 'completed',
        updated_at = NOW()
    WHERE description = 'Test realtime notification' 
    AND status = 'pending';
    
    RAISE NOTICE 'Test transaction created and updated to completed';
END;
$$;

-- Ghi chú: Sau khi test xong, nhớ bật lại RLS:
-- ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
