-- Updated function to process bet results with correct logic for special prize and 3-digit numbers
CREATE OR REPLACE FUNCTION public.process_bet_results(p_session_id UUID)
RETURNS TABLE (
    processed_bets INTEGER,
    total_winnings NUMERIC
) AS $$
DECLARE
    v_session RECORD;
    v_bet RECORD;
    v_is_winner BOOLEAN;
    v_processed_count INTEGER := 0;
    v_total_winnings NUMERIC := 0;
    v_current_balance NUMERIC;
    v_winning_transaction_id UUID;
    v_occurrence_count INTEGER := 0;
    v_actual_win NUMERIC;
BEGIN
    -- Get session details
    SELECT * INTO v_session
    FROM public.game_sessions
    WHERE id = p_session_id AND status = 'completed';

    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Session not found or not completed.';
    END IF;

    -- Process each pending bet for this session
    FOR v_bet IN 
        SELECT * FROM public.user_bets 
        WHERE session_id = p_session_id AND status = 'pending'
    LOOP
        v_is_winner := FALSE;

        -- Check if bet is a winner based on bet type and winning numbers
        CASE v_bet.bet_type
            WHEN 'lo_2_so', 'lo', 'lo_2_so_nhanh' THEN
                -- Check if any of the bet numbers match last 2 digits of winning numbers
                -- Count occurrences and multiply winnings accordingly
                SELECT COUNT(*) INTO v_occurrence_count
                FROM unnest(v_session.winning_numbers) AS wn
                WHERE RIGHT(wn, 2) = ANY(v_bet.numbers);
                
                v_is_winner := v_occurrence_count > 0;
                -- Multiply potential win by occurrence count for LÔ
                v_actual_win := v_bet.potential_win * v_occurrence_count;
                
            WHEN 'de_dac_biet', 'de', 'de_dac_biet_nhanh' THEN
                -- Check if bet number matches last 2 digits of special prize (first winning number)
                v_is_winner := RIGHT(v_session.winning_numbers[1], 2) = ANY(v_bet.numbers);
                v_actual_win := v_bet.potential_win;
                
            WHEN 'nhat_to', 'nhat_to_nhanh' THEN
                -- NEW: Check if bet number matches last 2 digits of first prize (second winning number)
                v_is_winner := RIGHT(v_session.winning_numbers[2], 2) = ANY(v_bet.numbers);
                v_actual_win := v_bet.potential_win;
                
            WHEN 'de_dau_duoi', 'dau', 'duoi', 'de_dau_duoi_nhanh' THEN
                -- Check if bet number matches first or last digit of special prize
                v_is_winner := (
                    LEFT(RIGHT(v_session.winning_numbers[1], 2), 1) = ANY(v_bet.numbers) OR
                    RIGHT(v_session.winning_numbers[1], 1) = ANY(v_bet.numbers)
                );
                v_actual_win := v_bet.potential_win;
                
            WHEN 'lo_3_so', 'lo_3_so_nhanh' THEN
                -- Check if bet number matches last 3 digits of any winning number
                -- Count occurrences and multiply winnings accordingly
                SELECT COUNT(*) INTO v_occurrence_count
                FROM unnest(v_session.winning_numbers) AS wn
                WHERE RIGHT(wn, 3) = ANY(v_bet.numbers);
                
                v_is_winner := v_occurrence_count > 0;
                v_actual_win := v_bet.potential_win * v_occurrence_count;
                
            WHEN 'de_3_cang', 'de_3_cang_nhanh' THEN
                -- Check if bet number matches last 3 digits of special prize only
                v_is_winner := RIGHT(v_session.winning_numbers[1], 3) = ANY(v_bet.numbers);
                v_actual_win := v_bet.potential_win;
                
            WHEN 'xien_2', 'xien2', 'xien_2_nhanh' THEN
                -- Check if all 2 numbers in the bet are winners (last 2 digits)
                v_is_winner := (
                    SELECT COUNT(*) FROM unnest(v_bet.numbers) AS bn
                    WHERE EXISTS (
                        SELECT 1 FROM unnest(v_session.winning_numbers) AS wn
                        WHERE RIGHT(wn, 2) = bn
                    )
                ) = 2;
                v_actual_win := v_bet.potential_win;
                
            WHEN 'xien_3', 'xien3', 'xien_3_nhanh' THEN
                -- Check if all 3 numbers in the bet are winners (last 2 digits)
                v_is_winner := (
                    SELECT COUNT(*) FROM unnest(v_bet.numbers) AS bn
                    WHERE EXISTS (
                        SELECT 1 FROM unnest(v_session.winning_numbers) AS wn
                        WHERE RIGHT(wn, 2) = bn
                    )
                ) = 3;
                v_actual_win := v_bet.potential_win;
                
            WHEN 'xien_4', 'xien_4_nhanh' THEN
                -- Check if all 4 numbers in the bet are winners (last 2 digits)
                v_is_winner := (
                    SELECT COUNT(*) FROM unnest(v_bet.numbers) AS bn
                    WHERE EXISTS (
                        SELECT 1 FROM unnest(v_session.winning_numbers) AS wn
                        WHERE RIGHT(wn, 2) = bn
                    )
                ) = 4;
                v_actual_win := v_bet.potential_win;
        END CASE;

        -- Update bet status and process winnings
        IF v_is_winner THEN
            -- Get current user balance
            SELECT balance INTO v_current_balance
            FROM public.user_profiles
            WHERE id = v_bet.user_id;

            -- Add winnings to user balance (potential_win already calculated correctly)
            UPDATE public.user_profiles
            SET balance = balance + v_actual_win
            WHERE id = v_bet.user_id;

            -- Record winning transaction
            INSERT INTO public.transactions (
                user_id, amount, type, balance_before, balance_after, 
                description, game_bet_id
            )
            VALUES (
                v_bet.user_id, v_actual_win, 'bet_won', 
                v_current_balance, v_current_balance + v_actual_win,
                'Thắng cược ' || v_bet.bet_type || ' phiên ' || v_session.session_number,
                v_bet.id
            )
            RETURNING id INTO v_winning_transaction_id;

            -- Update bet status to won
            UPDATE public.user_bets
            SET status = 'won', updated_at = NOW()
            WHERE id = v_bet.id;

            v_total_winnings := v_total_winnings + v_actual_win;
        ELSE
            -- Update bet status to lost
            UPDATE public.user_bets
            SET status = 'lost', updated_at = NOW()
            WHERE id = v_bet.id;
        END IF;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    RETURN QUERY SELECT v_processed_count, v_total_winnings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to service role for automated processing
GRANT EXECUTE ON FUNCTION public.process_bet_results(UUID) TO service_role;
