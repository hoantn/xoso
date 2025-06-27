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

-- Admin policy (assuming admin role is handled by RLS or separate logic)
-- CREATE POLICY "Admins can manage all withdrawal requests."
-- ON public.withdrawal_requests FOR ALL
-- USING (auth.role() = 'admin' OR auth.role() = 'super_admin');
