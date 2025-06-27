-- Script tạo các bảng còn lại sau khi đã có bảng users và proxy_plans

BEGIN;

-- 1. Tạo bảng proxy_orders (cần users và proxy_plans)
CREATE TABLE IF NOT EXISTS proxy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES proxy_plans(id),
  proxy_id UUID REFERENCES proxies(id),
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE proxy_orders DISABLE ROW LEVEL SECURITY;

-- 2. Tạo bảng transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  balance_before NUMERIC(15, 2) NOT NULL,
  balance_after NUMERIC(15, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thêm constraint cho transactions type
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
CHECK (type IN ('deposit', 'proxy_purchase', 'admin_adjustment', 'refund', 'initial_balance', 'withdrawal', 'purchase'));

ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- 3. Tạo bảng deposit_requests
CREATE TABLE IF NOT EXISTS deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  transaction_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  payment_info_snapshot JSONB,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE deposit_requests DISABLE ROW LEVEL SECURITY;

-- 4. Tạo bảng withdrawal_requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(18, 2) NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
    bank_account_details_snapshot JSONB NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE withdrawal_requests DISABLE ROW LEVEL SECURITY;

-- 5. Tạo bảng bank_accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  qr_template TEXT NOT NULL DEFAULT 'compact2',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;

COMMIT;

SELECT 'Tất cả bảng đã được tạo thành công!' AS message;
