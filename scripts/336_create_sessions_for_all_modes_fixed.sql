-- Tạo session cho tất cả các mode (1p, 5p, 30p) với session_number đơn giản
DO $$
DECLARE
    base_date date := CURRENT_DATE;
    base_time timestamp;
    current_hour int := EXTRACT(HOUR FROM NOW());
    session_1p int;
    session_5p int;
    session_30p int;
BEGIN
    -- Tính session number đơn giản cho hôm nay
    session_1p := 1000; -- Bắt đầu từ 1000
    session_5p := 2000; -- Bắt đầu từ 2000  
    session_30p := 3000; -- Bắt đầu từ 3000

    -- Xóa session cũ nếu có
    DELETE FROM game_sessions WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_5p', 'lode_nhanh_30p');

    -- Tạo session 1 phút (60 session cho 1 giờ tới)
    FOR i IN 0..59 LOOP
        base_time := DATE_TRUNC('hour', NOW()) + INTERVAL '1 minute' * i;
        
        INSERT INTO game_sessions (
            game_type, session_number, start_time, end_time, draw_time, status,
            results_data, winning_numbers
        ) VALUES (
            'lode_nhanh_1p',
            session_1p + i + 1,
            base_time,
            base_time + INTERVAL '1 minute',
            base_time + INTERVAL '1 minute',
            CASE 
                WHEN base_time + INTERVAL '1 minute' > NOW() THEN 'open'
                ELSE 'completed'
            END,
            jsonb_build_object(
                'issue', (session_1p + i + 1)::text,
                'status', CASE WHEN base_time + INTERVAL '1 minute' > NOW() THEN 'accepting_bets' ELSE 'completed' END,
                'special_prize', LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                'first_prize', ARRAY[LPAD((RANDOM() * 100000)::int::text, 5, '0')],
                'second_prize', ARRAY[
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0')
                ],
                'third_prize', ARRAY[
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0')
                ],
                'fourth_prize', ARRAY[
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0')
                ],
                'fifth_prize', ARRAY[
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0')
                ],
                'sixth_prize', ARRAY[
                    LPAD((RANDOM() * 100)::int::text, 2, '0'),
                    LPAD((RANDOM() * 100)::int::text, 2, '0'),
                    LPAD((RANDOM() * 100)::int::text, 2, '0')
                ],
                'seventh_prize', ARRAY[
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text
                ]
            ),
            CASE 
                WHEN base_time + INTERVAL '1 minute' <= NOW() THEN 
                    ARRAY[
                        LPAD((RANDOM() * 100)::int::text, 2, '0'),
                        LPAD((RANDOM() * 100)::int::text, 2, '0')
                    ]
                ELSE NULL
            END
        );
    END LOOP;

    -- Tạo session 5 phút (12 session cho 1 giờ tới)
    FOR i IN 0..11 LOOP
        base_time := DATE_TRUNC('hour', NOW()) + INTERVAL '5 minutes' * i;
        
        INSERT INTO game_sessions (
            game_type, session_number, start_time, end_time, draw_time, status,
            results_data, winning_numbers
        ) VALUES (
            'lode_nhanh_5p',
            session_5p + i + 1,
            base_time,
            base_time + INTERVAL '5 minutes',
            base_time + INTERVAL '5 minutes',
            CASE 
                WHEN base_time + INTERVAL '5 minutes' > NOW() THEN 'open'
                ELSE 'completed'
            END,
            jsonb_build_object(
                'issue', (session_5p + i + 1)::text,
                'status', CASE WHEN base_time + INTERVAL '5 minutes' > NOW() THEN 'accepting_bets' ELSE 'completed' END,
                'special_prize', LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                'first_prize', ARRAY[LPAD((RANDOM() * 100000)::int::text, 5, '0')],
                'second_prize', ARRAY[
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0')
                ],
                'third_prize', ARRAY[
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0')
                ],
                'fourth_prize', ARRAY[
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0')
                ],
                'fifth_prize', ARRAY[
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0')
                ],
                'sixth_prize', ARRAY[
                    LPAD((RANDOM() * 100)::int::text, 2, '0'),
                    LPAD((RANDOM() * 100)::int::text, 2, '0'),
                    LPAD((RANDOM() * 100)::int::text, 2, '0')
                ],
                'seventh_prize', ARRAY[
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text
                ]
            ),
            CASE 
                WHEN base_time + INTERVAL '5 minutes' <= NOW() THEN 
                    ARRAY[
                        LPAD((RANDOM() * 100)::int::text, 2, '0'),
                        LPAD((RANDOM() * 100)::int::text, 2, '0')
                    ]
                ELSE NULL
            END
        );
    END LOOP;

    -- Tạo session 30 phút (2 session cho 1 giờ tới)
    FOR i IN 0..1 LOOP
        base_time := DATE_TRUNC('hour', NOW()) + INTERVAL '30 minutes' * i;
        
        INSERT INTO game_sessions (
            game_type, session_number, start_time, end_time, draw_time, status,
            results_data, winning_numbers
        ) VALUES (
            'lode_nhanh_30p',
            session_30p + i + 1,
            base_time,
            base_time + INTERVAL '30 minutes',
            base_time + INTERVAL '30 minutes',
            CASE 
                WHEN base_time + INTERVAL '30 minutes' > NOW() THEN 'open'
                ELSE 'completed'
            END,
            jsonb_build_object(
                'issue', (session_30p + i + 1)::text,
                'status', CASE WHEN base_time + INTERVAL '30 minutes' > NOW() THEN 'accepting_bets' ELSE 'completed' END,
                'special_prize', LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                'first_prize', ARRAY[LPAD((RANDOM() * 100000)::int::text, 5, '0')],
                'second_prize', ARRAY[
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0')
                ],
                'third_prize', ARRAY[
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0'),
                    LPAD((RANDOM() * 100000)::int::text, 5, '0')
                ],
                'fourth_prize', ARRAY[
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0'),
                    LPAD((RANDOM() * 10000)::int::text, 4, '0')
                ],
                'fifth_prize', ARRAY[
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0'),
                    LPAD((RANDOM() * 1000)::int::text, 3, '0')
                ],
                'sixth_prize', ARRAY[
                    LPAD((RANDOM() * 100)::int::text, 2, '0'),
                    LPAD((RANDOM() * 100)::int::text, 2, '0'),
                    LPAD((RANDOM() * 100)::int::text, 2, '0')
                ],
                'seventh_prize', ARRAY[
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text,
                    (RANDOM() * 10)::int::text
                ]
            ),
            CASE 
                WHEN base_time + INTERVAL '30 minutes' <= NOW() THEN 
                    ARRAY[
                        LPAD((RANDOM() * 100)::int::text, 2, '0'),
                        LPAD((RANDOM() * 100)::int::text, 2, '0')
                    ]
                ELSE NULL
            END
        );
    END LOOP;

    RAISE NOTICE 'Created sessions for all modes (1p, 5p, 30p)';
END $$;

-- Kiểm tra kết quả
SELECT 
    game_type,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'open') as open_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    MIN(session_number) as min_session,
    MAX(session_number) as max_session
FROM game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_5p', 'lode_nhanh_30p')
GROUP BY game_type
ORDER BY game_type;

-- Kiểm tra session đang mở
SELECT 
    game_type,
    session_number,
    start_time,
    end_time,
    status,
    EXTRACT(EPOCH FROM (end_time - NOW())) as seconds_remaining
FROM game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_5p', 'lode_nhanh_30p')
  AND status = 'open'
ORDER BY game_type, start_time;
