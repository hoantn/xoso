-- Fixed version: Initialize sample Lode Nhanh data for both 1-minute and 3-minute games
-- This will create recent sessions with sample results

-- Create function to initialize Lode Nhanh sample data
CREATE OR REPLACE FUNCTION initialize_lode_nhanh_sample_data()
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
    winning_number TEXT;
    results_data_val JSONB;
    existing_session_id UUID;
    new_session_id UUID;
    
    -- Sample winning numbers for variety
    sample_numbers TEXT[] := ARRAY['12', '34', '56', '78', '90', '23', '45', '67', '89', '01', '13', '24', '35', '46', '57', '68', '79', '80', '91', '02'];
BEGIN
    -- Initialize Lode Nhanh 1 Phut (1-minute game) - Last 20 sessions
    FOR i IN 1..20 LOOP
        -- Calculate session time (every minute, going backwards)
        session_time := current_time - INTERVAL '1 minute' * i;
        
        -- Generate session number based on timestamp (YYYYMMDDHHMM format)
        session_number_val := (
            EXTRACT(YEAR FROM session_time)::TEXT ||
            LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(MINUTE FROM session_time)::TEXT, 2, '0')
        )::BIGINT;
        
        -- Get a winning number (cycle through sample numbers)
        winning_number := sample_numbers[((i - 1) % array_length(sample_numbers, 1)) + 1];
        
        -- Create results data for 1-minute game
        results_data_val := jsonb_build_object(
            'winning_number', winning_number,
            'draw_time', session_time,
            'session_type', '1_minute',
            'game_id', session_number_val
        );
        
        -- Check if session already exists
        SELECT gs.id INTO existing_session_id
        FROM public.game_sessions gs
        WHERE gs.game_type = game_1p 
          AND gs.session_number = session_number_val;
        
        IF existing_session_id IS NOT NULL THEN
            -- Update existing session
            UPDATE public.game_sessions
            SET winning_numbers = ARRAY[winning_number],
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
                ARRAY[winning_number],
                results_data_val
            ) RETURNING id INTO new_session_id;
            
            RETURN QUERY SELECT 'inserted'::TEXT, 
                               ('Inserted 1p session: ' || session_number_val::TEXT)::TEXT,
                               new_session_id,
                               game_1p,
                               session_number_val;
        END IF;
    END LOOP;
    
    -- Initialize Lode Nhanh 3 Phut (3-minute game) - Last 20 sessions
    FOR i IN 1..20 LOOP
        -- Calculate session time (every 3 minutes, going backwards)
        session_time := current_time - INTERVAL '3 minutes' * i;
        
        -- Generate session number based on timestamp (YYYYMMDDHHMM format, rounded to 3-minute intervals)
        session_number_val := (
            EXTRACT(YEAR FROM session_time)::TEXT ||
            LPAD(EXTRACT(MONTH FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(DAY FROM session_time)::TEXT, 2, '0') ||
            LPAD(EXTRACT(HOUR FROM session_time)::TEXT, 2, '0') ||
            LPAD((FLOOR(EXTRACT(MINUTE FROM session_time) / 3) * 3)::TEXT, 2, '0')
        )::BIGINT;
        
        -- Get a different winning number for 3p game (offset by 10 to ensure different results)
        winning_number := sample_numbers[((i + 9) % array_length(sample_numbers, 1)) + 1];
        
        -- Create results data for 3-minute game
        results_data_val := jsonb_build_object(
            'winning_number', winning_number,
            'draw_time', session_time,
            'session_type', '3_minute',
            'game_id', session_number_val,
            'bonus_info', jsonb_build_object(
                'multiplier', CASE WHEN (i % 5) = 0 THEN 2.0 ELSE 1.0 END,
                'special_round', (i % 5) = 0
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
            SET winning_numbers = ARRAY[winning_number],
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
                ARRAY[winning_number],
                results_data_val
            ) RETURNING id INTO new_session_id;
            
            RETURN QUERY SELECT 'inserted'::TEXT, 
                               ('Inserted 3p session: ' || session_number_val::TEXT)::TEXT,
                               new_session_id,
                               game_3p,
                               session_number_val;
        END IF;
    END LOOP;
    
    -- Create current/upcoming sessions for both games
    
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
                'game_id', session_number_val,
                'status', 'accepting_bets'
            )
        ) RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT 'inserted'::TEXT, 
                           ('Current 1p session: ' || session_number_val::TEXT)::TEXT,
                           new_session_id,
                           game_1p,
                           session_number_val;
    END IF;
    
    -- Current 3p session (open for betting)
    -- Calculate next 3-minute boundary
    DECLARE
        minutes_since_hour INT;
        next_3min_boundary INT;
    BEGIN
        minutes_since_hour := EXTRACT(MINUTE FROM current_time)::INT;
        next_3min_boundary := ((minutes_since_hour / 3) + 1) * 3;
        
        IF next_3min_boundary >= 60 THEN
            session_time := DATE_TRUNC('hour', current_time) + INTERVAL '1 hour';
        ELSE
            session_time := DATE_TRUNC('hour', current_time) + (next_3min_boundary || ' minutes')::INTERVAL;
        END IF;
    END;
    
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
                'game_id', session_number_val,
                'status', 'accepting_bets',
                'bonus_info', jsonb_build_object(
                    'multiplier', 1.0,
                    'special_round', false
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

-- Execute the function to initialize sample data
SELECT * FROM initialize_lode_nhanh_sample_data();

-- Clean up: Drop the function after use
DROP FUNCTION IF EXISTS initialize_lode_nhanh_sample_data();

-- Verify the data was created
SELECT 
    game_type,
    COUNT(*) as session_count,
    MIN(session_number) as earliest_session,
    MAX(session_number) as latest_session,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_sessions
FROM public.game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_3p')
GROUP BY game_type
ORDER BY game_type;

-- Show some sample results
SELECT 
    game_type,
    session_number,
    winning_numbers,
    status,
    draw_time,
    results_data->>'session_type' as session_type
FROM public.game_sessions 
WHERE game_type IN ('lode_nhanh_1p', 'lode_nhanh_3p')
ORDER BY game_type, session_number DESC
LIMIT 10;
