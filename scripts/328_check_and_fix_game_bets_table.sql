-- Check what tables exist related to bets
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%bet%'
ORDER BY table_name;

-- Check columns in user_bets table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_bets'
ORDER BY ordinal_position;

-- Check if game_bets table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_bets'
ORDER BY ordinal_position;

-- Check the place_bet_transaction function to see what table it's trying to use
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'place_bet_transaction';
