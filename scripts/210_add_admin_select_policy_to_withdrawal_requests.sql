-- Add a policy to allow admins to view all withdrawal requests
CREATE POLICY "Admins can view all withdrawal requests."
ON public.withdrawal_requests FOR SELECT
USING (auth.role() = 'admin' OR auth.role() = 'super_admin');
