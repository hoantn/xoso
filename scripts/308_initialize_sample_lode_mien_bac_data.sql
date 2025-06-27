-- Initialize sample Lode Mien Bac data based on recent results
-- This will create sessions for the past few days with sample data

-- First, let's create a function to generate session data
CREATE OR REPLACE FUNCTION initialize_lode_mien_bac_sample_data()
RETURNS TABLE(
    status TEXT,
    message TEXT,
    session_id UUID,
    session_date TEXT,
    session_number INT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    game_type_val TEXT := 'lode_mien_bac';
    session_dates TEXT[] := ARRAY['20250616', '20250612', '20250609', '20250605', '20250602'];
    session_date_val TEXT;
    session_number_val INT;
    draw_time_utc TIMESTAMP WITH TIME ZONE;
    winning_numbers_val TEXT[];
    results_data_val JSONB;
    existing_session_id UUID;
    new_session_id UUID;
    special_prize TEXT;
    i INT;
BEGIN
    -- Sample data based on the API response structure
    FOR i IN 1..array_length(session_dates, 1) LOOP
        session_date_val := session_dates[i];
        session_number_val := session_date_val::INT;
        
        -- Calculate draw time (18:15 Vietnam time = 11:15 UTC)
        draw_time_utc := (
            SUBSTRING(session_date_val, 1, 4) || '-' ||
            SUBSTRING(session_date_val, 5, 2) || '-' ||
            SUBSTRING(session_date_val, 7, 2) || 'T11:15:00Z'
        )::TIMESTAMP WITH TIME ZONE;
        
        -- Sample data for each date
        CASE session_date_val
            WHEN '20250616' THEN
                special_prize := '12456';
                results_data_val := jsonb_build_object(
                    'special_prize', '12456',
                    'first_prize', '41669',
                    'second_prize', jsonb_build_array('69019', '63447'),
                    'third_prize', jsonb_build_array('86133', '77309', '59221', '29862', '55591', '01206'),
                    'fourth_prize', jsonb_build_array('5886', '6948', '8808', '1438'),
                    'fifth_prize', jsonb_build_array('4701', '0370', '2358', '5573', '7004', '0599'),
                    'sixth_prize', jsonb_build_array('182', '109', '947'),
                    'seventh_prize', jsonb_build_array('67', '53', '81', '66'),
                    'opendate', '2025-06-16 19:00:00',
                    'issue', '20250616'
                );
            WHEN '20250612' THEN
                special_prize := '37649';
                results_data_val := jsonb_build_object(
                    'special_prize', '37649',
                    'first_prize', '42991',
                    'second_prize', jsonb_build_array('09908', '38599'),
                    'third_prize', jsonb_build_array('22453', '85088', '78532', '22109', '28564', '41867'),
                    'fourth_prize', jsonb_build_array('7696', '8940', '1654', '8755'),
                    'fifth_prize', jsonb_build_array('6997', '3566', '1144', '3502', '7724', '3609'),
                    'sixth_prize', jsonb_build_array('773', '603', '900'),
                    'seventh_prize', jsonb_build_array('43', '10', '34', '36'),
                    'opendate', '2025-06-12 19:00:00',
                    'issue', '20250612'
                );
            WHEN '20250609' THEN
                special_prize := '23488';
                results_data_val := jsonb_build_object(
                    'special_prize', '23488',
                    'first_prize', '96936',
                    'second_prize', jsonb_build_array('69805', '31773'),
                    'third_prize', jsonb_build_array('75081', '23498', '78036', '19603', '02229', '02040'),
                    'fourth_prize', jsonb_build_array('6776', '8134', '3045', '0363'),
                    'fifth_prize', jsonb_build_array('3425', '8140', '7305', '1112', '4645', '1552'),
                    'sixth_prize', jsonb_build_array('141', '227', '715'),
                    'seventh_prize', jsonb_build_array('31', '62', '44', '23'),
                    'opendate', '2025-06-09 19:00:00',
                    'issue', '20250609'
                );
            WHEN '20250605' THEN
                special_prize := '81062';
                results_data_val := jsonb_build_object(
                    'special_prize', '81062',
                    'first_prize', '00435',
                    'second_prize', jsonb_build_array('97168', '02728'),
                    'third_prize', jsonb_build_array('09121', '20539', '00564', '59713', '59172', '30057'),
                    'fourth_prize', jsonb_build_array('4081', '3673', '6542', '0664'),
                    'fifth_prize', jsonb_build_array('6497', '4350', '3535', '0541', '1633', '0906'),
                    'sixth_prize', jsonb_build_array('915', '805', '031'),
                    'seventh_prize', jsonb_build_array('95', '30', '87', '86'),
                    'opendate', '2025-06-05 19:00:00',
                    'issue', '20250605'
                );
            WHEN '20250602' THEN
                special_prize := '74268';
                results_data_val := jsonb_build_object(
                    'special_prize', '74268',
                    'first_prize', '58360',
                    'second_prize', jsonb_build_array('00398', '19382'),
                    'third_prize', jsonb_build_array('22369', '23814', '32771', '42198', '18920', '72976'),
                    'fourth_prize', jsonb_build_array('5139', '2250', '9482', '1186'),
                    'fifth_prize', jsonb_build_array('2972', '9974', '4520', '9120', '7097', '5040'),
                    'sixth_prize', jsonb_build_array('239', '645', '274'),
                    'seventh_prize', jsonb_build_array('11', '12', '94', '84'),
                    'opendate', '2025-06-02 19:00:00',
                    'issue', '20250602'
                );
            ELSE
                special_prize := '00000';
                results_data_val := jsonb_build_object(
                    'special_prize', '00000',
                    'first_prize', '00000',
                    'second_prize', jsonb_build_array('00000', '00000'),
                    'third_prize', jsonb_build_array('00000', '00000', '00000', '00000', '00000', '00000'),
                    'fourth_prize', jsonb_build_array('0000', '0000', '0000', '0000'),
                    'fifth_prize', jsonb_build_array('0000', '0000', '0000', '0000', '0000', '0000'),
                    'sixth_prize', jsonb_build_array('000', '000', '000'),
                    'seventh_prize', jsonb_build_array('00', '00', '00', '00'),
                    'opendate', SUBSTRING(session_date_val, 1, 4) || '-' || SUBSTRING(session_date_val, 5, 2) || '-' || SUBSTRING(session_date_val, 7, 2) || ' 19:00:00',
                    'issue', session_date_val
                );
        END CASE;
        
        -- Extract winning numbers (last 2 digits of special prize for 'de')
        winning_numbers_val := ARRAY[RIGHT(special_prize, 2)];
        
        -- Check if session already exists
        SELECT id INTO existing_session_id
        FROM public.game_sessions
        WHERE game_type = game_type_val 
          AND session_number = session_number_val;
        
        IF existing_session_id IS NOT NULL THEN
            -- Update existing session
            UPDATE public.game_sessions
            SET winning_numbers = winning_numbers_val,
                results_data = results_data_val,
                status = 'completed',
                updated_at = NOW()
            WHERE id = existing_session_id;
            
            RETURN QUERY SELECT 'updated'::TEXT, 
                               ('Updated session for date: ' || session_date_val)::TEXT,
                               existing_session_id,
                               session_date_val,
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
                game_type_val,
                session_number_val,
                draw_time_utc - INTERVAL '18 hours 15 minutes', -- Start at 00:00
                draw_time_utc, -- End at draw time
                draw_time_utc,
                'completed',
                winning_numbers_val,
                results_data_val
            ) RETURNING id INTO new_session_id;
            
            RETURN QUERY SELECT 'inserted'::TEXT, 
                               ('Successfully inserted session for date: ' || session_date_val)::TEXT,
                               new_session_id,
                               session_date_val,
                               session_number_val;
        END IF;
    END LOOP;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'error'::TEXT, 
                       ('Unexpected error: ' || SQLERRM)::TEXT,
                       NULL::UUID,
                       NULL::TEXT,
                       NULL::INT;
END;
$$;

-- Execute the function to initialize sample data
SELECT * FROM initialize_lode_mien_bac_sample_data();

-- Drop the function after use
DROP FUNCTION initialize_lode_mien_bac_sample_data();
