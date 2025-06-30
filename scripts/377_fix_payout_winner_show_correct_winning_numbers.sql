-- Drop existing function
DROP FUNCTION IF EXISTS public.payout_winner_with_detailed_description(UUID, NUMERIC, TEXT);

-- Create enhanced function to handle payout with correct winning numbers display
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
    v_bet_numbers INTEGER[];
    v_winning_numbers TEXT[];
    v_player_winning_numbers TEXT[];
    v_hit_counts JSONB := '{}';
    v_total_hits INTEGER := 0;
    v_enhanced_description TEXT;
    v_number TEXT;
    v_hit_count INTEGER;
BEGIN
    -- Get bet details with session info
    SELECT ub.user_id, ub.bet_type, ub.amount, ub.points, ub.numbers,
           gs.session_number, gs.winning_numbers
    INTO v_user_id, v_bet_type, v_bet_amount, v_bet_points, v_bet_numbers,
         v_session_number, v_winning_numbers
    FROM public.user_bets ub
    JOIN public.game_sessions gs ON ub.session_id = gs.id
    WHERE ub.id = p_bet_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Bet not found: %', p_bet_id;
    END IF;

    -- Calculate which numbers the player actually won (intersection of bet numbers and winning numbers)
    v_player_winning_numbers := ARRAY[]::TEXT[];
    
    IF v_bet_numbers IS NOT NULL AND v_winning_numbers IS NOT NULL THEN
        -- For each number the player bet on
        FOR i IN 1..array_length(v_bet_numbers, 1) LOOP
            v_number := lpad(v_bet_numbers[i]::TEXT, 2, '0');
            
            -- Count how many times this number appears in winning numbers
            v_hit_count := (
                SELECT COUNT(*)
                FROM unnest(v_winning_numbers) AS wn
                WHERE wn = v_number
            );
            
            -- If this number won (appears in winning numbers)
            IF v_hit_count > 0 THEN
                v_player_winning_numbers := array_append(v_player_winning_numbers, v_number);
                v_hit_counts := v_hit_counts || jsonb_build_object(v_number, v_hit_count);
                v_total_hits := v_total_hits + v_hit_count;
            END IF;
        END LOOP;
    END IF;

    -- Build enhanced description with only actual winning numbers
    v_enhanced_description := '🏆 Thắng cược ' || 
        CASE 
            WHEN v_bet_type = 'lo_2_so_1p' THEN 'Lô 2 Số 1p'
            WHEN v_bet_type = 'lo_2_so_5p' THEN 'Lô 2 Số 5p'
            WHEN v_bet_type = 'lo_2_so_30p' THEN 'Lô 2 Số 30p'
            WHEN v_bet_type = 'lo_2_so' THEN 'Lô 2 Số'
            WHEN v_bet_type = 'lo_3_so' THEN 'Lô 3 Số'
            WHEN v_bet_type = 'de' THEN 'Đề'
            ELSE v_bet_type
        END || ': ';

    -- Add winning numbers with hit counts
    IF array_length(v_player_winning_numbers, 1) > 0 THEN
        v_enhanced_description := v_enhanced_description || 'Số trúng [';
        
        FOR i IN 1..array_length(v_player_winning_numbers, 1) LOOP
            v_number := v_player_winning_numbers[i];
            v_hit_count := (v_hit_counts->>v_number)::INTEGER;
            
            IF i > 1 THEN
                v_enhanced_description := v_enhanced_description || ', ';
            END IF;
            
            v_enhanced_description := v_enhanced_description || v_number || '[' || v_hit_count || ']';
        END LOOP;
        
        v_enhanced_description := v_enhanced_description || ']';
    ELSE
        v_enhanced_description := v_enhanced_description || 'Không có số trúng';
    END IF;

    -- Add additional details
    v_enhanced_description := v_enhanced_description || 
        ' | ' || v_bet_points || '.00 điểm/số' ||
        ' | Tổng ' || v_total_hits || ' lần trúng' ||
        ' | Phiên ' || v_session_number ||
        ' | Thưởng: ' || p_winning_amount || '.00đ' ||
        ' | Tiền thắng: +' || p_winning_amount || '.00đ';

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

        -- Record the winning transaction with enhanced description
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
            v_enhanced_description,
            p_bet_id,
            NOW()
        )
        RETURNING id INTO v_transaction_id;

        -- Log success
        RAISE NOTICE 'Payout processed successfully: User %, Bet %, Amount %, Transaction %', 
            v_user_id, p_bet_id, p_winning_amount, v_transaction_id;
        RAISE NOTICE 'Player winning numbers: %, Total hits: %', v_player_winning_numbers, v_total_hits;

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
            'enhanced_description', v_enhanced_description,
            'player_winning_numbers', v_player_winning_numbers,
            'hit_counts', v_hit_counts,
            'total_hits', v_total_hits
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
    RAISE NOTICE 'Function payout_winner_with_detailed_description updated successfully';
    RAISE NOTICE 'Now shows only actual winning numbers with correct hit counts';
    RAISE NOTICE 'Format: Số trúng [34[1], 31[2], 27[2]] | 10.00 điểm/số | Tổng 5 lần trúng | Phiên 2179 | Thưởng: 4950000.00đ';
END $$;
