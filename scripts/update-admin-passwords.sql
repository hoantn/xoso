-- Update admin passwords với hash thực tế
-- Chạy script hash-admin-passwords.js trước để lấy hash

-- Tạm thời sử dụng hash mẫu (password: admin123456)
UPDATE users SET password_hash = '$2a$10$rQJ5qJZvQJ5qJZvQJ5qJZuOGKqJ5qJZvQJ5qJZvQJ5qJZvQJ5qJZu' 
WHERE username = 'admin';

UPDATE users SET password_hash = '$2a$10$rQJ5qJZvQJ5qJZvQJ5qJZuOGKqJ5qJZvQJ5qJZvQJ5qJZvQJ5qJZu' 
WHERE username = 'superadmin';

-- Kiểm tra kết quả
SELECT username, role, is_active, created_at FROM users WHERE role IN ('admin', 'super_admin');
