-- =====================================================
-- EVENT-DRIVEN LOTTERY SYSTEM
-- =====================================================

-- 1. Create events table to track workflow states
CREATE TABLE IF NOT EXISTS lottery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'session_created', 'session_expired', 'draw_completed', 'payout_completed'
  session_id UUID NOT NULL REFERENCES game_sessions(id),
  game_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  payload JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lottery_events_status_scheduled ON lottery_events(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lottery_events_session_id ON lottery_events(session_id);
CREATE INDEX IF NOT EXISTS idx_lottery_events_event_type ON lottery_events(event_type);

-- 2. Create function to schedule events
CREATE OR REPLACE FUNCTION schedule_lottery_event(
  p_event_type TEXT,
  p_session_id UUID,
  p_game_type TEXT,
  p_scheduled_at TIMESTAMPTZ,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO lottery_events (
    event_type,
    session_id,
    game_type,
    scheduled_at,
    payload
  ) VALUES (
    p_event_type,
    p_session_id,
    p_game_type,
    p_scheduled_at,
    p_payload
  ) RETURNING id INTO v_event_id;
  
  RAISE NOTICE 'Scheduled event % for session % at %', p_event_type, p_session_id, p_scheduled_at;
  
  RETURN v_event_id;
END;
$$;

-- 3. Create function to process pending events
CREATE OR REPLACE FUNCTION process_pending_events()
RETURNS TABLE(
  event_id UUID,
  event_type TEXT,
  session_id UUID,
  game_type TEXT,
  webhook_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_url TEXT;
BEGIN
  -- Get base URL from environment or use default
  v_base_url := COALESCE(current_setting('app.base_url', true), 'https://your-app.vercel.app');
  
  -- Mark events as processing and return webhook URLs
  UPDATE lottery_events 
  SET 
    status = 'processing',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE status = 'pending' 
    AND scheduled_at <= NOW()
    AND retry_count < 3
  RETURNING 
    lottery_events.id,
    lottery_events.event_type,
    lottery_events.session_id,
    lottery_events.game_type,
    CASE lottery_events.event_type
      WHEN 'session_expired' THEN v_base_url || '/api/webhooks/draw-lottery'
      WHEN 'draw_completed' THEN v_base_url || '/api/webhooks/process-payout'
      WHEN 'payout_completed' THEN v_base_url || '/api/webhooks/create-next-session'
      ELSE v_base_url || '/api/webhooks/unknown'
    END;
END;
$$;

-- 4. Create function to mark event as completed
CREATE OR REPLACE FUNCTION complete_lottery_event(
  p_event_id UUID,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_success THEN
    UPDATE lottery_events 
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id = p_event_id;
  ELSE
    UPDATE lottery_events 
    SET 
      status = 'failed',
      error_message = p_error_message,
      retry_count = retry_count + 1,
      updated_at = NOW()
    WHERE id = p_event_id;
    
    -- Reschedule if retry count < 3
    UPDATE lottery_events 
    SET 
      status = 'pending',
      scheduled_at = NOW() + INTERVAL '30 seconds'
    WHERE id = p_event_id AND retry_count < 3;
  END IF;
END;
$$;

-- 5. Create trigger function for new game sessions
CREATE OR REPLACE FUNCTION trigger_session_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a new session is created, schedule its expiration event
  IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
    PERFORM schedule_lottery_event(
      'session_expired',
      NEW.id,
      NEW.game_type,
      NEW.end_time,
      jsonb_build_object(
        'session_number', NEW.session_number,
        'end_time', NEW.end_time
      )
    );
    
    RAISE NOTICE 'Scheduled expiration event for session % at %', NEW.session_number, NEW.end_time;
  END IF;
  
  -- When session status changes to 'completed', schedule payout event
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM schedule_lottery_event(
      'draw_completed',
      NEW.id,
      NEW.game_type,
      NOW(),
      jsonb_build_object(
        'session_number', NEW.session_number,
        'winning_numbers', NEW.winning_numbers,
        'results_data', NEW.results_data
      )
    );
    
    RAISE NOTICE 'Scheduled payout event for completed session %', NEW.session_number;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create the trigger
DROP TRIGGER IF EXISTS game_session_events_trigger ON game_sessions;
CREATE TRIGGER game_session_events_trigger
  AFTER INSERT OR UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_session_events();

-- 7. Create function to get ready events (for webhook processor)
CREATE OR REPLACE FUNCTION get_ready_events()
RETURNS TABLE(
  id UUID,
  event_type TEXT,
  session_id UUID,
  game_type TEXT,
  payload JSONB,
  scheduled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.session_id,
    e.game_type,
    e.payload,
    e.scheduled_at
  FROM lottery_events e
  WHERE e.status = 'pending'
    AND e.scheduled_at <= NOW()
    AND e.retry_count < 3
  ORDER BY e.scheduled_at ASC
  LIMIT 10;
END;
$$;

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE ON lottery_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lottery_events TO anon;
GRANT EXECUTE ON FUNCTION schedule_lottery_event TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_lottery_event TO anon;
GRANT EXECUTE ON FUNCTION process_pending_events TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_events TO anon;
GRANT EXECUTE ON FUNCTION complete_lottery_event TO authenticated;
GRANT EXECUTE ON FUNCTION complete_lottery_event TO anon;
GRANT EXECUTE ON FUNCTION get_ready_events TO authenticated;
GRANT EXECUTE ON FUNCTION get_ready_events TO anon;

-- 9. Enable RLS
ALTER TABLE lottery_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on lottery_events" ON lottery_events
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE lottery_events IS 'Event-driven workflow tracking for lottery system';
COMMENT ON FUNCTION schedule_lottery_event IS 'Schedule a lottery event to be processed later';
COMMENT ON FUNCTION process_pending_events IS 'Get and mark pending events for processing';
COMMENT ON FUNCTION complete_lottery_event IS 'Mark an event as completed or failed';
