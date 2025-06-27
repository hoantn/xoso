-- Cập nhật tất cả các tài khoản có balance NULL thành 0
UPDATE users SET balance = 0 WHERE balance IS NULL;
