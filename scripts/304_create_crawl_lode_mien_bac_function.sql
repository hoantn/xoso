-- Create extension for HTTP requests if not exists
CREATE EXTENSION IF NOT EXISTS http;

-- Create function to crawl and initialize Lode Mien Bac results
CREATE OR REPLACE FUNCTION crawl_and_initialize_lode_mien_bac_results()
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
    api_url TEXT := 'https://vip.manycai.com/K2685086065b921/hnc.json';
    api_response http_response;
    api_data JSONB;
    latest_result JSONB;
    game_type_val TEXT := 'lode_mien_bac';
    session_date_val TEXT;
    session_number_val INT;
    draw_time_utc TIMESTAMP WITH TIME ZONE;
    winning_numbers_val TEXT[];
    results_data_val JSONB;
    existing_session_id UUID;
    new_session_id UUID;
BEGIN
    -- Make HTTP request to the API
    SELECT INTO api_response http_get(api_url);
    
    -- Check if request was successful
    IF api_response.status != 200 THEN
        RETURN QUERY SELECT 'error'::TEXT, 
                           ('API request failed with status: ' || api_response.status)::TEXT,
                           NULL::UUID,
                           NULL::TEXT,
                           NULL::INT;
        RETURN;
    END IF;
    
    -- Parse JSON response
    BEGIN
        api_data := api_response.content::JSONB;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'error'::TEXT, 
                           'Failed to parse API response as JSON'::TEXT,
                           NULL::UUID,
                           NULL::TEXT,
                           NULL::INT;
        RETURN;
    END;
    
    -- Check if data array exists and has elements
    IF api_data IS NULL OR jsonb_array_length(api_data) = 0 THEN
        RETURN QUERY SELECT 'error'::TEXT, 
                           'No data found in API response'::TEXT,
                           NULL::UUID,
                           NULL::TEXT,
                           NULL::INT;
        RETURN;
    END IF;
    
    -- Get the latest result (first element)
    latest_result := api_data->0;
    
    -- Extract session information
    session_date_val := latest_result->>'date';
    session_number_val := REPLACE(session_date_val, '-', '')::INT;
    
    -- Calculate draw time (18:15 Vietnam time = 11:15 UTC)
    draw_time_utc := (session_date_val || 'T11:15:00Z')::TIMESTAMP WITH TIME ZONE;
    
    -- Extract winning numbers (last 2 digits of special prize for 'de')
    winning_numbers_val := ARRAY[RIGHT(latest_result->>'special_prize', 2)];
    
    -- Build results data
    results_data_val := jsonb_build_object(
        'special_prize', latest_result->>'special_prize',
        'first_prize', latest_result->'first_prize',
        'second_prize', latest_result->'second_prize',
        'third_prize', latest_result->'third_prize',
        'fourth_prize', latest_result->'fourth_prize',
        'fifth_prize', latest_result->'fifth_prize',
        'sixth_prize', latest_result->'sixth_prize',
        'seventh_prize', latest_result->'seventh_prize'
    );
    
    -- Check if session already exists
    SELECT id INTO existing_session_id
    FROM public.game_sessions
    WHERE game_type = game_type_val 
      AND session_number = session_number_val;
    
    IF existing_session_id IS NOT NULL THEN
        -- Update existing session if it doesn't have results
        UPDATE public.game_sessions
        SET winning_numbers = winning_numbers_val,
            results_data = results_data_val,
            status = 'completed',
            updated_at = NOW()
        WHERE id = existing_session_id
          AND (results_data IS NULL OR winning_numbers IS NULL);
        
        IF FOUND THEN
            RETURN QUERY SELECT 'updated'::TEXT, 
                               ('Updated existing session for date: ' || session_date_val)::TEXT,
                               existing_session_id,
                               session_date_val,
                               session_number_val;
        ELSE
            RETURN QUERY SELECT 'exists'::TEXT, 
                               ('Session already exists with complete data for date: ' || session_date_val)::TEXT,
                               existing_session_id,
                               session_date_val,
                               session_number_val;
        END IF;
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
            (session_date_val || 'T00:00:00Z')::TIMESTAMP WITH TIME ZONE,
            draw_time_utc,
            draw_time_utc,
            'completed',
            winning_numbers_val,
            results_data_val
        ) RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT 'inserted'::TEXT, 
                           ('Successfully inserted new session for date: ' || session_date_val)::TEXT,
                           new_session_id,
                           session_date_val,
                           session_number_val;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'error'::TEXT, 
                       ('Unexpected error: ' || SQLERRM)::TEXT,
                       NULL::UUID,
                       NULL::TEXT,
                       NULL::INT;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION crawl_and_initialize_lode_mien_bac_results() TO authenticated;
GRANT EXECUTE ON FUNCTION crawl_and_initialize_lode_mien_bac_results() TO service_role;
