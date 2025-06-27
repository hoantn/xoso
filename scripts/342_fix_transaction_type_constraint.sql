-- ✅ BƯỚC 1: Kiểm tra constraint hiện tại của bảng transactions
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
AND contype = 'c';

-- ✅ BƯỚC 2: Kiểm tra các giá trị type hiện có trong transactions
SELECT DISTINCT type, COUNT(*) 
FROM transactions 
GROUP BY type 
ORDER BY type;

-- ✅ BƯỚC 3: Thêm 'game_win' vào constraint nếu chưa có
-- Trước tiên drop constraint cũ
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Tạo constraint mới với 'game_win'
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'adjustment', 'game_win', 'refund'));

-- ✅ BƯỚC 4: Chạy lại script xử lý cược với type đúng
DO $$
DECLARE
    bet_record RECORD;
    current_balance NUMERIC;
    new_balance NUMERIC;
BEGIN
    -- Lặp qua tất cả cược thắng cho phiên 2336
    FOR bet_record IN 
        SELECT ub.*, u.balance as user_balance
        FROM user_bets ub
        JOIN users u ON ub.user_id = u.id
        JOIN game_sessions gs ON ub.session_id = gs.id
        WHERE gs.session_number = 2336 
        AND ub.status = 'won' 
        AND ub.win_amount > 0
        AND NOT EXISTS (
            -- Tránh tạo transaction trùng
            SELECT 1 FROM transactions t 
            WHERE t.reference_id = ub.id 
            AND t.type = 'game_win'
        )
    LOOP
        -- Lấy balance hiện tại
        SELECT balance INTO current_balance 
        FROM users 
        WHERE id = bet_record.user_id;
        
        new_balance := current_balance + bet_record.win_amount;
        
        -- Cập nhật balance
        UPDATE users 
        SET balance = new_balance,
            updated_at = NOW()
        WHERE id = bet_record.user_id;
        
        -- Tạo transaction với type được phép
        INSERT INTO transactions (
            user_id,
            type,
            amount,
            balance_before,
            balance_after,
            description,
            status,
            reference_id,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            bet_record.user_id,
            'game_win', -- Bây giờ đã được phép
            bet_record.win_amount,
            current_balance,
            new_balance,
            'Thắng cược ' || bet_record.bet_type || ' - Phiên 2336',
            'completed',
            bet_record.id,
            jsonb_build_object(
                'bet_id', bet_record.id,
                'session_number', 2336,
                'bet_type', bet_record.bet_type,
                'bet_numbers', bet_record.numbers,
                'win_amount', bet_record.win_amount,
                'processed_manually', true,
                'processed_at', NOW()
            ),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Processed winning bet: User %, Bet ID %, Win Amount %, New Balance %', 
            bet_record.user_id, bet_record.id, bet_record.win_amount, new_balance;
    END LOOP;
    
    -- Thông báo kết quả
    RAISE NOTICE 'Completed processing all winning bets for session 2336';
END $$;

-- ✅ BƯỚC 5: Kiểm tra kết quả cuối cùng
SELECT 
    'BET PROCESSING SUMMARY' as summary_type,
    COUNT(*) as total_bets,
    COUNT(*) FILTER (WHERE status = 'won') as won_bets,
    COUNT(*) FILTER (WHERE status = 'lost') as lost_bets,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_bets,
    SUM(win_amount) FILTER (WHERE status = 'won') as total_winnings
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;

-- ✅ BƯỚC 6: Kiểm tra transactions đã tạo
SELECT 
    t.id,
    t.user_id,
    t.type,
    t.amount,
    t.balance_before,
    t.balance_after,
    t.description,
    t.status,
    t.created_at,
    t.metadata->>'bet_type' as bet_type,
    t.metadata->>'win_amount' as win_amount_meta
FROM transactions t
WHERE t.reference_id IN (
    SELECT ub.id 
    FROM user_bets ub
    JOIN game_sessions gs ON ub.session_id = gs.id
    WHERE gs.session_number = 2336
)
AND t.type = 'game_win'
ORDER BY t.created_at DESC;

-- ✅ BƯỚC 7: Kiểm tra balance user sau khi xử lý
SELECT 
    u.id as user_id,
    u.balance as current_balance,
    ub.win_amount,
    ub.status,
    ub.bet_type,
    ub.numbers as bet_numbers
FROM users u
JOIN user_bets ub ON u.id = ub.user_id
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;
