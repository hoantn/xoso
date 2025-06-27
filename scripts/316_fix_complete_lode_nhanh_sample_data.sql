-- Complete Lode Nhanh sample data with full prize structure (8 prizes like Mien Bac)
-- Creates data for both 1-minute and 3-minute Lode Nhanh games

-- Helper functions for generating random numbers
CREATE OR REPLACE FUNCTION generate_5_digit() RETURNS TEXT AS $$
BEGIN
    RETURN LPAD((RANDOM() * 99999)::INT::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_4_digit() RETURNS TEXT AS $$
BEGIN
    RETURN LPAD((RANDOM() * 9999)::INT::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_3_digit() RETURNS TEXT AS $$
BEGIN
    RETURN LPAD((RANDOM() * 999)::INT::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_2_digit() RETURNS TEXT AS $$
BEGIN
    RETURN LPAD((RANDOM() * 99)::INT::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- Main function to initialize complete sample data
CREATE OR REPLACE FUNCTION initialize_complete_lode_nhanh_sample_data()
RETURNS TABLE(
    status TEXT,
    message TEXT,
    session_id UUID,
    game_type TEXT,
    session_number BIGINT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    -- Game types
    game_1p TEXT := 'lode_nhanh_1p';
    game_3p TEXT := 'lode_nhanh_3p';
    
    -- Current time for calculations
    current_time TIMESTAMP WITH TIME ZONE := NOW();
    
    -- Variables for loop
    i INT;
    session_time TIMESTAMP WITH TIME ZONE;
    session_number_val BIGINT;
    winning_numbers_val TEXT[];
    results_data_val JSONB;
    existing_session_id UUID;
    new_session_id UUID;
    
    -- Sample data arrays for generating realistic lottery numbers
    special_prizes TEXT[] := ARRAY['12456', '37649', '23488', '81062', '74268', '95123', '46789', '58901', '67234', '89567', '34890', '12345', '67890', '45678', '90123', '56789', '78901', '23456', '89012', '34567'];
    
    special_prize TEXT;
    first_prize TEXT;
    second_prize JSONB;
    third_prize JSONB;
    fourth_prize JSONB;
    fifth_prize JSONB;
    sixth_prize JSONB;
    seventh_prize JSONB;
    
    minutes_since_hour INT;
    next_3min_boundary INT;
    
BEGIN
    -- Initialize Lode Nhanh 1 Phut (1-minute game) - Last 20 completed sessions
    FOR i IN 1..20 LOOP
        -- Calculate session time (every minute, going backwards)
        session_time := DATE_TRUNC('minute', current_time) - INTERVAL '1 minute' * i;
        
        -- Generate session number based on timestamp (YYYYMMDDHHMM format)
        session_number_val := (
            EXTRACT(YEAR FROM session_time)::TEXT ||
            LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(MINUTE FROM session_time)::TEXT, 2, '0')
        )::BIGINT;
        
        -- Generate complete lottery results (8 prizes structure)
        special_prize := special_prizes[((i - 1) % array_length(special_prizes, 1)) + 1];
        first_prize := generate_5_digit();
        
        -- Generate all prizes with proper structure
        second_prize := jsonb_build_array(generate_5_digit(), generate_5_digit());
        third_prize := jsonb_build_array(
            generate_5_digit(), generate_5_digit(), generate_5_digit(),
            generate_5_digit(), generate_5_digit(), generate_5_digit()
        );
        fourth_prize := jsonb_build_array(
            generate_4_digit(), generate_4_digit(), generate_4_digit(), generate_4_digit()
        );
        fifth_prize := jsonb_build_array(
            generate_4_digit(), generate_4_digit(), generate_4_digit(),
            generate_4_digit(), generate_4_digit(), generate_4_digit()
        );
        sixth_prize := jsonb_build_array(
            generate_3_digit(), generate_3_digit(), generate_3_digit()
        );
        seventh_prize := jsonb_build_array(
            generate_2_digit(), generate_2_digit(), generate_2_digit(), generate_2_digit()
        );
        
        -- Extract winning numbers for betting (last 2 digits of special prize)
        winning_numbers_val := ARRAY[RIGHT(special_prize, 2)];
        
        -- Create complete results data
        results_data_val := jsonb_build_object(
            'special_prize', special_prize,
            'first_prize', first_prize,
            'second_prize', second_prize,
            'third_prize', third_prize,
            'fourth_prize', fourth_prize,
            'fifth_prize', fifth_prize,
            'sixth_prize', sixth_prize,
            'seventh_prize', seventh_prize,
            'opendate', session_time::TEXT,
            'issue', session_number_val::TEXT,
            'game_type', 'lode_nhanh_1p',
            'session_type', '1_minute'
        );
        
        -- Check if session already exists
        SELECT gs.id INTO existing_session_id
        FROM public.game_sessions gs
        WHERE gs.game_type = game_1p 
          AND gs.session_number = session_number_val;
        
        IF existing_session_id IS NOT NULL THEN
            -- Update existing session
            UPDATE public.game_sessions
            SET winning_numbers = winning_numbers_val,
                results_data = results_data_val,
                status = 'completed',
                updated_at = NOW()
            WHERE id = existing_session_id;
            
            RETURN QUERY SELECT 'updated'::TEXT, 
                               ('Updated 1p session: ' || session_number_val::TEXT)::TEXT,
                               existing_session_id,
                               game_1p,
                               session_number_val;
        ELSE
            -- Insert new session
            INSERT INTO public.game_sessions (
                game_type,
                session_number,
                start_time,
                end_time,
                draw_time,
                status,
                winning_numbers,
                results_data
            ) VALUES (
                game_1p,
                session_number_val,
                session_time - INTERVAL '1 minute',
                session_time,
                session_time,
                'completed',
                winning_numbers_val,
                results_data_val
            ) RETURNING id INTO new_session_id;
            
            RETURN QUERY SELECT 'inserted'::TEXT, 
                               ('Inserted 1p session: ' || session_number_val::TEXT)::TEXT,
                               new_session_id,
                               game_1p,
                               session_number_val;
        END IF;
    END LOOP;
    
    -- Initialize Lode Nhanh 3 Phut (3-minute game) - Last 20 completed sessions
    FOR i IN 1..20 LOOP
        -- Calculate session time (every 3 minutes, going backwards)
        session_time := DATE_TRUNC('minute', current_time) - INTERVAL '3 minutes' * i;
        -- Round to 3-minute boundaries
        session_time := DATE_TRUNC('hour', session_time) + 
                       INTERVAL '1 minute' * (FLOOR(EXTRACT(MINUTE FROM session_time) / 3) * 3);
        
        -- Generate session number based on timestamp
        session_number_val := (
            EXTRACT(YEAR FROM session_time)::TEXT ||
            LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(MINUTE FROM session_time)::TEXT, 2, '0')
        )::BIGINT;
        
        -- Generate different lottery results for 3p game
        special_prize := special_prizes[((i + 10 - 1) % array_length(special_prizes, 1)) + 1];
        first_prize := generate_5_digit();
        
        -- Generate all prizes with proper structure
        second_prize := jsonb_build_array(generate_5_digit(), generate_5_digit());
        third_prize := jsonb_build_array(
            generate_5_digit(), generate_5_digit(), generate_5_digit(),
            generate_5_digit(), generate_5_digit(), generate_5_digit()
        );
        fourth_prize := jsonb_build_array(
            generate_4_digit(), generate_4_digit(), generate_4_digit(), generate_4_digit()
        );
        fifth_prize := jsonb_build_array(
            generate_4_digit(), generate_4_digit(), generate_4_digit(),
            generate_4_digit(), generate_4_digit(), generate_4_digit()
        );
        sixth_prize := jsonb_build_array(
            generate_3_digit(), generate_3_digit(), generate_3_digit()
        );
        seventh_prize := jsonb_build_array(
            generate_2_digit(), generate_2_digit(), generate_2_digit(), generate_2_digit()
        );
        
        -- Extract winning numbers for betting (last 2 digits of special prize)
        winning_numbers_val := ARRAY[RIGHT(special_prize, 2)];
        
        -- Create complete results data with bonus info for 3p game
        results_data_val := jsonb_build_object(
            'special_prize', special_prize,
            'first_prize', first_prize,
            'second_prize', second_prize,
            'third_prize', third_prize,
            'fourth_prize', fourth_prize,
            'fifth_prize', fifth_prize,
            'sixth_prize', sixth_prize,
            'seventh_prize', seventh_prize,
            'opendate', session_time::TEXT,
            'issue', session_number_val::TEXT,
            'game_type', 'lode_nhanh_3p',
            'session_type', '3_minute',
            'bonus_info', jsonb_build_object(
                'multiplier', CASE WHEN (i % 5) = 0 THEN 2.0 ELSE 1.0 END,
                'special_round', (i % 5) = 0,
                'bonus_description', CASE WHEN (i % 5) = 0 THEN 'Phiên đặc biệt x2' ELSE 'Phiên thường' END
            )
        );
        
        -- Check if session already exists
        SELECT gs.id INTO existing_session_id
        FROM public.game_sessions gs
        WHERE gs.game_type = game_3p 
          AND gs.session_number = session_number_val;
        
        IF existing_session_id IS NOT NULL THEN
            -- Update existing session
            UPDATE public.game_sessions
            SET winning_numbers = winning_numbers_val,
                results_data = results_data_val,
                status = 'completed',
                updated_at = NOW()
            WHERE id = existing_session_id;
            
            RETURN QUERY SELECT 'updated'::TEXT, 
                               ('Updated 3p session: ' || session_number_val::TEXT)::TEXT,
                               existing_session_id,
                               game_3p,
                               session_number_val;
        ELSE
            -- Insert new session
            INSERT INTO public.game_sessions (
                game_type,
                session_number,
                start_time,
                end_time,
                draw_time,
                status,
                winning_numbers,
                results_data
            ) VALUES (
                game_3p,
                session_number_val,
                session_time - INTERVAL '3 minutes',
                session_time,
                session_time,
                'completed',
                winning_numbers_val,
                results_data_val
            ) RETURNING id INTO new_session_id;
            
            RETURN QUERY SELECT 'inserted'::TEXT, 
                               ('Inserted 3p session: ' || session_number_val::TEXT)::TEXT,
                               new_session_id,
                               game_3p,
                               session_number_val;
        END IF;
    END LOOP;
    
    -- Create current open sessions for both games
    
    -- Current 1p session (open for betting)
    session_time := DATE_TRUNC('minute', current_time) + INTERVAL '1 minute';
    session_number_val := (
        EXTRACT(YEAR FROM session_time)::TEXT ||
        LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(MINUTE FROM session_time)::TEXT, 2, '0')
    )::BIGINT;
    
    SELECT gs.id INTO existing_session_id
    FROM public.game_sessions gs
    WHERE gs.game_type = game_1p 
      AND gs.session_number = session_number_val;
    
    IF existing_session_id IS NULL THEN
        INSERT INTO public.game_sessions (
            game_type,
            session_number,
            start_time,
            end_time,
            draw_time,
            status,
            winning_numbers,
            results_data
        ) VALUES (
            game_1p,
            session_number_val,
            session_time - INTERVAL '1 minute',
            session_time,
            session_time,
            'open',
            NULL,
            jsonb_build_object(
                'session_type', '1_minute',
                'game_type', 'lode_nhanh_1p',
                'issue', session_number_val::TEXT,
                'status', 'accepting_bets',
                'description', 'Lô đề nhanh 1 phút - Đang nhận cược'
            )
        ) RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT 'inserted'::TEXT, 
                           ('Current 1p session: ' || session_number_val::TEXT)::TEXT,
                           new_session_id,
                           game_1p,
                           session_number_val;
    END IF;
    
    -- Current 3p session (open for betting)
    minutes_since_hour := EXTRACT(MINUTE FROM current_time)::INT;
    next_3min_boundary := ((minutes_since_hour / 3) + 1) * 3;
    
    IF next_3min_boundary >= 60 THEN
        session_time := DATE_TRUNC('hour', current_time) + INTERVAL '1 hour';
    ELSE
        session_time := DATE_TRUNC('hour', current_time) + (next_3min_boundary || ' minutes')::INTERVAL;
    END IF;
    
    session_number_val := (
        EXTRACT(YEAR FROM session_time)::TEXT ||
        LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(MINUTE FROM session_time)::TEXT, 2, '0')
    )::BIGINT;
    
    SELECT gs.id INTO existing_session_id
    FROM public.game_sessions gs
    WHERE gs.game_type = game_3p 
      AND gs.session_number = session_number_val;
    
    IF existing_session_id IS NULL THEN
        INSERT INTO public.game_sessions (
            game_type,
            session_number,
            start_time,
            end_time,
            draw_time,
            status,
            winning_numbers,
            results_data
        ) VALUES (
            game_3p,
            session_number_val,
            session_time - INTERVAL '3 minutes',
            session_time,
            session_time,
            'open',
            NULL,
            jsonb_build_object(
                'session_type', '3_minute',
                'game_type', 'lode_nhanh_3p',
                'issue', session_number_val::TEXT,
                'status', 'accepting_bets',
                'description', 'Lô đề nhanh 3 phút - Đang nhận cược',
                'bonus_info', jsonb_build_object(
                    'multiplier', 1.0,
                    'special_round', false,
                    'bonus_description', 'Phiên thường'
                )
            )
        ) RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT 'inserted'::TEXT, 
                           ('Current 3p session: ' || session_number_val::TEXT)::TEXT,
                           new_session_id,
                           game_3p,
                           session_number_val;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'error'::TEXT, 
                       ('Unexpected error: ' || SQLERRM)::TEXT,
                       NULL::UUID,
                       NULL::TEXT,
                       NULL::BIGINT;
END;
$$;

-- Execute the function to initialize complete sample data
SELECT * FROM initialize_complete_lode_nhanh_sample_data();

-- Clean up: Drop the helper functions after use
DROP FUNCTION IF EXISTS generate_5_digit();
DROP FUNCTION IF EXISTS generate_4_digit();
DROP FUNCTION IF EXISTS generate_3_digit();
DROP FUNCTION IF EXISTS generate_2_digit();
DROP FUNCTION IF EXISTS initialize_complete_lode_nhanh_sample_data();

-- Verify the data was created correctly
SELECT 
    game_type,
    COUNT(*) as total_sessions,
    MIN(session_number) as earliest_session,
    MAX(session_number) as latest_session,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_sessions
FROM public.game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_3p')
GROUP BY game_type
ORDER BY game_type;

-- Show latest results for recent results display
SELECT 
    game_type,
    session_number,
    status,
    winning_numbers[1] as winning_number,
    results_data->>'special_prize' as special_prize,
    TO_CHAR(draw_time, 'HH24:MI DD/MM') as draw_time_formatted,
    results_data->>'session_type' as session_type
FROM public.game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_3p')
  AND status = 'completed'
ORDER BY game_type, session_number DESC
LIMIT 10;
