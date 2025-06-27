-- Script sửa lỗi ràng buộc NOT NULL cho cột host trong bảng proxies

BEGIN;

-- Kiểm tra cấu trúc hiện tại của bảng proxies
SELECT 'Cấu trúc bảng proxies hiện tại:' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'proxies' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cập nhật tất cả giá trị NULL trong cột host thành giá trị mặc định
UPDATE public.proxies SET host = server WHERE host IS NULL AND server IS NOT NULL;
UPDATE public.proxies SET host = '' WHERE host IS NULL;

-- Xóa ràng buộc NOT NULL cho cột host (nếu có)
ALTER TABLE public.proxies ALTER COLUMN host DROP NOT NULL;

-- Hoặc nếu muốn giữ ràng buộc NOT NULL, đặt giá trị mặc định
ALTER TABLE public.proxies ALTER COLUMN host SET DEFAULT '';

-- Đảm bảo các cột khác cũng có giá trị mặc định phù hợp
ALTER TABLE public.proxies ALTER COLUMN url SET DEFAULT '';
ALTER TABLE public.proxies ALTER COLUMN server SET DEFAULT '';
ALTER TABLE public.proxies ALTER COLUMN description SET DEFAULT '';
ALTER TABLE public.proxies ALTER COLUMN username SET DEFAULT '';
ALTER TABLE public.proxies ALTER COLUMN password SET DEFAULT '';
ALTER TABLE public.proxies ALTER COLUMN secret SET DEFAULT '';
ALTER TABLE public.proxies ALTER COLUMN type SET DEFAULT 'mtproto';
ALTER TABLE public.proxies ALTER COLUMN proxy_type SET DEFAULT 'mtproto';
ALTER TABLE public.proxies ALTER COLUMN visibility SET DEFAULT 'public';
ALTER TABLE public.proxies ALTER COLUMN port SET DEFAULT 0;
ALTER TABLE public.proxies ALTER COLUMN max_users SET DEFAULT 1;
ALTER TABLE public.proxies ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE public.proxies ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.proxies ALTER COLUMN updated_at SET DEFAULT NOW();

COMMIT;

SELECT 'Đã sửa lỗi ràng buộc NOT NULL cho cột host' AS message;
