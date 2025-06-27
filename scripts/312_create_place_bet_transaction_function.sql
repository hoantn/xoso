-- Function to handle bet placement as a transaction
CREATE OR REPLACE FUNCTION public.place_bet_transaction(
    p_user_id UUID,
    p_session_id UUID,
    p_bet_type TEXT,
    p_numbers TEXT[],
    p_amount NUMERIC,
    p_potential_win NUMERIC,
    p_total_cost NUMERIC
)
RETURNS TABLE (
    bet_id UUID,
    transaction_id UUID,
    new_balance NUMERIC
) AS $$
DECLARE
    v_bet_id UUID;
    v_transaction_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM public.user_profiles
    WHERE id = p_user_id;

    -- Check if user has sufficient balance
    IF v_current_balance < p_total_cost THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_current_balance, p_total_cost;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance - p_total_cost;

    -- Deduct amount from user balance
    UPDATE public.user_profiles
    SET balance = v_new_balance
    WHERE id = p_user_id;

    -- Create transaction record
    INSERT INTO public.transactions (
        user_id, amount, type, balance_before, balance_after, description
    )
    VALUES (
        p_user_id, -p_total_cost, 'bet_placed', 
        v_current_balance, v_new_balance,
        'Đặt cược ' || p_bet_type || ' - ' || array_to_string(p_numbers, ', ')
    )
    RETURNING id INTO v_transaction_id;

    -- Create bet record
    INSERT INTO public.user_bets (
        user_id, session_id, bet_type, numbers, amount, potential_win, status
    )
    VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers, p_amount, p_potential_win, 'pending'
    )
    RETURNING id INTO v_bet_id;

    -- Update transaction with bet_id
    UPDATE public.transactions
    SET game_bet_id = v_bet_id
    WHERE id = v_transaction_id;

    RETURN QUERY SELECT v_bet_id, v_transaction_id, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to service role
GRANT EXECUTE ON FUNCTION public.place_bet_transaction(UUID, UUID, TEXT, TEXT[], NUMERIC, NUMERIC, NUMERIC) TO service_role;
