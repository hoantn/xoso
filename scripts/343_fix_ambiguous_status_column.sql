-- ✅ SỬA LỖI: Chỉ định rõ table alias cho các cột status
-- Kiểm tra constraint hiện tại của transactions table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'transactions_type_check';

-- ✅ Thêm 'game_win' vào constraint nếu chưa có
DO $$
BEGIN
    -- Kiểm tra xem constraint có tồn tại không
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_type_check'
    ) THEN
        -- Drop constraint cũ
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
        
        -- Tạo constraint mới với 'game_win'
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
        CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'adjustment', 'game_win', 'refund'));
        
        RAISE NOTICE 'Updated transactions_type_check constraint to include game_win';
    ELSE
        -- Tạo constraint mới nếu chưa có
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
        CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'adjustment', 'game_win', 'refund'));
        
        RAISE NOTICE 'Created new transactions_type_check constraint with game_win';
    END IF;
END $$;

-- ✅ Kiểm tra chi tiết cược cho phiên 2336 với table alias rõ ràng
SELECT 
    ub.id as bet_id,
    ub.user_id,
    ub.session_id,
    gs.session_number,
    ub.bet_type,
    ub.numbers,
    ub.amount,
    ub.potential_win,
    ub.status as bet_status,  -- ✅ Chỉ định rõ đây là status của user_bets
    ub.win_amount,
    ub.processed_at,
    ub.created_at,
    ub.updated_at,
    gs.winning_numbers,
    gs.results_data->>'special_prize' as special_prize,
    gs.status as session_status,  -- ✅ Chỉ định rõ đây là status của game_sessions
    -- Kiểm tra overlap giữa bet numbers và winning numbers
    (ub.numbers && gs.winning_numbers) as has_overlap,
    -- Kiểm tra 2 số cuối của special_prize
    RIGHT(gs.results_data->>'special_prize', 2) as last_two_special,
    (RIGHT(gs.results_data->>'special_prize', 2) = ANY(ub.numbers)) as special_match
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;

-- ✅ Xử lý thủ công cược với cú pháp PostgreSQL đúng và table alias rõ ràng
UPDATE user_bets 
SET 
    status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM game_sessions gs 
            WHERE gs.id = user_bets.session_id 
            AND (
                -- Kiểm tra overlap array (đúng cú pháp PostgreSQL)
                user_bets.numbers && gs.winning_numbers
                -- Hoặc kiểm tra 2 số cuối của special_prize
                OR RIGHT(gs.results_data->>'special_prize', 2) = ANY(user_bets.numbers)
            )
        ) THEN 'won'
        ELSE 'lost'
    END,
    win_amount = CASE 
        WHEN EXISTS (
            SELECT 1 FROM game_sessions gs 
            WHERE gs.id = user_bets.session_id 
            AND (
                user_bets.numbers && gs.winning_numbers
                OR RIGHT(gs.results_data->>'special_prize', 2) = ANY(user_bets.numbers)
            )
        ) THEN 
            CASE 
                WHEN user_bets.bet_type LIKE '%lo_2_so%' THEN user_bets.amount * 99
                WHEN user_bets.bet_type LIKE '%de_dac_biet%' THEN user_bets.amount * 99
                WHEN user_bets.bet_type LIKE '%lo_3_so%' THEN user_bets.amount * 900
                WHEN user_bets.bet_type LIKE '%nhat_to%' THEN user_bets.amount * 9
                WHEN user_bets.bet_type LIKE '%de_dau_duoi%' THEN user_bets.amount * 9
                WHEN user_bets.bet_type LIKE '%xien_2%' THEN user_bets.amount * 17
                WHEN user_bets.bet_type LIKE '%xien_3%' THEN user_bets.amount * 65
                WHEN user_bets.bet_type LIKE '%xien_4%' THEN user_bets.amount * 200
                ELSE user_bets.potential_win
            END
        ELSE 0
    END,
    processed_at = NOW(),
    updated_at = NOW()
