-- Thêm cột visibility vào bảng proxies
ALTER TABLE proxies 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';

-- Tạo index cho visibility để tối ưu query
CREATE INDEX IF NOT EXISTS idx_proxies_visibility ON proxies(visibility);

-- Cập nhật các proxy hiện có thành public
UPDATE proxies 
SET visibility = 'public' 
WHERE visibility IS NULL;

-- Kiểm tra kết quả
SELECT 
  visibility,
  COUNT(*) as count
FROM proxies 
GROUP BY visibility;

-- Hiển thị một vài proxy mẫu
SELECT id, server, port, type, visibility, description
FROM proxies 
ORDER BY created_at DESC 
LIMIT 5;
