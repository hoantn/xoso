-- Script tạo các bảng cơ bản trước
-- Chạy script này trước để tạo bảng users và các bảng cơ bản

BEGIN;

-- 1. Tạo extension cần thiết
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tạo bảng users trước tiên (không có foreign key)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  full_name VARCHAR(100),
  balance NUMERIC(15, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tắt RLS cho bảng users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 4. Tạo bảng proxies (có foreign key tới users)
CREATE TABLE IF NOT EXISTS proxies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  secret VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'public',
  type VARCHAR(20) DEFAULT 'mtproto',
  max_users INTEGER DEFAULT 1,
  current_users INTEGER DEFAULT 0,
  source VARCHAR(100) DEFAULT 'Manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tắt RLS cho bảng proxies
ALTER TABLE proxies DISABLE ROW LEVEL SECURITY;

-- 6. Tạo bảng proxy_plans
CREATE TABLE IF NOT EXISTS proxy_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_connections INTEGER DEFAULT 1,
  proxy_type VARCHAR(20) NOT NULL DEFAULT 'mtproto',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tắt RLS cho bảng proxy_plans
ALTER TABLE proxy_plans DISABLE ROW LEVEL SECURITY;

-- 8. Thêm admin accounts
INSERT INTO users (username, password_hash, role, full_name, balance)
VALUES 
    ('admin', '$2a$10$2fv5JgzZ/HeQ07B8wD65Qecb22FbhxT22JmO/sYr5BsjnVS5Z.J72', 'admin', 'Administrator', 999999),
    ('superadmin', '$2a$10$2fv5JgzZ/HeQ07B8wD65Qecb22FbhxT22JmO/sYr5BsjnVS5Z.J72', 'super_admin', 'Super Administrator', 999999)
ON CONFLICT (username) DO NOTHING;

COMMIT;

SELECT 'Các bảng cơ bản đã được tạo thành công!' AS message;
