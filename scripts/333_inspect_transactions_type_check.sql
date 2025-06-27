-- Liệt kê định nghĩa constraint để xem các giá trị hợp lệ
SELECT conname,
       pg_get_constraintdef(c.oid) AS definition
FROM   pg_constraint c
JOIN   pg_class      t ON t.oid = c.conrelid
WHERE  t.relname = 'transactions'
  AND  conname  = 'transactions_type_check';