WHERE session_id = (
    SELECT id FROM game_sessions WHERE session_number = 2336
)
AND status = 'pending';

-- ✅ Nếu có người thắng, cập nhật balance và tạo transaction (tránh duplicate)
DO $$
DECLARE
    bet_record RECORD;
    current_balance NUMERIC;
    new_balance NUMERIC;
    existing_transaction_count INTEGER;
BEGIN
    -- Lặp qua tất cả cược thắng
    FOR bet_record IN 
        SELECT ub.*, u.balance as user_balance
        FROM user_bets ub
        JOIN users u ON ub.user_id = u.id
        JOIN game_sessions gs ON ub.session_id = gs.id
        WHERE gs.session_number = 2336 
        AND ub.status = 'won' 
        AND ub.win_amount > 0
    LOOP
        -- Kiểm tra xem đã có transaction cho bet này chưa
        SELECT COUNT(*) INTO existing_transaction_count
        FROM transactions 
        WHERE reference_id = bet_record.id::text 
        AND type = 'game_win';
        
        -- Chỉ tạo transaction nếu chưa có
        IF existing_transaction_count = 0 THEN
            -- Cập nhật balance
            current_balance := bet_record.user_balance;
            new_balance := current_balance + bet_record.win_amount;
            
            UPDATE users 
            SET balance = new_balance 
            WHERE id = bet_record.user_id;
            
            -- Tạo transaction
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
                created_at
            ) VALUES (
                bet_record.user_id,
                'game_win',
                bet_record.win_amount,
                current_balance,
                new_balance,
                'Thắng cược ' || bet_record.bet_type || ' - Phiên 2336',
                'completed',
                bet_record.id::text,
                jsonb_build_object(
                    'bet_id', bet_record.id,
                    'session_number', 2336,
                    'bet_type', bet_record.bet_type,
                    'bet_numbers', bet_record.numbers,
                    'win_amount', bet_record.win_amount,
                    'processed_manually', true
                ),
                NOW()
            );
            
            RAISE NOTICE 'Processed winning bet: User %, Amount %, New Balance %', 
                bet_record.user_id, bet_record.win_amount, new_balance;
        ELSE
            RAISE NOTICE 'Transaction already exists for bet %, skipping', bet_record.id;
        END IF;
    END LOOP;
END $$;

-- ✅ Kiểm tra kết quả cuối cùng với table alias rõ ràng
SELECT 
    'BET PROCESSING SUMMARY' as summary_type,
    COUNT(*) as total_bets,
    COUNT(*) FILTER (WHERE ub.status = 'won') as won_bets,  -- ✅ ub.status
    COUNT(*) FILTER (WHERE ub.status = 'lost') as lost_bets,  -- ✅ ub.status
    COUNT(*) FILTER (WHERE ub.status = 'pending') as pending_bets,  -- ✅ ub.status
    SUM(ub.win_amount) as total_winnings,
    gs.status as session_status  -- ✅ gs.status
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336
GROUP BY gs.status;

-- ✅ Kiểm tra transactions đã tạo
SELECT 
    t.id,
    t.user_id,
    t.type,
    t.amount,
    t.balance_before,
    t.balance_after,
    t.description,
    t.status as transaction_status,  -- ✅ t.status
    t.reference_id,
    t.created_at,
    u.username
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE t.type = 'game_win' 
AND t.metadata->>'session_number' = '2336'
ORDER BY t.created_at DESC;

-- ✅ Kiểm tra balance user sau khi thắng
SELECT 
    u.id,
    u.username,
    u.balance,
    COUNT(ub.id) as total_bets,
    COUNT(ub.id) FILTER (WHERE ub.status = 'won') as won_bets,
    SUM(ub.win_amount) as total_winnings
FROM users u
JOIN user_bets ub ON u.id = ub.user_id
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336
GROUP BY u.id, u.username, u.balance
ORDER BY total_winnings DESC;
