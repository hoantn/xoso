-- 🔧 SỬA LỖI THIẾU END_TIME KHI TẠO SESSION

-- BƯỚC 1: Kiểm tra cấu trúc bảng game_sessions
SELECT 
    '📋 CẤU TRÚC BẢNG GAME_SESSIONS' as title,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'game_sessions' 
ORDER BY ordinal_position;

-- BƯỚC 2: Kiểm tra các phiên hiện tại
SELECT 
    '🎯 CÁC PHIÊN HIỆN TẠI' as title,
    id,
    session_number,
    game_type,
    status,
    start_time,
    end_time,
    draw_time,
    created_at
FROM game_sessions 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY session_number DESC
LIMIT 5;

-- BƯỚC 3: Kiểm tra user có balance
SELECT 
    '💰 USERS CÓ BALANCE' as title,
    id,
    username,
    balance
FROM users 
WHERE balance > 100000
ORDER BY balance DESC
LIMIT 3;

-- BƯỚC 4: Tạo phiên test với đầy đủ thông tin
DO $$
DECLARE
    test_session_id UUID;
    test_user_id UUID;
    test_bet_id UUID;
    next_session_number INTEGER;
    session_start_time TIMESTAMP WITH TIME ZONE;
    session_end_time TIMESTAMP WITH TIME ZONE;
    session_draw_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Tìm user có balance
    SELECT id INTO test_user_id 
    FROM users 
    WHERE balance > 100000 
    ORDER BY balance DESC
    LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ Không tìm thấy user có balance để test';
        RETURN;
    END IF;
    
    -- Tính session number tiếp theo
    SELECT COALESCE(MAX(session_number), 2000) + 1 
    INTO next_session_number
    FROM game_sessions 
    WHERE game_type = 'lode_nhanh_1p';
    
    -- Tính thời gian
    session_start_time := NOW();
    session_end_time := session_start_time + INTERVAL '3 minutes';
    session_draw_time := session_end_time;
    
    -- Tạo phiên test với đầy đủ thông tin
    INSERT INTO game_sessions (
        game_type,
        session_number,
        start_time,
        end_time,
        draw_time,
        status,
        results_data,
        created_at,
        updated_at
    ) VALUES (
        'lode_nhanh_1p',
        next_session_number,
        session_start_time,
        session_end_time,
        session_draw_time,
        'open',
        jsonb_build_object(
            'issue', next_session_number::text,
            'status', 'accepting_bets',
            'description', 'lode_nhanh_1p - Test Session',
            'session_type', 'lode_nhanh_1p',
            'duration_minutes', 3
        ),
        session_start_time,
        session_start_time
    ) RETURNING id INTO test_session_id;
    
    -- Tạo cược test
    INSERT INTO user_bets (
        user_id,
        session_id,
        bet_type,
        numbers,
        amount,
        potential_win,
        status,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        test_session_id,
        'lo_2_so_1p',
        ARRAY['12', '34'],
        50000,
        50000 * 99, -- Tỷ lệ 1:99 cho lô 2 số
        'pending',
        NOW(),
        NOW()
    ) RETURNING id INTO test_bet_id;
    
    RAISE NOTICE '✅ ĐÃ TẠO PHIÊN TEST THÀNH CÔNG:';
    RAISE NOTICE '   📍 Session ID: %', test_session_id;
    RAISE NOTICE '   🔢 Session Number: %', next_session_number;
    RAISE NOTICE '   👤 User ID: %', test_user_id;
    RAISE NOTICE '   🎲 Bet ID: %', test_bet_id;
    RAISE NOTICE '   ⏰ Start Time: %', session_start_time;
    RAISE NOTICE '   ⏰ End Time: %', session_end_time;
    RAISE NOTICE '   🎯 Bet Numbers: [12, 34]';
    RAISE NOTICE '   💰 Bet Amount: 50,000 VND';
    RAISE NOTICE '   🏆 Potential Win: 4,950,000 VND';
    RAISE NOTICE '';
    RAISE NOTICE '🎮 BÂY GIỜ CÓ THỂ TEST QUAY SỐ THỦ CÔNG!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ LỖI KHI TẠO PHIÊN TEST: %', SQLERRM;
END $$;

-- BƯỚC 5: Hiển thị phiên test vừa tạo
SELECT 
    '🧪 PHIÊN TEST VỪA TẠO' as title,
    gs.id as session_id,
    gs.session_number,
    gs.game_type,
    gs.status,
    gs.start_time,
    gs.end_time,
    gs.draw_time,
    COUNT(ub.id) as total_bets,
    ARRAY_AGG(ub.numbers) FILTER (WHERE ub.id IS NOT NULL) as bet_numbers,
    ARRAY_AGG(u.username) FILTER (WHERE u.username IS NOT NULL) as usernames,
    SUM(ub.amount) FILTER (WHERE ub.amount IS NOT NULL) as total_bet_amount
FROM game_sessions gs
LEFT JOIN user_bets ub ON gs.id = ub.session_id
LEFT JOIN users u ON ub.user_id = u.id
WHERE gs.created_at >= NOW() - INTERVAL '2 minutes'
  AND gs.game_type = 'lode_nhanh_1p'
GROUP BY gs.id, gs.session_number, gs.game_type, gs.status, gs.start_time, gs.end_time, gs.draw_time
ORDER BY gs.created_at DESC
LIMIT 1;

-- BƯỚC 6: Kiểm tra tất cả phiên đang mở
SELECT 
    '🔓 TẤT CẢ PHIÊN ĐANG MỞ' as title,
    gs.session_number,
    gs.game_type,
    gs.status,
    gs.draw_time,
    COUNT(ub.id) as total_bets,
    CASE 
        WHEN gs.draw_time > NOW() THEN 'Chưa đến giờ quay (' || EXTRACT(EPOCH FROM (gs.draw_time - NOW()))::INTEGER || 's)'
        WHEN gs.draw_time <= NOW() THEN 'Đã đến giờ quay!'
    END as draw_status
FROM game_sessions gs
LEFT JOIN user_bets ub ON gs.id = ub.session_id
WHERE gs.status = 'open'
GROUP BY gs.id, gs.session_number, gs.game_type, gs.status, gs.draw_time
ORDER BY gs.session_number DESC
LIMIT 5;

-- BƯỚC 7: Hướng dẫn test
SELECT 
    '📖 HƯỚNG DẪN TEST' as title,
    'Bây giờ có thể vào /admin95 và thực hiện Quay Số Thủ Công' as instruction,
    'Phiên test có cược thật sẽ được xử lý chính xác' as note;
