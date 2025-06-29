-- Drop existing function
DROP FUNCTION IF EXISTS public.payout_winner_with_points(UUID, UUID, TEXT[]);

-- Create enhanced payout function with proper winning description
CREATE OR REPLACE FUNCTION public.payout_winner_with_points(
    p_bet_id UUID,
    p_session_id UUID,
    p_winning_numbers TEXT[]
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_bet_type TEXT;
    v_bet_amount NUMERIC;
    v_bet_points INTEGER;
    v_bet_numbers INTEGER[];
    v_session_number TEXT;
    v_transaction_id UUID;
    v_win_amount NUMERIC := 0;
    v_is_winner BOOLEAN := FALSE;
    v_hit_count INTEGER := 0;
    v_hit_details TEXT := '';
    v_detailed_description TEXT;
    v_bet_type_display TEXT;
    v_number_hits RECORD;
    v_hit_numbers TEXT[] := '{}';
    v_hit_counts_json JSONB := '{}';
BEGIN
    -- Get bet details
    SELECT ub.user_id, ub.bet_type, ub.amount, ub.points, ub.numbers, gs.session_number
    INTO v_user_id, v_bet_type, v_bet_amount, v_bet_points, v_bet_numbers, v_session_number
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

    -- Get bet type display name
    v_bet_type_display := CASE v_bet_type
        WHEN 'lo_2_so_1p' THEN 'Lô 2 Số 1 Phút'
        WHEN 'lo_2_so_5p' THEN 'Lô 2 Số 5 Phút'
        WHEN 'lo_2_so_30p' THEN 'Lô 2 Số 30 Phút'
        WHEN 'lo_3_so_1p' THEN 'Lô 3 Số 1 Phút'
        WHEN 'de_dac_biet_1p' THEN 'Đề Đặc Biệt 1 Phút'
        WHEN 'de_dac_biet_5p' THEN 'Đề Đặc Biệt 5 Phút'
        WHEN 'de_dac_biet_30p' THEN 'Đề Đặc Biệt 30 Phút'
        ELSE v_bet_type
    END;

    -- Check for winning numbers and calculate hits
    IF v_bet_numbers IS NOT NULL AND array_length(v_bet_numbers, 1) > 0 THEN
        FOR i IN 1..array_length(v_bet_numbers, 1) LOOP
            DECLARE
                v_bet_number_str TEXT := lpad(v_bet_numbers[i]::TEXT, 2, '0');
                v_number_hit_count INTEGER := 0;
            BEGIN
                -- Count how many times this bet number appears in winning numbers
                SELECT COUNT(*)::INTEGER INTO v_number_hit_count
                FROM unnest(p_winning_numbers) AS winning_num
                WHERE winning_num = v_bet_number_str;

                IF v_number_hit_count > 0 THEN
                    v_is_winner := TRUE;
                    v_hit_count := v_hit_count + v_number_hit_count;
                    v_hit_numbers := array_append(v_hit_numbers, v_bet_number_str);
                    v_hit_counts_json := v_hit_counts_json || jsonb_build_object(v_bet_number_str, v_number_hit_count);
                    
                    -- Build hit details string
                    IF v_hit_details != '' THEN
                        v_hit_details := v_hit_details || ', ';
                    END IF;
                    v_hit_details := v_hit_details || v_bet_number_str || ' (' || v_number_hit_count || ' lần)';
                END IF;
            END;
        END LOOP;
    END IF;

    -- Calculate win amount if winner
    IF v_is_winner THEN
        -- For point-based bets (Lô): win_amount = hit_count * points * 99 * 1000
        -- For amount-based bets (Đề): win_amount = hit_count * bet_amount * multiplier
        IF v_bet_type LIKE 'lo_%' THEN
            v_win_amount := v_hit_count * COALESCE(v_bet_points, 1) * 99 * 1000;
        ELSE
            -- For Đề bets, use different multiplier
            v_win_amount := v_hit_count * COALESCE(v_bet_amount, 0) * 80;
        END IF;
    END IF;

    -- Create detailed description
    IF v_is_winner THEN
        v_detailed_description := format(
            '🏆 Thắng cược %s: Số trúng [%s] | %s điểm/số | Tổng %s lần trúng | Phiên %s | Thưởng: %sđ',
            v_bet_type_display,
            v_hit_details,
            COALESCE(v_bet_points, 0),
            v_hit_count,
            v_session_number,
            v_win_amount::BIGINT
        );
    ELSE
        v_detailed_description := format(
            '❌ Không trúng cược %s | Phiên %s',
            v_bet_type_display,
            v_session_number
        );
    END IF;

    -- Process the bet result
    IF v_is_winner AND v_win_amount > 0 THEN
        -- Calculate new balance
        v_new_balance := v_current_balance + v_win_amount;

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
                win_amount = v_win_amount,
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = p_bet_id;

            -- Record the winning transaction
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
                v_win_amount, 
                'bet_won', 
                v_current_balance, 
                v_new_balance, 
                v_detailed_description,
                p_bet_id,
                NOW()
            )
            RETURNING id INTO v_transaction_id;

            RAISE NOTICE 'Winner payout processed: User %, Bet %, Amount %, Transaction %', 
                v_user_id, p_bet_id, v_win_amount, v_transaction_id;

        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Payout failed: %', SQLERRM;
        END;
    ELSE
        -- Update bet status to lost
        UPDATE public.user_bets
        SET status = 'lost',
            win_amount = 0,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_bet_id;

        RAISE NOTICE 'Bet marked as lost: User %, Bet %', v_user_id, p_bet_id;
    END IF;

    -- Return result
    RETURN json_build_object(
        'success', true,
        'bet_id', p_bet_id,
        'user_id', v_user_id,
        'is_winner', v_is_winner,
        'win_amount', v_win_amount,
        'hit_count', v_hit_count,
        'hit_numbers', v_hit_numbers,
        'hit_counts', v_hit_counts_json,
        'balance_before', v_current_balance,
        'balance_after', CASE WHEN v_is_winner THEN v_new_balance ELSE v_current_balance END,
        'transaction_id', v_transaction_id,
        'detailed_description', v_detailed_description
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(UUID, UUID, TEXT[]) TO service_role;

-- Test the function
DO $$
BEGIN
    RAISE NOTICE 'Enhanced payout_winner_with_points function created successfully';
    RAISE NOTICE 'Now creates detailed winning descriptions with proper format';
END $$;
