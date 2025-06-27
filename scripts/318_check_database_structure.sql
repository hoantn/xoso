-- Check the structure of game_sessions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'game_sessions'
ORDER BY ordinal_position;

-- Check if game_sessions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'game_sessions'
) as table_exists;

-- Check existing data in game_sessions
SELECT 
    game_type,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM public.game_sessions 
GROUP BY game_type
ORDER BY game_type;

-- Check sample data structure
SELECT 
    id,
    game_type,
    session_number,
    start_time,
    end_time,
    draw_time,
    status,
    winning_numbers,
    results_data,
    created_at,
    updated_at
FROM public.game_sessions 
WHERE game_type LIKE '%lode%'
ORDER BY created_at DESC
LIMIT 5;

-- Check data types of timestamp columns
SELECT 
    column_name,
    data_type,
    datetime_precision
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'game_sessions'
  AND data_type LIKE '%timestamp%'
ORDER BY column_name;
