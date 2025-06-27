-- Check what user-related tables actually exist
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%user%' OR table_name LIKE '%profile%')
ORDER BY table_name;

-- Check the structure of the users table (if it exists)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if there are any other tables that store user information
SELECT table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('accounts', 'members', 'customers', 'clients');

-- Show sample data from users table to understand the structure
SELECT id, username, role, balance, is_active
FROM users 
LIMIT 3;
