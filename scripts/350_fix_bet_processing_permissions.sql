-- This script ensures the API has the correct permissions to process bets.

-- STEP 1: Grant full access to 'user_bets' for the service_role
-- This ensures the API, using the service key, can read and update all bets, bypassing any user-specific RLS.
DROP POLICY IF EXISTS "service_role_access_all_bets" ON public.user_bets;
CREATE POLICY "service_role_access_all_bets"
ON public.user_bets
FOR ALL -- Grants SELECT, INSERT, UPDATE, DELETE
TO service_role
USING (true)
WITH CHECK (true);

-- STEP 2: Create a helper function to handle winner payouts transactionally.
-- This is safer than handling balance updates directly in the API code.
CREATE OR REPLACE FUNCTION payout_winner(
    p_user_id UUID,
    p_bet_id UUID,
    p_win_amount NUMERIC,
    p_session_id UUID
)
RETURNS void AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Lock the user row to prevent race conditions
    SELECT balance INTO v_current_balance FROM public.users WHERE id = p_user_id FOR UPDATE;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_win_amount;

    -- Update user's balance
    UPDATE public.users
    SET balance = v_new_balance
    WHERE id = p_user_id;

    -- Create a 'game_win' transaction record
    INSERT INTO public.transactions (user_id, type, amount, status, description, reference_id, balance_before, balance_after, metadata)
    VALUES (
        p_user_id,
        'game_win',
        p_win_amount,
        'completed',
        'Thắng cược Lô Đề Nhanh',
        p_bet_id,
        v_current_balance,
        v_new_balance,
        jsonb_build_object('bet_id', p_bet_id, 'session_id', p_session_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the authenticated and service roles
GRANT EXECUTE ON FUNCTION payout_winner(UUID, UUID, NUMERIC, UUID) TO authenticated, service_role;

-- Log completion
SELECT 'Successfully updated permissions and created payout_winner function.';
