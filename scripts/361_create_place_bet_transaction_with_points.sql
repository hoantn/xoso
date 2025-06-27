-- Create function to handle bet placement with points support
-- This function handles both point-based (Lô) and money-based (Đề/Xiên) betting

CREATE OR REPLACE FUNCTION public.place_bet_transaction_with_points(
    p_user_id UUID,
    p_session_id UUID,
    p_bet_type TEXT,
    p_numbers TEXT[],
    p_amount NUMERIC,
    p_points INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_bet_id UUID;
    v_session_number TEXT;
    v_description TEXT;
    v_is_point_based BOOLEAN;
BEGIN
    -- Determine if this is a point-based bet
    v_is_point_based := (p_bet_type LIKE '%lo%' AND p_bet_type NOT LIKE '%de%');
    
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM public.users
    WHERE id = p_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;

    -- Check if user has sufficient balance
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_current_balance, p_amount;
    END IF;

    -- Get session number for description
    SELECT session_number INTO v_session_number
    FROM public.game_sessions
    WHERE id = p_session_id;

    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;

    -- Create description based on bet type
    IF v_is_point_based THEN
        v_description := format('Cược %s: %s điểm (%s số) - Phiên %s', 
            p_bet_type, p_points, array_length(p_numbers, 1), v_session_number);
    ELSE
        v_description := format('Cược %s: %s VND (%s số) - Phiên %s', 
            p_bet_type, p_amount, array_length(p_numbers, 1), v_session_number);
    END IF;

    -- Start transaction
    BEGIN
        -- Deduct amount from user balance
        UPDATE public.users
        SET balance = v_new_balance,
            updated_at = NOW()
        WHERE id = p_user_id;

        -- Create the bet record
        INSERT INTO public.user_bets (
            user_id, session_id, bet_type, numbers, amount, points, 
            status, created_at, updated_at
        )
        VALUES (
            p_user_id, p_session_id, p_bet_type, p_numbers, p_amount, p_points,
            'pending', NOW(), NOW()
        )
        RETURNING id INTO v_bet_id;

        -- Record the transaction
        INSERT INTO public.transactions (
            user_id, amount, type, balance_before, balance_after, 
            description, created_at
        )
        VALUES (
            p_user_id, -p_amount, 'purchase', v_current_balance, 
            v_new_balance, v_description, NOW()
        );

        -- Log success
        RAISE NOTICE 'Bet placed successfully: User %, Bet %, Type %, Amount %, Points %', 
            p_user_id, v_bet_id, p_bet_type, p_amount, p_points;

        -- Return success result
        RETURN json_build_object(
            'success', true,
            'bet_id', v_bet_id,
            'user_id', p_user_id,
            'session_id', p_session_id,
            'bet_type', p_bet_type,
            'numbers', p_numbers,
            'amount', p_amount,
            'points', p_points,
            'balance_before', v_current_balance,
            'balance_after', v_new_balance,
            'is_point_based', v_is_point_based
        );

    EXCEPTION WHEN OTHERS THEN
        -- Rollback is automatic in PostgreSQL for function exceptions
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
    END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.place_bet_transaction_with_points(UUID, UUID, TEXT, TEXT[], NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bet_transaction_with_points(UUID, UUID, TEXT, TEXT[], NUMERIC, INTEGER) TO service_role;

-- Test the function
DO $$
BEGIN
    RAISE NOTICE 'Function place_bet_transaction_with_points created successfully';
    RAISE NOTICE 'This function supports both point-based (Lô) and money-based (Đề/Xiên) betting';
END $$;
