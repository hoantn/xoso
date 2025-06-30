-- Function to create next game session automatically
CREATE OR REPLACE FUNCTION create_next_game_session(p_game_type TEXT)
RETURNS TABLE(
  id UUID,
  session_number BIGINT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_session_number BIGINT;
  v_next_session_number BIGINT;
  v_duration_minutes INTEGER;
  v_now TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_new_session_id UUID;
BEGIN
  -- Get current timestamp
  v_now := NOW();
  
  -- Determine duration based on game type
  CASE p_game_type
    WHEN 'lode_nhanh_1p' THEN v_duration_minutes := 1;
    WHEN 'lode_nhanh_5p' THEN v_duration_minutes := 5;
    WHEN 'lode_nhanh_30p' THEN v_duration_minutes := 30;
    WHEN 'lode_mien_bac' THEN v_duration_minutes := 1440; -- 24 hours
    ELSE 
      RAISE EXCEPTION 'Invalid game type: %', p_game_type;
  END CASE;
  
  -- Calculate end time
  v_end_time := v_now + (v_duration_minutes || ' minutes')::INTERVAL;
  
  -- Get last session number for this game type
  SELECT COALESCE(MAX(session_number), 0) INTO v_last_session_number
  FROM game_sessions 
  WHERE game_type = p_game_type;
  
  -- Generate next session number
  IF p_game_type LIKE 'lode_nhanh_%' THEN
    -- For fast lottery, use date-based numbering
    DECLARE
      v_today_base BIGINT;
      v_prefix INTEGER;
    BEGIN
      v_today_base := (EXTRACT(YEAR FROM v_now)::TEXT || 
                      LPAD(EXTRACT(MONTH FROM v_now)::TEXT, 2, '0') || 
                      LPAD(EXTRACT(DAY FROM v_now)::TEXT, 2, '0'))::BIGINT;
      
      CASE p_game_type
        WHEN 'lode_nhanh_1p' THEN v_prefix := 1000;
        WHEN 'lode_nhanh_5p' THEN v_prefix := 2000;
        WHEN 'lode_nhanh_30p' THEN v_prefix := 3000;
      END CASE;
      
      v_today_base := v_today_base + v_prefix;
      
      IF v_last_session_number > v_today_base THEN
        v_next_session_number := v_last_session_number + 1;
      ELSE
        v_next_session_number := v_today_base + 1;
      END IF;
    END;
  ELSE
    -- For traditional lottery, simple increment
    v_next_session_number := v_last_session_number + 1;
  END IF;
  
  -- Insert new session
  INSERT INTO game_sessions (
    game_type,
    session_number,
    start_time,
    end_time,
    draw_time,
    status,
    winning_numbers,
    results_data
  ) VALUES (
    p_game_type,
    v_next_session_number,
    v_now,
    v_end_time,
    v_end_time,
    'open',
    '{}',
    jsonb_build_object(
      'issue', v_next_session_number::TEXT,
      'status', 'accepting_bets',
      'description', CASE 
        WHEN p_game_type = 'lode_nhanh_1p' THEN 'Lô Đề Nhanh 1 Phút - Đang nhận cược'
        WHEN p_game_type = 'lode_nhanh_5p' THEN 'Lô Đề Nhanh 5 Phút - Đang nhận cược'
        WHEN p_game_type = 'lode_nhanh_30p' THEN 'Lô Đề Nhanh 30 Phút - Đang nhận cược'
        WHEN p_game_type = 'lode_mien_bac' THEN 'Lô Đề Miền Bắc - Đang nhận cược'
        ELSE 'Đang nhận cược'
      END,
      'session_type', p_game_type,
      'duration_minutes', v_duration_minutes,
      'created_at', v_now
    )
  ) RETURNING game_sessions.id INTO v_new_session_id;
  
  -- Return the new session info
  RETURN QUERY
  SELECT 
    v_new_session_id,
    v_next_session_number,
    v_now,
    v_end_time,
    'open'::TEXT;
    
  -- Log the creation
  RAISE NOTICE 'Created new session % for game type % (duration: % minutes)', 
    v_next_session_number, p_game_type, v_duration_minutes;
    
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_next_game_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_next_game_session(TEXT) TO anon;
