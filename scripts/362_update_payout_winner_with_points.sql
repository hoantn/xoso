-- Updated payout function to handle points-based winnings with correct calculation
-- Formula: points × multiplier × occurrences × 1000

CREATE OR REPLACE FUNCTION public.payout_winner(
    p_user_id UUID,
    p_bet_id UUID,
    p_win_amount NUMERIC,
    p_session_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_current_balance NUMERIC;
    v_session_number TEXT;
    v_bet_info RECORD;
    v_win_description TEXT;
BEGIN
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM public.users
    WHERE id = p_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Get session number for description
    SELECT session_number INTO v_session_number
    FROM public.game_sessions
    WHERE id = p_session_id;

    -- Get bet information
    SELECT bet_type, points, amount INTO v_bet_info
    FROM public.user_bets
    WHERE id = p_bet_id;

    -- Create win description based on bet type
    IF v_bet_info.points > 0 THEN
        v_win_description := format('Thắng cược %s: %s điểm - Phiên %s', 
            v_bet_info.bet_type, v_bet_info.points, v_session_number);
    ELSE
        v_win_description := format('Thắng cược %s: %s VND - Phiên %s', 
            v_bet_info.bet_type, v_bet_info.amount, v_session_number);
    END IF;

    -- Add winnings to user balance
    UPDATE public.users
    SET balance = balance + p_win_amount,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Record the winning transaction
    INSERT INTO public.transactions (
        user_id, amount, type, balance_before, balance_after, 
        description, created_at
    )
    VALUES (
        p_user_id, p_win_amount, 'win', v_current_balance, 
        v_current_balance + p_win_amount, v_win_description, NOW()
    );

    -- Log the payout
    RAISE NOTICE 'Payout completed: User %, Bet %, Amount %', p_user_id, p_bet_id, p_win_amount;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to service role for automated processing
GRANT EXECUTE ON FUNCTION public.payout_winner(UUID, UUID, NUMERIC, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.payout_winner(UUID, UUID, NUMERIC, UUID) TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Payout function updated successfully with points support';
END $$;
