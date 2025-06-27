-- Kiểm tra chi tiết cược cho phiên 2336
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
    gs.status as session_status
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;

-- Kiểm tra xem số cược có trúng không (manual check)
-- Nếu bet_type = 'lo_2_so_1p' và numbers = ['99', '19']
-- Và winning_numbers chứa '99' hoặc '19' thì phải thắng

-- Thử xử lý lại cược này bằng tay
UPDATE user_bets 
SET 
    status = CASE 
        WHEN EXISTS (
            SELECT 1 FROM game_sessions gs 
            WHERE gs.id = user_bets.session_id 
            AND (
                user_bets.numbers && gs.winning_numbers -- Kiểm tra overlap array
                OR gs.results_data->>'special_prize' LIKE '%' || ANY(user_bets.numbers) || '%'
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
                OR gs.results_data->>'special_prize' LIKE '%' || ANY(user_bets.numbers) || '%'
            )
        ) THEN user_bets.potential_win
        ELSE 0
    END,
    processed_at = NOW(),
    updated_at = NOW()
WHERE session_id = (
    SELECT id FROM game_sessions WHERE session_number = 2336
)
AND status = 'pending';

-- Kiểm tra kết quả sau khi update
SELECT 
    ub.id as bet_id,
    ub.bet_type,
    ub.numbers,
    ub.status,
    ub.win_amount,
    gs.winning_numbers,
    gs.results_data->>'special_prize' as special_prize
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336;
