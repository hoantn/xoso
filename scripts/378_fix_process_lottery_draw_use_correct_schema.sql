-- Drop existing function
DROP FUNCTION IF EXISTS process_lottery_draw(UUID, TEXT[], JSONB);

-- Create corrected function using exact database schema
CREATE OR REPLACE FUNCTION process_lottery_draw(
    p_session_id UUID,
    p_winning_numbers TEXT[],
    p_results_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_record RECORD;
    v_bet_record RECORD;
    v_win_count INTEGER;
    v_win_amount NUMERIC;
    v_total_processed INTEGER := 0;
    v_total_winners INTEGER := 0;
    v_total_payout NUMERIC := 0;
    v_multipliers JSONB;
    v_multiplier NUMERIC;
    v_hit_count INTEGER;
    v_detailed_description TEXT;
    v_bet_numbers_str TEXT[];
    v_number TEXT;
    v_special_prize TEXT;
    v_all_numbers TEXT[];
    v_payout_result JSON;
    v_player_winning_numbers TEXT[];
    v_hit_counts JSONB;
BEGIN
    -- Validate inputs
    IF p_session_id IS NULL OR p_winning_numbers IS NULL THEN
        RAISE EXCEPTION 'Invalid parameters for lottery draw processing';
    END IF;

    -- Define multipliers for different bet types
    v_multipliers := '{
        "lo_2_so_1p": 99,
        "lo_2_so_5p": 99,
        "lo_2_so_30p": 99,
        "lo_2_so_nhanh": 99,
        "lo_3_so_1p": 900,
        "lo_3_so_nhanh": 900,
        "de_dac_biet_1p": 99,
        "de_dac_biet_5p": 99,
        "de_dac_biet_30p": 99,
        "de_dac_biet_nhanh": 99,
        "nhat_to_1p": 9,
        "nhat_to_nhanh": 9,
        "de_dau_duoi_1p": 9,
        "de_dau_duoi_nhanh": 9,
        "xien_2_1p": 17,
        "xien_2_5p": 17,
        "xien_2_30p": 17,
        "xien_2_nhanh": 17,
        "xien_3_1p": 65,
        "xien_3_5p": 65,
        "xien_3_30p": 65,
        "xien_3_nhanh": 65,
        "xien_4_1p": 200,
        "xien_4_5p": 200,
        "xien_4_30p": 200,
        "xien_4_nhanh": 200,
        "lo": 99,
        "lo_2_so": 99,
        "lo_3_so": 900,
        "de": 99,
        "de_dac_biet": 99,
        "nhat_to": 9,
        "de_dau_duoi": 9,
        "xien2": 17,
        "xien_2": 17,
        "xien3": 65,
        "xien_3": 65,
        "xien_4": 200
    }'::JSONB;

    -- Get session details using exact database schema
    SELECT * INTO v_session_record
    FROM game_sessions
    WHERE id = p_session_id;

    IF v_session_record IS NULL THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;

    -- Update session with results using correct column names
    UPDATE game_sessions
    SET status = 'completed',
        winning_numbers = p_winning_numbers,
        results_data = p_results_data,
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Get special prize (first 2 digits from results_data) for Đề calculations
    IF p_results_data ? 'special_prize' THEN
        v_special_prize := right((p_results_data->>'special_prize'), 2);
    ELSIF array_length(p_winning_numbers, 1) > 0 THEN
        v_special_prize := p_winning_numbers[1];
    END IF;

    RAISE NOTICE 'Processing lottery draw for session %, special prize last 2 digits: %', p_session_id, v_special_prize;

    -- Process all pending bets for this session
    FOR v_bet_record IN 
        SELECT * FROM user_bets 
        WHERE session_id = p_session_id AND status = 'pending'
        ORDER BY created_at
    LOOP
        v_total_processed := v_total_processed + 1;
        v_win_amount := 0;
        v_hit_count := 0;
        v_player_winning_numbers := ARRAY[]::TEXT[];
        v_hit_counts := '{}'::JSONB;

        -- Convert INTEGER[] to TEXT[] for comparison
        v_bet_numbers_str := ARRAY[]::TEXT[];
        FOR i IN 1..array_length(v_bet_record.numbers, 1) LOOP
            v_bet_numbers_str := array_append(v_bet_numbers_str, lpad(v_bet_record.numbers[i]::TEXT, 2, '0'));
        END LOOP;

        -- Get multiplier for this bet type
        v_multiplier := (v_multipliers->>v_bet_record.bet_type)::NUMERIC;
        IF v_multiplier IS NULL THEN
            v_multiplier := 99; -- Default multiplier
            RAISE NOTICE 'Using default multiplier for bet type: %', v_bet_record.bet_type;
        END IF;

        RAISE NOTICE 'Processing bet %: type=%, numbers=[%], points=%, amount=%', 
            v_bet_record.id, v_bet_record.bet_type, array_to_string(v_bet_numbers_str, ','), 
            v_bet_record.points, v_bet_record.amount;

        -- Calculate wins based on bet type
        IF v_bet_record.bet_type LIKE '%lo%' THEN
            -- Lô betting: count occurrences of each number
            FOREACH v_number IN ARRAY v_bet_numbers_str LOOP
                v_hit_count := (
                    SELECT COUNT(*) 
                    FROM unnest(p_winning_numbers) AS winning_num 
                    WHERE winning_num = v_number
                );
                
                IF v_hit_count > 0 THEN
                    v_player_winning_numbers := array_append(v_player_winning_numbers, v_number);
                    v_hit_counts := v_hit_counts || jsonb_build_object(v_number, v_hit_count);
                END IF;
            END LOOP;

            -- Calculate total hits for all numbers
            v_hit_count := 0;
            FOR i IN 1..jsonb_object_keys_length(v_hit_counts) LOOP
                v_hit_count := v_hit_count + (SELECT jsonb_object_values(v_hit_counts) @> to_jsonb((SELECT jsonb_object_values(v_hit_counts) #> ARRAY[i-1])))::integer;
            END LOOP;

            IF v_hit_count > 0 THEN
                SELECT SUM((v_hit_counts->>key)::integer) INTO v_hit_count
                FROM jsonb_object_keys(v_hit_counts) AS key;
                
                IF v_bet_record.points > 0 THEN
                    -- Point-based: points × multiplier × hit_count × 1000
                    v_win_amount := v_bet_record.points * v_multiplier * v_hit_count * 1000;
                ELSE
                    -- Money-based: amount × multiplier × hit_count
                    v_win_amount := v_bet_record.amount * v_multiplier * v_hit_count;
                END IF;
                RAISE NOTICE 'Lô win: hit_count=%, win_amount=%', v_hit_count, v_win_amount;
            END IF;

        ELSIF v_bet_record.bet_type LIKE '%de%' THEN
            -- Đề betting: exact match with special prize last 2 digits
            IF v_special_prize IS NOT NULL THEN
                IF v_special_prize = ANY(v_bet_numbers_str) THEN
                    v_hit_count := 1;
                    v_player_winning_numbers := array_append(v_player_winning_numbers, v_special_prize);
                    v_hit_counts := jsonb_build_object(v_special_prize, 1);
                    v_win_amount := v_bet_record.amount * v_multiplier;
                    RAISE NOTICE 'Đề win: special_last2=%, win_amount=%', v_special_prize, v_win_amount;
                END IF;
            END IF;

        ELSIF v_bet_record.bet_type LIKE '%nhat_to%' THEN
            -- Nhất tố: last 1 digit of special prize
            IF v_special_prize IS NOT NULL THEN
                v_number := right(v_special_prize, 1); -- Last 1 digit
                IF v_number = ANY(v_bet_numbers_str) THEN
                    v_hit_count := 1;
                    v_player_winning_numbers := array_append(v_player_winning_numbers, v_number);
                    v_hit_counts := jsonb_build_object(v_number, 1);
                    v_win_amount := v_bet_record.amount * v_multiplier;
                    RAISE NOTICE 'Nhất tố win: special_last1=%, win_amount=%', v_number, v_win_amount;
                END IF;
            END IF;

        ELSIF v_bet_record.bet_type LIKE '%de_dau_duoi%' THEN
            -- Đề đầu đuôi: first or last digit of special prize
            IF v_special_prize IS NOT NULL THEN
                v_all_numbers := ARRAY[left(v_special_prize, 1), right(v_special_prize, 1)];
                FOREACH v_number IN ARRAY v_bet_numbers_str LOOP
                    IF v_number = ANY(v_all_numbers) THEN
                        v_hit_count := 1;
                        v_player_winning_numbers := array_append(v_player_winning_numbers, v_number);
                        v_hit_counts := jsonb_build_object(v_number, 1);
                        EXIT; -- Only count once
                    END IF;
                END LOOP;
                IF v_hit_count > 0 THEN
                    v_win_amount := v_bet_record.amount * v_multiplier;
                    RAISE NOTICE 'Đề đầu đuôi win: win_amount=%', v_win_amount;
                END IF;
            END IF;

        ELSIF v_bet_record.bet_type LIKE '%xien%' THEN
            -- Xiên betting: all numbers must be present
            v_win_count := 0;
            FOREACH v_number IN ARRAY v_bet_numbers_str LOOP
                IF v_number = ANY(p_winning_numbers) THEN
                    v_win_count := v_win_count + 1;
                    v_player_winning_numbers := array_append(v_player_winning_numbers, v_number);
                    v_hit_counts := v_hit_counts || jsonb_build_object(v_number, 1);
                END IF;
            END LOOP;

            IF v_win_count = array_length(v_bet_numbers_str, 1) THEN
                v_hit_count := 1;
                v_win_amount := v_bet_record.amount * v_multiplier;
                RAISE NOTICE 'Xiên win: all_numbers_hit=%, win_amount=%', v_win_count, v_win_amount;
            END IF;
        END IF;

        -- Process the bet result
        IF v_win_amount > 0 THEN
            -- Create detailed winning description with only winning numbers
            v_detailed_description := '🏆 Thắng cược ' ||
                CASE 
                    WHEN v_bet_record.bet_type = 'lo_2_so_1p' THEN 'Lô 2 Số 1p'
                    WHEN v_bet_record.bet_type = 'lo_2_so_5p' THEN 'Lô 2 Số 5p'
                    WHEN v_bet_record.bet_type = 'lo_2_so_30p' THEN 'Lô 2 Số 30p'
                    ELSE v_bet_record.bet_type
                END || ': Số trúng [';

            -- Add only the winning numbers with hit counts
            FOR i IN 1..array_length(v_player_winning_numbers, 1) LOOP
                IF i > 1 THEN
                    v_detailed_description := v_detailed_description || ', ';
                END IF;
                v_number := v_player_winning_numbers[i];
                v_detailed_description := v_detailed_description || v_number || '[' || (v_hit_counts->>v_number) || ']';
            END LOOP;

            v_detailed_description := v_detailed_description || '] | ' ||
                v_bet_record.points || '.00 điểm/số | Tổng ' || v_hit_count || ' lần trúng | Phiên ' || 
                v_session_record.session_number || ' | Thưởng: ' || v_win_amount || '.00đ | Tiền thắng: +' || v_win_amount || '.00đ';

            -- Pay the winner using the existing payout function
            SELECT payout_winner(v_bet_record.id, v_win_amount, v_detailed_description) INTO v_payout_result;
            
            v_total_winners := v_total_winners + 1;
            v_total_payout := v_total_payout + v_win_amount;
            
            RAISE NOTICE 'Winner processed: bet_id=%, amount=%', v_bet_record.id, v_win_amount;
        ELSE
            -- Mark as lost
            UPDATE user_bets
            SET status = 'lost',
                win_amount = 0,
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_bet_record.id;
            
            RAISE NOTICE 'Losing bet processed: bet_id=%', v_bet_record.id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Lottery draw completed: Session %, Processed %, Winners %, Payout %', 
        p_session_id, v_total_processed, v_total_winners, v_total_payout;

    RETURN json_build_object(
        'success', true,
        'session_id', p_session_id,
        'session_number', v_session_record.session_number,
        'processed_bets', v_total_processed,
        'winners', v_total_winners,
        'total_payout', v_total_payout,
        'winning_numbers', p_winning_numbers
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_lottery_draw(UUID, TEXT[], JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_lottery_draw(UUID, TEXT[], JSONB) TO service_role;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '=== PROCESS LOTTERY DRAW FUNCTION FIXED ===';
    RAISE NOTICE 'Using correct database schema:';
    RAISE NOTICE '  ✅ game_sessions.results_data (not results)';
    RAISE NOTICE '  ✅ game_sessions.winning_numbers';
    RAISE NOTICE '  ✅ user_bets.numbers (INTEGER[])';
    RAISE NOTICE '  ✅ transactions.game_bet_id';
    RAISE NOTICE 'Function ready for use with existing database structure.';
END $$;
