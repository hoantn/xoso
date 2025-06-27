-- Create Lode Nhanh sample data with correct database schema
-- Based on actual game_sessions table structure

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

-- Main function to create Lode Nhanh sample data
CREATE OR REPLACE FUNCTION create_lode_nhanh_sample_data()
RETURNS TABLE(
    status TEXT,
    message TEXT,
    session_id UUID,
    game_type TEXT,
    session_number INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    -- Game types
    game_1p TEXT := 'lode_nhanh_1p';
    game_3p TEXT := 'lode_nhanh_3p';
    
    -- Current time
    base_time TIMESTAMPTZ := NOW();
    
    -- Loop variables
    i INT;
    session_time TIMESTAMPTZ;
    session_number_val INTEGER;
    winning_numbers_val TEXT[];
    results_data_val JSONB;
    existing_session_id UUID;
    new_session_id UUID;
    
    -- Sample prizes for variety
    special_prizes TEXT[] := ARRAY['12456', '37649', '23488', '81062', '74268', '95123', '46789', '58901', '67234', '89567', '34890', '12345', '67890', '45678', '90123', '56789', '78901', '23456', '89012', '34567'];
    
    -- Prize variables
    special_prize TEXT;
    first_prize TEXT;
    
BEGIN
    -- Create Lode Nhanh 1 Phut data (20 completed sessions)
    FOR i IN 1..20 LOOP
        -- Calculate session time (every minute backwards)
        session_time := base_time - (i || ' minutes')::INTERVAL;
        
        -- Generate session number as YYYYMMDDHHMM (INTEGER format)
        session_number_val := (
            EXTRACT(YEAR FROM session_time)::TEXT ||
            LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(MINUTE FROM session_time)::TEXT, 2, '0')
        )::INTEGER;
        
        -- Generate lottery results
        special_prize := special_prizes[((i - 1) % array_length(special_prizes, 1)) + 1];
        first_prize := generate_5_digit();
        
        -- Winning numbers (last 2 digits of special prize)
        winning_numbers_val := ARRAY[RIGHT(special_prize, 2)];
        
        -- Create complete results data matching existing structure
        results_data_val := jsonb_build_object(
            'issue', session_number_val::TEXT,
            'opendate', TO_CHAR(session_time, 'YYYY-MM-DD HH24:MI:SS'),
            'special_prize', special_prize,
            'first_prize', first_prize,
            'second_prize', jsonb_build_array(generate_5_digit(), generate_5_digit()),
            'third_prize', jsonb_build_array(
                generate_5_digit(), generate_5_digit(), generate_5_digit(),
                generate_5_digit(), generate_5_digit(), generate_5_digit()
            ),
            'fourth_prize', jsonb_build_array(
                generate_4_digit(), generate_4_digit(), generate_4_digit(), generate_4_digit()
            ),
            'fifth_prize', jsonb_build_array(
                generate_4_digit(), generate_4_digit(), generate_4_digit(),
                generate_4_digit(), generate_4_digit(), generate_4_digit()
            ),
            'sixth_prize', jsonb_build_array(
                generate_3_digit(), generate_3_digit(), generate_3_digit()
            ),
            'seventh_prize', jsonb_build_array(
                generate_2_digit(), generate_2_digit(), generate_2_digit(), generate_2_digit()
            )
        );
        
        -- Check if session exists
        SELECT gs.id INTO existing_session_id
        FROM public.game_sessions gs
        WHERE gs.game_type = game_1p 
          AND gs.session_number = session_number_val;
        
        IF existing_session_id IS NOT NULL THEN
            -- Update existing
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
    
    -- Create Lode Nhanh 3 Phut data (20 completed sessions)
    FOR i IN 1..20 LOOP
        -- Calculate session time (every 3 minutes backwards)
        session_time := base_time - (i * 3 || ' minutes')::INTERVAL;
        
        -- Generate session number as YYYYMMDDHHMM (INTEGER format)
        session_number_val := (
            EXTRACT(YEAR FROM session_time)::TEXT ||
            LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
            LPAD((EXTRACT(MINUTE FROM session_time)::INT / 3 * 3)::TEXT, 2, '0')
        )::INTEGER;
        
        -- Generate different lottery results for 3p game
        special_prize := special_prizes[((i + 10 - 1) % array_length(special_prizes, 1)) + 1];
        first_prize := generate_5_digit();
        
        -- Winning numbers (last 2 digits of special prize)
        winning_numbers_val := ARRAY[RIGHT(special_prize, 2)];
        
        -- Create complete results data with bonus info
        results_data_val := jsonb_build_object(
            'issue', session_number_val::TEXT,
            'opendate', TO_CHAR(session_time, 'YYYY-MM-DD HH24:MI:SS'),
            'special_prize', special_prize,
            'first_prize', first_prize,
            'second_prize', jsonb_build_array(generate_5_digit(), generate_5_digit()),
            'third_prize', jsonb_build_array(
                generate_5_digit(), generate_5_digit(), generate_5_digit(),
                generate_5_digit(), generate_5_digit(), generate_5_digit()
            ),
            'fourth_prize', jsonb_build_array(
                generate_4_digit(), generate_4_digit(), generate_4_digit(), generate_4_digit()
            ),
            'fifth_prize', jsonb_build_array(
                generate_4_digit(), generate_4_digit(), generate_4_digit(),
                generate_4_digit(), generate_4_digit(), generate_4_digit()
            ),
            'sixth_prize', jsonb_build_array(
                generate_3_digit(), generate_3_digit(), generate_3_digit()
            ),
            'seventh_prize', jsonb_build_array(
                generate_2_digit(), generate_2_digit(), generate_2_digit(), generate_2_digit()
            ),
            'bonus_info', jsonb_build_object(
                'multiplier', CASE WHEN (i % 5) = 0 THEN 2.0 ELSE 1.0 END,
                'special_round', (i % 5) = 0,
                'description', CASE WHEN (i % 5) = 0 THEN 'Phiên đặc biệt x2' ELSE 'Phiên thường' END
            )
        );
        
        -- Check if session exists
        SELECT gs.id INTO existing_session_id
        FROM public.game_sessions gs
        WHERE gs.game_type = game_3p 
          AND gs.session_number = session_number_val;
        
        IF existing_session_id IS NOT NULL THEN
            -- Update existing
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
    
    -- Create current open sessions
    
    -- Open 1p session
    session_time := base_time + INTERVAL '1 minute';
    session_number_val := (
        EXTRACT(YEAR FROM session_time)::TEXT ||
        LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(MINUTE FROM session_time)::TEXT, 2, '0')
    )::INTEGER;
    
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
            results_data
        ) VALUES (
            game_1p,
            session_number_val,
            session_time - INTERVAL '1 minute',
            session_time,
            session_time,
            'open',
            jsonb_build_object(
                'issue', session_number_val::TEXT,
                'status', 'accepting_bets',
                'description', 'Lô đề nhanh 1 phút - Đang nhận cược'
            )
        ) RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT 'inserted'::TEXT, 
                           ('Open 1p session: ' || session_number_val::TEXT)::TEXT,
                           new_session_id,
                           game_1p,
                           session_number_val;
    END IF;
    
    -- Open 3p session
    session_time := base_time + INTERVAL '3 minutes';
    session_number_val := (
        EXTRACT(YEAR FROM session_time)::TEXT ||
        LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
        LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
        LPAD(((EXTRACT(MINUTE FROM session_time)::INT / 3 + 1) * 3)::TEXT, 2, '0')
    )::INTEGER;
    
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
            results_data
        ) VALUES (
            game_3p,
            session_number_val,
            session_time - INTERVAL '3 minutes',
            session_time,
            session_time,
            'open',
            jsonb_build_object(
                'issue', session_number_val::TEXT,
                'status', 'accepting_bets',
                'description', 'Lô đề nhanh 3 phút - Đang nhận cược',
                'bonus_info', jsonb_build_object(
                    'multiplier', 1.0,
                    'special_round', false,
                    'description', 'Phiên thường'
                )
            )
        ) RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT 'inserted'::TEXT, 
                           ('Open 3p session: ' || session_number_val::TEXT)::TEXT,
                           new_session_id,
                           game_3p,
                           session_number_val;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'error'::TEXT, 
                       ('Error: ' || SQLERRM)::TEXT,
                       NULL::UUID,
                       NULL::TEXT,
                       NULL::INTEGER;
END;
$$;

-- Execute the function
SELECT * FROM create_lode_nhanh_sample_data();

-- Clean up helper functions
DROP FUNCTION IF EXISTS generate_5_digit();
DROP FUNCTION IF EXISTS generate_4_digit();
DROP FUNCTION IF EXISTS generate_3_digit();
DROP FUNCTION IF EXISTS generate_2_digit();
DROP FUNCTION IF EXISTS create_lode_nhanh_sample_data();

-- Verify created data
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

-- Show recent results for UI display
SELECT 
    game_type,
    session_number,
    status,
    winning_numbers[1] as winning_number,
    results_data->>'special_prize' as special_prize,
    TO_CHAR(draw_time, 'HH24:MI DD/MM') as draw_time_formatted,
    results_data
FROM public.game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_3p')
  AND status = 'completed'
ORDER BY game_type, session_number DESC
LIMIT 10;
