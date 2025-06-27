-- Drop the existing check constraint to modify it
ALTER TABLE public.transactions
DROP CONSTRAINT transactions_type_check;

-- Add the new check constraint including 'withdrawal' type
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN ('deposit', 'proxy_purchase', 'admin_adjustment', 'refund', 'initial_balance', 'withdrawal'));
