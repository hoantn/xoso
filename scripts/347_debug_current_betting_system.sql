-- 🔍 KIỂM TRA HỆ THỐNG CƯỢC HIỆN TẠI

-- BƯỚC 1: Kiểm tra phiên #1634
SELECT 
    '🎯 THÔNG TIN PHIÊN 1634' as title,
    id,
    session_number,
    game_type,
    status,
    draw_time,
    created_at,
    winning_numbers,
    results_data->>'special_prize' as special_prize
FROM game_sessions 
WHERE session_number = 1634;

-- BƯỚC 2: Kiểm tra tất cả cược cho phiên này
SELECT 
    '📋 TẤT CẢ CƯỢC CHO PHIÊN 1634' as title,
    ub.id,
    ub.user_id,
    ub.bet_type,
    ub.numbers,
    ub.amount,
    ub.status,
    ub.created_at,
    u.username
FROM user_bets ub
JOIN users u ON ub.user_id = u.id
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 1634
ORDER BY ub.created_at DESC;

-- BƯỚC 3: Kiểm tra các phiên gần đây có cược
SELECT 
    '📊 THỐNG KÊ CƯỢC CÁC PHIÊN GẦN ĐÂY' as title,
    gs.session_number,
    gs.game_type,
    gs.status,
    gs.created_at,
    COUNT(ub.id) as total_bets,
    COUNT(ub.id) FILTER (WHERE ub.status = 'pending') as pending_bets,
    COUNT(ub.id) FILTER (WHERE ub.status = 'won') as won_bets,
    COUNT(ub.id) FILTER (WHERE ub.status = 'lost') as lost_bets
FROM game_sessions gs
LEFT JOIN user_bets ub ON gs.id = ub.session_id
WHERE gs.created_at >= NOW() - INTERVAL '2 hours'
GROUP BY gs.id, gs.session_number, gs.game_type, gs.status, gs.created_at
ORDER BY gs.session_number DESC
LIMIT 10;

-- BƯỚC 4: Kiểm tra phiên đang mở (open)
SELECT 
    '🔓 CÁC PHIÊN ĐANG MỞ' as title,
    id,
    session_number,
    game_type,
    status,
    draw_time,
    created_at,
    CASE 
        WHEN draw_time > NOW() THEN 'Chưa đến giờ quay'
        WHEN draw_time <= NOW() THEN 'Đã đến giờ quay'
    END as draw_status
FROM game_sessions 
WHERE status = 'open'
ORDER BY session_number DESC
LIMIT 5;

-- BƯỚC 5: Kiểm tra user có balance để đặt cược không
SELECT 
    '💰 TOP USERS CÓ BALANCE' as title,
    id,
    username,
    balance,
    created_at
FROM users 
WHERE balance > 0
ORDER BY balance DESC
LIMIT 5;

-- BƯỚC 6: Kiểm tra API đặt cược có hoạt động không
-- (Kiểm tra các cược được tạo gần đây)
SELECT 
    '🕐 CƯỢC GẦN ĐÂY NHẤT' as title,
    ub.id,
    ub.user_id,
    u.username,
    ub.bet_type,
    ub.numbers,
    ub.amount,
    ub.status,
    ub.created_at,
    gs.session_number,
    gs.game_type
FROM user_bets ub
JOIN users u ON ub.user_id = u.id
JOIN game_sessions gs ON ub.session_id = gs.id
ORDER BY ub.created_at DESC
LIMIT 10;

-- BƯỚC 7: Tạo một phiên test và cược test
DO $$
DECLARE
    test_session_id UUID;
    test_user_id UUID;
    test_bet_id UUID;
BEGIN
    -- Tìm user có balance
    SELECT id INTO test_user_id 
    FROM users 
    WHERE balance > 100000 
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Không tìm thấy user có balance để test';
        RETURN;
    END IF;
    
    -- Tạo phiên test
    INSERT INTO game_sessions (
        game_type,
        session_number,
        draw_time,
        status,
        created_at
    ) VALUES (
        'lode_nhanh_1p',
        (SELECT COALESCE(MAX(session_number), 0) + 1 FROM game_sessions WHERE game_type = 'lode_nhanh_1p'),
        NOW() + INTERVAL '2 minutes',
        'open',
        NOW()
    ) RETURNING id INTO test_session_id;
    
    -- Tạo cược test
    INSERT INTO user_bets (
        user_id,
        session_id,
        bet_type,
        numbers,
        amount,
        status,
        created_at
    ) VALUES (
        test_user_id,
        test_session_id,
        'lo_2_so_1p',
        ARRAY['12', '34'],
        50000,
        'pending',
        NOW()
    ) RETURNING id INTO test_bet_id;
    
    RAISE NOTICE '✅ ĐÃ TẠO PHIÊN TEST:';
    RAISE NOTICE '   Session ID: %', test_session_id;
    RAISE NOTICE '   User ID: %', test_user_id;
    RAISE NOTICE '   Bet ID: %', test_bet_id;
    RAISE NOTICE '   Có thể test quay số thủ công với session này';
    
END $$;

-- BƯỚC 8: Hiển thị phiên test vừa tạo
SELECT 
    '🧪 PHIÊN TEST VỪA TẠO' as title,
    gs.id as session_id,
    gs.session_number,
    gs.game_type,
    gs.status,
    gs.draw_time,
    COUNT(ub.id) as total_bets,
    ARRAY_AGG(ub.numbers) as bet_numbers,
    ARRAY_AGG(u.username) as usernames
FROM game_sessions gs
LEFT JOIN user_bets ub ON gs.id = ub.session_id
LEFT JOIN users u ON ub.user_id = u.id
WHERE gs.created_at >= NOW() - INTERVAL '1 minute'
GROUP BY gs.id, gs.session_number, gs.game_type, gs.status, gs.draw_time
ORDER BY gs.created_at DESC
LIMIT 1;
