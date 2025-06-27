-- Create function to handle payout for winning bets with points support
-- This function processes both point-based (Lô) and money-based (Đề/Xiên) winnings

CREATE OR REPLACE FUNCTION public.payout_winner_with_points(
    p_bet_id UUID,
    p_winning_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_bet_type TEXT;
    v_bet_amount NUMERIC;
    v_bet_points INTEGER;
    v_session_number TEXT;
    v_description TEXT;
    v_is_point_based BOOLEAN;
BEGIN
    -- Get bet details
    SELECT ub.user_id, ub.bet_type, ub.amount, ub.points, gs.session_number
    INTO v_user_id, v_bet_type, v_bet_amount, v_bet_points, v_session_number
    FROM public.user_bets ub
    JOIN public.game_sessions gs ON ub.session_id = gs.id
    WHERE ub.id = p_bet_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Bet not found: %', p_bet_id;
    END IF;

    -- Determine if this is a point-based bet
    v_is_point_based := (v_bet_type LIKE '%lo%' AND v_bet_type NOT LIKE '%de%');

    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM public.users
    WHERE id = v_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', v_user_id;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_winning_amount;

    -- Create description based on bet type
    IF v_is_point_based THEN
        v_description := format('Thắng cược Lô %s: %s điểm - Phiên %s - Thưởng: %s VND', 
            v_bet_type, v_bet_points, v_session_number, p_winning_amount);
    ELSE
        v_description := format('Thắng cược %s - Phiên %s - Thưởng: %s VND', 
            v_bet_type, v_session_number, p_winning_amount);
    END IF;

    -- Start transaction
    BEGIN
        -- Add winning amount to user balance
        UPDATE public.users
        SET balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_user_id;

        -- Update bet status to won
        UPDATE public.user_bets
        SET status = 'won',
            win_amount = p_winning_amount,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_bet_id;

        -- Record the winning transaction
        INSERT INTO public.transactions (
            user_id, amount, type, balance_before, balance_after, 
            description, created_at
        )
        VALUES (
            v_user_id, p_winning_amount, 'win', v_current_balance, 
            v_new_balance, v_description, NOW()
        );

        -- Log success
        RAISE NOTICE 'Payout processed successfully: User %, Bet %, Amount %', 
            v_user_id, p_bet_id, p_winning_amount;

        -- Return success result
        RETURN json_build_object(
            'success', true,
            'bet_id', p_bet_id,
            'user_id', v_user_id,
            'winning_amount', p_winning_amount,
            'balance_before', v_current_balance,
            'balance_after', v_new_balance,
            'is_point_based', v_is_point_based,
            'bet_type', v_bet_type,
            'points', v_bet_points
        );

    EXCEPTION WHEN OTHERS THEN
        -- Rollback is automatic in PostgreSQL for function exceptions
        RAISE EXCEPTION 'Payout failed: %', SQLERRM;
    END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(UUID, NUMERIC) TO service_role;

-- Test the function
DO $$
BEGIN
    RAISE NOTICE 'Function payout_winner_with_points created successfully';
    RAISE NOTICE 'Supports both point-based (Lô) and money-based (Đề/Xiên) payouts';
END $$;
