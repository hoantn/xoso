-- Bảng lưu trữ thông tin các tài khoản ngân hàng của admin để nhận tiền nạp
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id TEXT NOT NULL, -- Mã ngân hàng theo VietQR (ví dụ: '970436' cho Vietcombank)
    bank_name TEXT NOT NULL, -- Tên ngân hàng (ví dụ: 'Vietcombank', 'ACB')
    account_number TEXT NOT NULL UNIQUE, -- Số tài khoản ngân hàng
    account_name TEXT NOT NULL, -- Tên chủ tài khoản
    qr_template TEXT NOT NULL DEFAULT 'compact2', -- Mẫu QR sử dụng (ví dụ: 'compact2', 'print')
    is_active BOOLEAN NOT NULL DEFAULT FALSE, -- Chỉ một tài khoản được active tại một thời điểm
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index cho các cột thường xuyên truy vấn
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number ON bank_accounts(account_number);

-- Trigger để tự động cập nhật updated_at cho bank_accounts
CREATE OR REPLACE FUNCTION trigger_set_timestamp_bank_accounts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_bank_accounts ON bank_accounts;
CREATE TRIGGER set_timestamp_bank_accounts
BEFORE UPDATE ON bank_accounts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp_bank_accounts();

-- Đảm bảo chỉ có một tài khoản is_active = true
-- Cách 1: Sử dụng constraint loại trừ (PostgreSQL 9.0+)
-- ALTER TABLE bank_accounts ADD CONSTRAINT one_active_bank_account EXCLUDE (is_active WITH =) WHERE (is_active);
-- Cách 2: Sử dụng trigger (phổ biến hơn và dễ quản lý hơn trong logic code)
-- Logic này sẽ được xử lý ở tầng API khi cập nhật is_active.

COMMENT ON TABLE bank_accounts IS 'Lưu trữ thông tin các tài khoản ngân hàng của admin để nhận tiền nạp từ người dùng.';
COMMENT ON COLUMN bank_accounts.bank_id IS 'Mã ngân hàng theo chuẩn VietQR. Ví dụ: 970436 cho Vietcombank.';
COMMENT ON COLUMN bank_accounts.bank_name IS 'Tên đầy đủ hoặc tên viết tắt của ngân hàng.';
COMMENT ON COLUMN bank_accounts.account_number IS 'Số tài khoản ngân hàng của admin.';
COMMENT ON COLUMN bank_accounts.account_name IS 'Tên chủ tài khoản ngân hàng của admin.';
COMMENT ON COLUMN bank_accounts.qr_template IS 'Mẫu template QR của VietQR (ví dụ: compact2, print).';
COMMENT ON COLUMN bank_accounts.is_active IS 'True nếu tài khoản này đang được sử dụng để nhận tiền nạp. Chỉ một tài khoản được active.';

-- Xóa các biến môi trường không còn cần thiết sau khi tính năng này hoàn thiện
-- NEXT_PUBLIC_VIETQR_BANK_ID
-- NEXT_PUBLIC_VIETQR_ACCOUNT_NO
-- NEXT_PUBLIC_VIETQR_ACCOUNT_NAME
-- NEXT_PUBLIC_VIETQR_TEMPLATE
-- (Lưu ý: Việc xóa này là gợi ý, bạn cần đảm bảo hệ thống đã chuyển hoàn toàn sang dùng DB)
