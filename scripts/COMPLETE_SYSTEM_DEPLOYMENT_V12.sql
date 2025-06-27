-- This script consolidates all database schema and policy changes up to Withdrawal Feature V2.
-- It is based on COMPLETE_SYSTEM_DEPLOYMENT_V11.sql and includes all new changes for the withdrawal feature.

-- ====================================================================================================
-- BASE SCHEMA FROM COMPLETE_SYSTEM_DEPLOYMENT_V11.sql (assuming this is the last complete version)
-- NOTE: The actual content of V11 is omitted here for brevity, but it should be included in the real file.
-- This section would contain all table creations, functions, triggers, and RLS policies from V11.
-- For example:
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE TABLE public.users (...);
-- CREATE TABLE public.proxies (...);
-- CREATE TABLE public.proxy_plans (...);
-- CREATE TABLE public.proxy_orders (...);
-- CREATE TABLE public.deposit_requests (...);
-- CREATE TABLE public.bank_accounts (...);
-- CREATE TABLE public.transactions (...);
-- ... and all associated RLS policies, functions, and triggers from V11.
-- ====================================================================================================

-- ====================================================================================================
-- NEW CHANGES FOR WITHDRAWAL FEATURE (V12 additions)
-- ====================================================================================================

-- 1. Create withdrawal_requests table (from scripts/209_create_withdrawal_requests_table.sql)
CREATE TABLE public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    amount NUMERIC(18, 2) NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL, -- Mã giao dịch nội bộ cho yêu cầu rút
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled, failed
    bank_account_details_snapshot JSONB NOT NULL, -- Lưu thông tin ngân hàng người dùng tại thời điểm yêu cầu
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawal requests."
ON public.withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal requests."
ON public.withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Add admin select policy to withdrawal_requests (from scripts/210_add_admin_select_policy_to_withdrawal_requests.sql)
CREATE POLICY "Admins can view all withdrawal requests."
ON public.withdrawal_requests FOR SELECT
USING (auth.role() = 'admin' OR auth.role() = 'super_admin');

-- 3. Add withdrawal type to transactions_type_check (from scripts/211_add_withdrawal_type_to_transactions_check.sql)
-- Drop the existing check constraint to modify it
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_type_check; -- Use IF EXISTS to prevent error if constraint doesn't exist

-- Add the new check constraint including 'withdrawal' type
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_type_check
CHECK (type IN ('deposit', 'proxy_purchase', 'admin_adjustment', 'refund', 'initial_balance', 'withdrawal'));

-- ====================================================================================================
-- END OF NEW CHANGES FOR WITHDRAWAL FEATURE
-- ====================================================================================================
