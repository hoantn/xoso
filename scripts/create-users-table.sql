-- Tạo bảng users cho hệ thống đăng ký/đăng nhập đơn giản
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  full_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo index cho tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Thêm admin accounts mặc định
-- NOTE: The password_hash values below are placeholders.  Use scripts/hash-admin-passwords.js and scripts/update-admin-passwords.sql to update them.
INSERT INTO users (id, username, password_hash, role, full_name) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', '$2a$10$rQJ5qJZvQJ5qJZvQJ5qJZuO', 'admin', 'Administrator'),
  ('00000000-0000-0000-0000-000000000002', 'superadmin', '$2a$10$rQJ5qJZvQJ5qJZvQJ5qJZuO', 'super_admin', 'Super Administrator')
ON CONFLICT (id) DO NOTHING;

-- Trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
