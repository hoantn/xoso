-- Bước 1: Xóa trigger cũ khỏi bảng transactions (nếu có)
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;

-- Bước 2: Xóa bảng transactions cũ để tạo lại hoàn toàn sạch sẽ (CẢNH BÁO: Sẽ xóa hết dữ liệu trong bảng transactions)
DROP TABLE IF EXISTS transactions;

-- Bước 3: Tạo lại bảng transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'deposit', 'proxy_purchase', 'admin_adjustment', 'refund', 'initial_balance'
  amount NUMERIC(15, 2) NOT NULL,
  balance_before NUMERIC(15, 2) NOT NULL,
  balance_after NUMERIC(15, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID, -- ID của deposit_request, proxy_order, etc.
  status VARCHAR(20) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'cancelled'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id), -- Admin user ID who initiated or processed this
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Bước 4: Tạo hoặc thay thế function chung để tự động cập nhật updated_at
-- Hàm này có thể đã tồn tại và được sử dụng bởi các bảng khác, CREATE OR REPLACE sẽ cập nhật nó.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Bước 5: Tạo trigger mới cho bảng transactions để sử dụng function trên
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE transactions IS 'Bảng lưu trữ lịch sử giao dịch của người dùng';
COMMENT ON COLUMN transactions.type IS 'Loại giao dịch: deposit, proxy_purchase, admin_adjustment, refund, etc.';
COMMENT ON COLUMN transactions.amount IS 'Số tiền giao dịch (dương = cộng tiền, âm = trừ tiền)';
COMMENT ON COLUMN transactions.reference_id IS 'ID tham chiếu đến bảng khác (deposit_requests, proxy_id, etc.)';
COMMENT ON COLUMN transactions.metadata IS 'Thông tin bổ sung dạng JSON';
COMMENT ON COLUMN transactions.created_by IS 'ID của admin user đã xử lý giao dịch (nếu có)';

SELECT 'Script 006 executed successfully. Transactions table recreated and trigger set.';
