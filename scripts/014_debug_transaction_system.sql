-- Debug script to check transaction system
SELECT 'CHECKING TRANSACTIONS TABLE STRUCTURE' as debug_step;
\d transactions;

SELECT 'CHECKING IF TRANSACTIONS TABLE EXISTS AND HAS DATA' as debug_step;
SELECT COUNT(*) as total_transactions FROM transactions;

SELECT 'CHECKING RECENT TRANSACTIONS' as debug_step;
SELECT 
  id,
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  description,
  status,
  created_at,
  reference_id,
  created_by
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

SELECT 'CHECKING DEPOSIT REQUESTS' as debug_step;
SELECT 
  id,
  user_id,
  amount,
  status,
  created_at,
  updated_at,
  transaction_id
FROM deposit_requests 
ORDER BY created_at DESC 
LIMIT 10;

SELECT 'CHECKING USER BALANCES' as debug_step;
SELECT 
  id,
  username,
  balance,
  role,
  created_at
FROM users 
WHERE role = 'user'
ORDER BY created_at DESC 
LIMIT 10;

SELECT 'CHECKING FOR COMPLETED DEPOSITS WITHOUT TRANSACTIONS' as debug_step;
SELECT 
  dr.id as deposit_id,
  dr.transaction_id,
  dr.amount,
  dr.status as deposit_status,
  dr.created_at as deposit_created,
  u.username,
  t.id as transaction_id,
  t.type as transaction_type,
  t.amount as transaction_amount
FROM deposit_requests dr
LEFT JOIN users u ON dr.user_id = u.id
LEFT JOIN transactions t ON (dr.id::text = t.reference_id OR dr.transaction_id = t.reference_id)
WHERE dr.status = 'completed'
ORDER BY dr.created_at DESC;
