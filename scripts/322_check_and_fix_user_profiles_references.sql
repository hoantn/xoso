-- Check if user_profiles table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles';

-- Check if users table exists and has balance column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('balance', 'id', 'username');

-- Check current users table structure
SELECT * FROM users LIMIT 1;
