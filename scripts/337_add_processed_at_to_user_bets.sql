-- Thêm cột processed_at để tránh trả thưởng nhiều lần
ALTER TABLE user_bets 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS win_amount NUMERIC DEFAULT 0;

-- Tạo index để tăng tốc độ query
CREATE INDEX IF NOT EXISTS idx_user_bets_session_status ON user_bets(session_id, status);
CREATE INDEX IF NOT EXISTS idx_user_bets_processed_at ON user_bets(processed_at) WHERE processed_at IS NOT NULL;

-- Cập nhật các bet cũ chưa có processed_at
UPDATE user_bets 
SET processed_at = updated_at 
WHERE status IN ('won', 'lost') AND processed_at IS NULL;

-- Kiểm tra kết quả
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_count
FROM user_bets 
GROUP BY status;
