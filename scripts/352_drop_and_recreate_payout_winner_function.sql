-- Drop existing payout_winner function if it exists
DROP FUNCTION IF EXISTS public.payout_winner(UUID, UUID, NUMERIC, UUID);

-- Create payout_winner function to handle winner payouts safely
CREATE OR REPLACE FUNCTION public.payout_winner(
    p_user_id UUID,
    p_bet_id UUID,
    p_win_amount NUMERIC,
    p_session_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_session_number INTEGER;
BEGIN
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM public.users
    WHERE id = p_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Get session number for transaction description
    SELECT session_number INTO v_session_number
    FROM public.game_sessions
    WHERE id = p_session_id;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_win_amount;

    -- Update user balance
    UPDATE public.users
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Create transaction record
    INSERT INTO public.transactions (
        user_id, 
        amount, 
        type, 
        balance_before, 
        balance_after, 
        description,
        created_at
    )
    VALUES (
        p_user_id, 
        p_win_amount, 
        'bet_won', 
        v_current_balance, 
        v_new_balance,
        'Thắng cược phiên ' || COALESCE(v_session_number::TEXT, 'N/A'),
        NOW()
    );

    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Payout failed for user % bet %: %', p_user_id, p_bet_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to service_role
GRANT EXECUTE ON FUNCTION public.payout_winner(UUID, UUID, NUMERIC, UUID) TO service_role;
