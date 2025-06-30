-- Add unique constraint to prevent multiple active sessions for the same game type
-- First, let's check if there are any duplicate active sessions
SELECT game_type, status, COUNT(*) as session_count
FROM game_sessions 
WHERE status = 'open'
GROUP BY game_type, status
HAVING COUNT(*) > 1;

-- If there are duplicates, we need to clean them up first
-- Keep only the latest session for each game type and close the others
WITH ranked_sessions AS (
  SELECT 
    id,
    game_type,
    session_number,
    start_time,
    status,
    ROW_NUMBER() OVER (PARTITION BY game_type ORDER BY start_time DESC, session_number DESC) as rn
  FROM game_sessions 
  WHERE status = 'open'
)
UPDATE game_sessions 
SET 
  status = 'cancelled',
  results_data = COALESCE(results_data, '{}'::jsonb) || jsonb_build_object(
    'status', 'cancelled',
    'description', 'Phiên bị hủy do trùng lặp',
    'cancelled_at', NOW(),
    'reason', 'duplicate_session_cleanup'
  )
WHERE id IN (
  SELECT id FROM ranked_sessions WHERE rn > 1
);

-- Now create a unique partial index to prevent future duplicates
-- This will only allow one 'open' session per game_type
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session_per_game_type
ON game_sessions (game_type) 
WHERE status = 'open';

-- Add a comment to explain the constraint
COMMENT ON INDEX idx_unique_active_session_per_game_type IS 
'Ensures only one active (open) session exists per game type at any time';

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS create_session_safely(TEXT, BIGINT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB);
DROP FUNCTION IF EXISTS create_next_game_session(TEXT);

-- Create a function to safely create sessions with duplicate checking
CREATE OR REPLACE FUNCTION create_session_safely(
  p_game_type TEXT,
  p_session_number BIGINT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_results_data JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  session_id UUID,
  session_number BIGINT,
  created BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_session_id UUID;
  v_existing_session_number BIGINT;
  v_new_session_id UUID;
BEGIN
  -- Check if there's already an active session for this game type
  SELECT id, session_number INTO v_existing_session_id, v_existing_session_number
  FROM game_sessions 
  WHERE game_type = p_game_type AND status = 'open'
  LIMIT 1;
  
  IF v_existing_session_id IS NOT NULL THEN
    -- Return existing session info
    RETURN QUERY SELECT 
      v_existing_session_id,
      v_existing_session_number,
      FALSE,
      'Đã có phiên đang hoạt động #' || v_existing_session_number::TEXT;
    RETURN;
  END IF;
  
  -- No active session exists, create new one
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
    p_session_number,
    p_start_time,
    p_end_time,
    p_end_time,
    'open',
    '{}',
    p_results_data
  ) RETURNING id INTO v_new_session_id;
  
  -- Return new session info
  RETURN QUERY SELECT 
    v_new_session_id,
    p_session_number,
    TRUE,
    'Tạo phiên mới thành công #' || p_session_number::TEXT;
    
  RAISE NOTICE 'Created new session % for game type %', p_session_number, p_game_type;
END;
$$;

-- Update the create_next_game_session function to use the safe creation
CREATE OR REPLACE FUNCTION create_next_game_session(p_game_type TEXT)
RETURNS TABLE(
  id UUID,
  session_number BIGINT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT,
  created BOOLEAN,
  message TEXT
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
  v_result RECORD;
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
  
  -- Use safe session creation
  SELECT * INTO v_result FROM create_session_safely(
    p_game_type,
    v_next_session_number,
    v_now,
    v_end_time,
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
  );
  
  -- Return the result
  RETURN QUERY
  SELECT 
    v_result.session_id,
    v_result.session_number,
    v_now,
    v_end_time,
    'open'::TEXT,
    v_result.created,
    v_result.message;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_session_safely(TEXT, BIGINT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_session_safely(TEXT, BIGINT, TIMESTAMPTZ, TIMESTAMPTZ, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION create_next_game_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_next_game_session(TEXT) TO anon;
