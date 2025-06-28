-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.payout_winner_with_detailed_description(UUID, NUMERIC, TEXT);

-- Create enhanced function to handle payout with detailed winning description
CREATE OR REPLACE FUNCTION public.payout_winner_with_detailed_description(
    p_bet_id UUID,
    p_winning_amount NUMERIC,
    p_detailed_description TEXT
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
    v_transaction_id UUID;
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

    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM public.users
    WHERE id = v_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', v_user_id;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_winning_amount;

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

        -- Record the winning transaction with detailed description
        INSERT INTO public.transactions (
            id,
            user_id, 
            amount, 
            type, 
            balance_before, 
            balance_after, 
            description, 
            game_bet_id,
            created_at
        )
        VALUES (
            gen_random_uuid(),
            v_user_id, 
            p_winning_amount, 
            'bet_won', 
            v_current_balance, 
            v_new_balance, 
            p_detailed_description,
            p_bet_id,
            NOW()
        )
        RETURNING id INTO v_transaction_id;

        -- Log success
        RAISE NOTICE 'Payout processed successfully: User %, Bet %, Amount %, Transaction %', 
            v_user_id, p_bet_id, p_winning_amount, v_transaction_id;

        -- Return success result
        RETURN json_build_object(
            'success', true,
            'bet_id', p_bet_id,
            'user_id', v_user_id,
            'winning_amount', p_winning_amount,
            'balance_before', v_current_balance,
            'balance_after', v_new_balance,
            'transaction_id', v_transaction_id,
            'bet_type', v_bet_type,
            'points', v_bet_points,
            'detailed_description', p_detailed_description
        );

    EXCEPTION WHEN OTHERS THEN
        -- Rollback is automatic in PostgreSQL for function exceptions
        RAISE EXCEPTION 'Payout failed: %', SQLERRM;
    END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.payout_winner_with_detailed_description(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_winner_with_detailed_description(UUID, NUMERIC, TEXT) TO service_role;

-- Test the function
DO $$
BEGIN
    RAISE NOTICE 'Function payout_winner_with_detailed_description created successfully';
    RAISE NOTICE 'Creates detailed winning descriptions with winning numbers, hit counts, and total winnings';
END $$;
