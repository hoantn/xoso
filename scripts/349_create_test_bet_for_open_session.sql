-- 🧪 TẠO CƯỢC TEST CHO PHIÊN ĐANG MỞ

DO $$
DECLARE
    target_session_id UUID;
    target_user_id UUID;
    test_bet_id UUID;
    session_info RECORD;
    user_info RECORD;
BEGIN
    RAISE NOTICE '🔍 BƯỚC 1: Tìm phiên đang mở...';
    
    -- Tìm phiên đang mở
    SELECT id, session_number, game_type, draw_time, status
    INTO session_info
    FROM game_sessions 
    WHERE status = 'open' 
    AND draw_time > NOW() -- Chưa đến giờ quay
    ORDER BY session_number DESC 
    LIMIT 1;
    
    IF session_info.id IS NULL THEN
        RAISE NOTICE '❌ Không tìm thấy phiên nào đang mở và chưa đến giờ quay';
        
        -- Tạo phiên mới
        RAISE NOTICE '🆕 Tạo phiên mới...';
        INSERT INTO game_sessions (
            game_type,
            session_number,
            start_time,
            end_time,
            draw_time,
            status,
            created_at,
            updated_at
        ) VALUES (
            'lode_nhanh_1p',
            (SELECT COALESCE(MAX(session_number), 0) + 1 FROM game_sessions WHERE game_type = 'lode_nhanh_1p'),
            NOW(),
            NOW() + INTERVAL '3 minutes',
            NOW() + INTERVAL '3 minutes',
            'open',
            NOW(),
            NOW()
        ) RETURNING id, session_number, game_type INTO session_info;
        
        RAISE NOTICE '✅ Đã tạo phiên mới #% (ID: %)', session_info.session_number, session_info.id;
    ELSE
        RAISE NOTICE '✅ Tìm thấy phiên #% đang mở (ID: %)', session_info.session_number, session_info.id;
        RAISE NOTICE '   Game Type: %', session_info.game_type;
        RAISE NOTICE '   Draw Time: %', session_info.draw_time;
    END IF;
    
    target_session_id := session_info.id;
    
    RAISE NOTICE '🔍 BƯỚC 2: Tìm user có balance...';
    
    -- Tìm user có balance
    SELECT id, username, balance
    INTO user_info
    FROM users 
    WHERE balance >= 100000 
    ORDER BY balance DESC 
    LIMIT 1;
    
    IF user_info.id IS NULL THEN
        RAISE NOTICE '❌ Không tìm thấy user nào có balance >= 100,000';
        RETURN;
    END IF;
    
    target_user_id := user_info.id;
    RAISE NOTICE '✅ Tìm thấy user: % (Balance: %)', user_info.username, user_info.balance;
    
    RAISE NOTICE '🔍 BƯỚC 3: Tạo cược test...';
    
    -- Tạo cược test
    INSERT INTO user_bets (
        user_id,
        session_id,
        bet_type,
        numbers,
        amount,
        potential_win,
        status,
        created_at
    ) VALUES (
        target_user_id,
        target_session_id,
        'lo_2_so_1p',
        ARRAY['12', '34'],
        50000,
        50000 * 99, -- 4,950,000
        'pending',
        NOW()
    ) RETURNING id INTO test_bet_id;
    
    RAISE NOTICE '✅ Đã tạo cược test:';
    RAISE NOTICE '   Bet ID: %', test_bet_id;
    RAISE NOTICE '   User: % (%)', user_info.username, target_user_id;
    RAISE NOTICE '   Session: #% (%)', session_info.session_number, target_session_id;
    RAISE NOTICE '   Bet Type: lo_2_so_1p';
    RAISE NOTICE '   Numbers: [12, 34]';
    RAISE NOTICE '   Amount: 50,000 VND';
    RAISE NOTICE '   Potential Win: 4,950,000 VND';
    
    RAISE NOTICE '🎯 BƯỚC 4: Thông tin để test quay số thủ công...';
    RAISE NOTICE '   Session ID: %', target_session_id;
    RAISE NOTICE '   Có thể quay số thủ công tại /admin95';
    RAISE NOTICE '   Nếu số 12 hoặc 34 trúng → User sẽ thắng 4,950,000 VND';
    
END $$;

-- Hiển thị kết quả
SELECT 
    '🎮 PHIÊN CÓ CƯỢC ĐỂ TEST' as title,
    gs.id as session_id,
    gs.session_number,
    gs.game_type,
    gs.status,
    gs.draw_time,
    COUNT(ub.id) as total_bets,
    ARRAY_AGG(ub.numbers) as all_bet_numbers,
    ARRAY_AGG(u.username) as usernames,
    SUM(ub.amount) as total_bet_amount,
    SUM(ub.potential_win) as total_potential_win
FROM game_sessions gs
LEFT JOIN user_bets ub ON gs.id = ub.session_id AND ub.status = 'pending'
LEFT JOIN users u ON ub.user_id = u.id
WHERE gs.status = 'open'
AND gs.created_at >= NOW() - INTERVAL '10 minutes'
GROUP BY gs.id, gs.session_number, gs.game_type, gs.status, gs.draw_time
HAVING COUNT(ub.id) > 0
ORDER BY gs.session_number DESC
LIMIT 1;
