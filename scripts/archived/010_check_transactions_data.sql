-- Kiểm tra dữ liệu trong bảng transactions
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type = 'deposit' THEN 1 END) as deposits,
  COUNT(CASE WHEN type = 'proxy_purchase' THEN 1 END) as purchases,
  COUNT(CASE WHEN type = 'admin_adjustment' THEN 1 END) as adjustments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM transactions;

-- Xem 10 giao dịch gần nhất
SELECT 
  id,
  user_id,
  type,
  amount,
  balance_before,
  balance_after,
  status,
  description,
  created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- Kiểm tra user_id có tồn tại trong bảng users không
SELECT 
  t.id as transaction_id,
  t.user_id,
  u.username,
  t.type,
  t.amount,
  t.status
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL
LIMIT 5;
