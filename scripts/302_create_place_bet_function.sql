-- Function to handle placing a bet atomically
CREATE OR REPLACE FUNCTION public.place_bet(
    p_user_id UUID,
    p_session_id UUID,
    p_bet_type TEXT,
    p_numbers TEXT[],
    p_amount NUMERIC,
    p_potential_win NUMERIC
)
RETURNS TABLE (
    bet_id UUID,
    transaction_id UUID,
    new_balance NUMERIC
) AS $$
DECLARE
    v_current_balance NUMERIC;
    v_bet_transaction_id UUID;
    v_new_bet_id UUID;
BEGIN
    -- Check if user exists and get current balance
    SELECT balance INTO v_current_balance
    FROM public.user_profiles
    WHERE id = p_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    -- Check if user has enough balance
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance.';
    END IF;

    -- Check if session is open for betting
    IF NOT EXISTS (SELECT 1 FROM public.game_sessions WHERE id = p_session_id AND status = 'open') THEN
        RAISE EXCEPTION 'Game session is not open for betting.';
    END IF;

    -- Deduct amount from user's balance
    UPDATE public.user_profiles
    SET balance = balance - p_amount
    WHERE id = p_user_id;

    -- Record the transaction for the bet deduction
    INSERT INTO public.transactions (user_id, amount, type, balance_before, balance_after, description)
    VALUES (p_user_id, p_amount, 'bet_placed', v_current_balance, v_current_balance - p_amount, 'Đặt cược ' || p_bet_type || ' cho phiên ' || (SELECT session_number FROM public.game_sessions WHERE id = p_session_id))
    RETURNING id INTO v_bet_transaction_id;

    -- Insert the new bet
    INSERT INTO public.user_bets (user_id, session_id, bet_type, numbers, amount, potential_win, status, transaction_id)
    VALUES (p_user_id, p_session_id, p_bet_type, p_numbers, p_amount, p_potential_win, 'pending', v_bet_transaction_id)
    RETURNING id INTO v_new_bet_id;

    -- Return the new bet ID, transaction ID, and updated balance
    RETURN QUERY SELECT v_new_bet_id, v_bet_transaction_id, v_current_balance - p_amount;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.place_bet(UUID, UUID, TEXT, TEXT[], NUMERIC, NUMERIC) TO authenticated;
