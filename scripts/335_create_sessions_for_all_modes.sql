-- Tạo session cho tất cả các mode (1p, 5p, 30p)
DO $$
DECLARE
    base_date date := CURRENT_DATE;
    base_time timestamp;
    session_1p bigint;
    session_5p bigint;
    session_30p bigint;
BEGIN
    -- Tính session number base cho hôm nay
    session_1p := (EXTRACT(YEAR FROM base_date) * 10000 + 
                   EXTRACT(MONTH FROM base_date) * 100 + 
                   EXTRACT(DAY FROM base_date)) * 1000 + 1000;
    session_5p := session_1p + 1000; -- 2000 prefix
    session_30p := session_1p + 2000; -- 3000 prefix

    -- Xóa session cũ nếu có
    DELETE FROM game_sessions WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_5p', 'lode_nhanh_30p');

    -- Tạo session 1 phút (mỗi phút)
    FOR i IN 0..59 LOOP
        base_time := base_date + INTERVAL '1 hour' * 8 + INTERVAL '1 minute' * i; -- Bắt đầu từ 8:00
        
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

    -- Tạo session 5 phút (mỗi 5 phút)
    FOR i IN 0..11 LOOP -- 12 session trong 1 giờ
        base_time := base_date + INTERVAL '1 hour' * 8 + INTERVAL '5 minutes' * i;
        
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

    -- Tạo session 30 phút (mỗi 30 phút)
    FOR i IN 0..1 LOOP -- 2 session trong 1 giờ
        base_time := base_date + INTERVAL '1 hour' * 8 + INTERVAL '30 minutes' * i;
        
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
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions
FROM game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_5p', 'lode_nhanh_30p')
GROUP BY game_type
ORDER BY game_type;
