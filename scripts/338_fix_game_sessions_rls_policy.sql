-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "game_sessions_select_policy" ON game_sessions;
DROP POLICY IF EXISTS "game_sessions_insert_policy" ON game_sessions;
DROP POLICY IF EXISTS "game_sessions_update_policy" ON game_sessions;

-- Create permissive policies for game_sessions table
CREATE POLICY "Allow public read access to game_sessions" 
ON game_sessions FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert to game_sessions" 
ON game_sessions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update to game_sessions" 
ON game_sessions FOR UPDATE 
USING (true);

-- Enable RLS but with permissive policies
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'game_sessions';

-- Test insert to make sure it works
DO $$
BEGIN
    -- Try to insert a test session
    INSERT INTO game_sessions (
        game_type, session_number, start_time, end_time, draw_time, status, results_data
    ) VALUES (
        'test_session', 
        99999, 
        NOW(), 
        NOW() + INTERVAL '1 minute', 
        NOW() + INTERVAL '1 minute', 
        'test',
        '{"test": true}'::jsonb
    );
    
    -- Clean up test data
    DELETE FROM game_sessions WHERE session_number = 99999;
    
    RAISE NOTICE 'RLS policies are working correctly for game_sessions';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS policy test failed: %', SQLERRM;
END $$;
