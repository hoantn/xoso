-- Kiểm tra phiên #2336 có cược nào không
SELECT 
    gs.id as session_id,
    gs.session_number,
    gs.game_type,
    gs.status,
    COUNT(ub.id) as total_bets,
    COUNT(CASE WHEN ub.status = 'pending' THEN 1 END) as pending_bets,
    COUNT(CASE WHEN ub.status = 'won' THEN 1 END) as won_bets,
    COUNT(CASE WHEN ub.status = 'lost' THEN 1 END) as lost_bets
FROM game_sessions gs
LEFT JOIN user_bets ub ON gs.id = ub.session_id
WHERE gs.session_number = 2336
GROUP BY gs.id, gs.session_number, gs.game_type, gs.status;

-- Tạo cược test cho phiên tiếp theo
INSERT INTO user_bets (
    user_id,
    session_id,
    bet_type,
    numbers,
    amount,
    potential_win,
    status
) 
SELECT 
    u.id as user_id,
    gs.id as session_id,
    'lo_2_so_1p' as bet_type,
    ARRAY['99', '19'] as numbers, -- Sử dụng 2 số từ comprehensive winning numbers
    50000 as amount,
    4950000 as potential_win, -- 50k * 99
    'pending' as status
FROM users u
CROSS JOIN game_sessions gs
WHERE gs.status = 'open' 
  AND gs.game_type = 'lode_nhanh_1p'
  AND u.balance >= 50000
LIMIT 1;

-- Kiểm tra cược vừa tạo
SELECT 
    ub.id,
    ub.user_id,
    ub.session_id,
    gs.session_number,
    ub.bet_type,
    ub.numbers,
    ub.amount,
    ub.status,
    ub.created_at
FROM user_bets ub
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE ub.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY ub.created_at DESC;
