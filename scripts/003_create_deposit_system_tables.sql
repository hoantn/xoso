-- Bảng lưu trữ các yêu cầu nạp tiền của người dùng
CREATE TABLE IF NOT EXISTS deposit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0), -- Số tiền nạp, ví dụ: 100000.00 VNĐ
    transaction_id TEXT UNIQUE NOT NULL, -- Mã giao dịch duy nhất, ví dụ: NAPTIEN_USERID_TIMESTAMP
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')), -- Trạng thái: pending, completed, cancelled, failed
    payment_info_snapshot JSONB, -- Thông tin chuyển khoản đã hiển thị cho người dùng (bank_name, account_no, account_name, transfer_memo, qr_url)
    admin_notes TEXT, -- Ghi chú của admin khi xử lý
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index cho các cột thường xuyên truy vấn
CREATE INDEX IF NOT EXISTS idx_deposit_requests_user_id ON deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_transaction_id ON deposit_requests(transaction_id);

-- Cập nhật bảng users để thêm cột balance
ALTER TABLE users
ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00;

-- Trigger để tự động cập nhật updated_at cho deposit_requests
CREATE OR REPLACE FUNCTION trigger_set_timestamp_deposit_requests()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_deposit_requests ON deposit_requests;
CREATE TRIGGER set_timestamp_deposit_requests
BEFORE UPDATE ON deposit_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp_deposit_requests();

COMMENT ON COLUMN deposit_requests.amount IS 'Số tiền nạp bằng VNĐ';
COMMENT ON COLUMN users.balance IS 'Số dư tài khoản của người dùng bằng VNĐ';
