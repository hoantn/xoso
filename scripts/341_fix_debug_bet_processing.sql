-- ✅ SỬA LỖI: Kiểm tra chi tiết cược cho phiên 2336 với cú pháp đúng
SELECT 
    ub.id as bet_id,
    ub.user_id,
    ub.session_id,
    gs.session_number,
    ub.bet_type,
    ub.numbers,
    ub.amount,
    ub.potential_win,
    ub.status,
    ub.win_amount,
    ub.processed_at,
    ub.created_at,
    ub.updated_at,
    gs.winning_numbers,
    gs.results_data->>'special_prize' as special_prize,
    gs.status as session_status,
    -- Kiểm tra overlap giữa bet numbers và winning numbers
    (ub.numbers && gs.winning_numbers) as has_overlap,
    -- Kiểm tra từng số trong bet có trong winning numbers không
    array_to_string(ub.numbers, ',') as bet_numbers_str,
    array_to_string(gs.winning_numbers, ',') as winning_numbers_str
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;

-- ✅ Kiểm tra manual xem số có trúng không
-- Giả sử bet_type = 'lo_2_so_1p' và numbers = ['99', '19']
-- Winning numbers từ special_prize (2 số cuối)
SELECT 
    gs.session_number,
    gs.results_data->>'special_prize' as special_prize,
    RIGHT(gs.results_data->>'special_prize', 2) as last_two_digits,
    gs.winning_numbers,
    ub.numbers as bet_numbers,
    ub.bet_type,
    -- Kiểm tra xem có overlap không
    (ub.numbers && gs.winning_numbers) as should_win
FROM game_sessions gs
JOIN user_bets ub ON gs.id = ub.session_id
WHERE gs.session_number = 2336;

-- ✅ SỬA LỖI: Xử lý thủ công cược với cú pháp PostgreSQL đúng
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

-- ✅ Kiểm tra kết quả sau khi update
SELECT 
    ub.id as bet_id,
    ub.user_id,
    ub.bet_type,
    ub.numbers as bet_numbers,
    ub.amount,
    ub.status,
    ub.win_amount,
    ub.processed_at,
    gs.winning_numbers,
    gs.results_data->>'special_prize' as special_prize,
    RIGHT(gs.results_data->>'special_prize', 2) as last_two_special,
    -- Kiểm tra logic thắng
    (ub.numbers && gs.winning_numbers) as array_overlap,
    (RIGHT(gs.results_data->>'special_prize', 2) = ANY(ub.numbers)) as special_match
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;

-- ✅ Nếu có người thắng, cập nhật balance và tạo transaction
DO $$
DECLARE
    bet_record RECORD;
    current_balance NUMERIC;
    new_balance NUMERIC;
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
            bet_record.id,
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
    END LOOP;
END $$;

-- ✅ Kiểm tra kết quả cuối cùng
SELECT 
    'SUMMARY' as type,
    COUNT(*) as total_bets,
    COUNT(*) FILTER (WHERE status = 'won') as won_bets,
    COUNT(*) FILTER (WHERE status = 'lost') as lost_bets,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_bets,
    SUM(win_amount) as total_winnings
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;
