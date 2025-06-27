-- Comprehensive verification of transaction system
SELECT 'TRANSACTION COUNTS BY TYPE' as check_type;
SELECT 
  type,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM transactions 
GROUP BY type
ORDER BY count DESC;

SELECT 'TRANSACTION COUNTS BY STATUS' as check_type;
SELECT 
  status,
  COUNT(*) as count
FROM transactions 
GROUP BY status;

SELECT 'USER BALANCES VS TRANSACTION HISTORY' as check_type;
SELECT 
  u.username,
  u.balance as current_balance,
  COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END), 0) as calculated_balance,
  COUNT(t.id) as transaction_count
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.role = 'user'
GROUP BY u.id, u.username, u.balance
ORDER BY u.username;

SELECT 'RECENT TRANSACTIONS' as check_type;
SELECT 
  t.created_at,
  t.type,
  t.amount,
  t.description,
  t.status,
  u.username,
  cb.username as created_by
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN users cb ON t.created_by = cb.id
ORDER BY t.created_at DESC
LIMIT 20;

SELECT 'DEPOSIT REQUESTS WITHOUT TRANSACTIONS' as check_type;
SELECT 
  dr.id,
  dr.transaction_id,
  dr.amount,
  dr.status,
  dr.created_at,
  u.username
FROM deposit_requests dr
LEFT JOIN users u ON dr.user_id = u.id
LEFT JOIN transactions t ON dr.id = t.reference_id AND t.type = 'deposit'
WHERE dr.status = 'completed' AND t.id IS NULL
ORDER BY dr.created_at DESC;
