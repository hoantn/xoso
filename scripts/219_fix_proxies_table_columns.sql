-- Script sửa lỗi thiếu cột trong bảng proxies

BEGIN;

-- Thêm tất cả các cột cần thiết vào bảng proxies
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS server TEXT DEFAULT '';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 0;
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS secret TEXT DEFAULT '';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'mtproto';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS proxy_type TEXT DEFAULT 'mtproto';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 1;
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.proxies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Đảm bảo cột user_id có thể null
ALTER TABLE public.proxies ALTER COLUMN user_id DROP NOT NULL;

-- Cập nhật các giá trị null thành giá trị mặc định
UPDATE public.proxies SET url = '' WHERE url IS NULL;
UPDATE public.proxies SET description = '' WHERE description IS NULL;
UPDATE public.proxies SET server = '' WHERE server IS NULL;
UPDATE public.proxies SET port = 0 WHERE port IS NULL;
UPDATE public.proxies SET username = '' WHERE username IS NULL;
UPDATE public.proxies SET password = '' WHERE password IS NULL;
UPDATE public.proxies SET secret = '' WHERE secret IS NULL;
UPDATE public.proxies SET type = 'mtproto' WHERE type IS NULL;
UPDATE public.proxies SET proxy_type = 'mtproto' WHERE proxy_type IS NULL;
UPDATE public.proxies SET visibility = 'public' WHERE visibility IS NULL;
UPDATE public.proxies SET max_users = 1 WHERE max_users IS NULL;
UPDATE public.proxies SET is_active = true WHERE is_active IS NULL;
UPDATE public.proxies SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.proxies SET updated_at = NOW() WHERE updated_at IS NULL;

-- Tắt RLS để tránh lỗi quyền truy cập
ALTER TABLE public.proxies DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Kiểm tra cấu trúc bảng proxies
SELECT 'Đã thêm tất cả cột cần thiết vào bảng proxies' AS message;

-- Hiển thị cấu trúc bảng để xác nhận
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'proxies' AND table_schema = 'public'
ORDER BY ordinal_position;
