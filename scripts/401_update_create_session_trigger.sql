-- Update the existing trigger to work with event-driven system
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
        'end_time', NEW.end_time,
        'start_time', NEW.start_time
      )
    );
    
    RAISE NOTICE 'Scheduled expiration event for session % at %', NEW.session_number, NEW.end_time;
  END IF;
  
  -- When session status changes to 'completed', we don't need to schedule payout
  -- because the draw webhook already handles payout processing
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS game_session_events_trigger ON game_sessions;
CREATE TRIGGER game_session_events_trigger
  AFTER INSERT OR UPDATE ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_session_events();
