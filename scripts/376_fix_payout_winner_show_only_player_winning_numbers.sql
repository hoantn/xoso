-- Drop existing function
DROP FUNCTION IF EXISTS payout_winner_with_detailed_description(uuid, text[], jsonb);

-- Create updated function that shows only player's winning numbers
CREATE OR REPLACE FUNCTION payout_winner_with_detailed_description(
    p_session_id uuid,
    p_winning_numbers text[],
    p_results_data jsonb DEFAULT NULL
)
RETURNS TABLE(
    processed_count integer,
    total_payout numeric,
    winner_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bet_record RECORD;
    win_amount numeric;
    hit_count integer;
    total_hits integer := 0;
    processed_bets integer := 0;
    total_winnings numeric := 0;
    winners integer := 0;
    bet_type_record RECORD;
    player_winning_numbers text[];
    player_hit_counts jsonb := '{}';
    winning_description text;
    bet_type_display text;
BEGIN
    -- Process each bet for this session
    FOR bet_record IN 
        SELECT ub.*, u.balance, u.username
        FROM user_bets ub
        JOIN users u ON ub.user_id = u.id
        WHERE ub.session_id = p_session_id 
        AND ub.status = 'pending'
    LOOP
        processed_bets := processed_bets + 1;
        
        -- Get bet type details
        SELECT * INTO bet_type_record 
        FROM bet_types 
        WHERE id = bet_record.bet_type;
        
        -- Calculate which of the player's numbers actually won
        player_winning_numbers := ARRAY[]::text[];
        player_hit_counts := '{}';
        total_hits := 0;
        
        -- Check each number the player bet on
        FOR i IN 1..array_length(bet_record.numbers, 1) LOOP
            DECLARE
                player_number text := lpad(bet_record.numbers[i]::text, 2, '0');
                number_hits integer := 0;
            BEGIN
                -- Count how many times this player's number appears in winning numbers
                SELECT array_length(
                    array(SELECT unnest(p_winning_numbers) WHERE unnest(p_winning_numbers) = player_number), 
                    1
                ) INTO number_hits;
                
                IF number_hits IS NULL THEN
                    number_hits := 0;
                END IF;
                
                IF number_hits > 0 THEN
                    player_winning_numbers := array_append(player_winning_numbers, player_number);
                    player_hit_counts := jsonb_set(
                        player_hit_counts, 
                        ARRAY[player_number], 
                        to_jsonb(number_hits)
                    );
                    total_hits := total_hits + number_hits;
                END IF;
            END;
        END LOOP;
        
        -- Calculate winnings if player has winning numbers
        IF total_hits > 0 THEN
            IF bet_type_record.calculation_method = 'point' THEN
                -- Point-based calculation (LÔ)
                win_amount := bet_record.points * bet_type_record.multiplier * total_hits * 1000;
            ELSE
                -- Direct money calculation (ĐỀ, XIÊN)
                win_amount := bet_record.amount * bet_type_record.multiplier * total_hits;
            END IF;
            
            winners := winners + 1;
            total_winnings := total_winnings + win_amount;
            
            -- Create winning description with only player's winning numbers
            CASE bet_record.bet_type
                WHEN 'lo_2_so_1p' THEN bet_type_display := 'Lô 2 Số 1 Phút';
                WHEN 'lo_2_so_5p' THEN bet_type_display := 'Lô 2 Số 5 Phút';
                WHEN 'lo_2_so_30p' THEN bet_type_display := 'Lô 2 Số 30 Phút';
                WHEN 'de_dac_biet_1p' THEN bet_type_display := 'Đề Đặc Biệt 1 Phút';
                WHEN 'de_dac_biet_5p' THEN bet_type_display := 'Đề Đặc Biệt 5 Phút';
                WHEN 'de_dac_biet_30p' THEN bet_type_display := 'Đề Đặc Biệt 30 Phút';
                ELSE bet_type_display := bet_record.bet_type;
            END CASE;
            
            -- Build winning numbers string with hit counts
            DECLARE
                winning_numbers_str text := '';
                player_number text;
                hit_count_for_number integer;
            BEGIN
                FOR i IN 1..array_length(player_winning_numbers, 1) LOOP
                    player_number := player_winning_numbers[i];
                    hit_count_for_number := (player_hit_counts->>player_number)::integer;
                    
                    IF i > 1 THEN
                        winning_numbers_str := winning_numbers_str || ', ';
                    END IF;
                    
                    winning_numbers_str := winning_numbers_str || player_number || ' (' || hit_count_for_number || ' lần)';
                END LOOP;
                
                -- Create the winning description
                winning_description := '🏆 Thắng cược ' || bet_type_display || ': Số trúng [' || winning_numbers_str || ']';
                
                IF bet_type_record.calculation_method = 'point' THEN
                    winning_description := winning_description || ' | ' || bet_record.points || ' điểm/số';
                ELSE
                    winning_description := winning_description || ' | ' || bet_record.amount || 'đ/số';
                END IF;
                
                winning_description := winning_description || ' | Tổng ' || total_hits || ' lần trúng';
                winning_description := winning_description || ' | Phiên ' || (SELECT session_number FROM game_sessions WHERE id = p_session_id);
                winning_description := winning_description || ' | Thưởng: ' || win_amount || 'đ';
            END;
            
            -- Update bet status
            UPDATE user_bets 
            SET 
                status = 'won',
                win_amount = win_amount,
                processed_at = NOW()
            WHERE id = bet_record.id;
            
            -- Update user balance
            UPDATE users 
            SET balance = balance + win_amount 
            WHERE id = bet_record.user_id;
            
            -- Create winning transaction
            INSERT INTO transactions (
                user_id,
                type,
                amount,
                balance_before,
                balance_after,
                description,
                enhanced_description,
                game_bet_id,
                created_at
            ) VALUES (
                bet_record.user_id,
                'win',
                win_amount,
                bet_record.balance,
                bet_record.balance + win_amount,
                winning_description,
                winning_description,
                bet_record.id,
                NOW()
            );
            
        ELSE
            -- No winning numbers for this bet
            UPDATE user_bets 
            SET 
                status = 'lost',
                processed_at = NOW()
            WHERE id = bet_record.id;
        END IF;
    END LOOP;
    
    -- Update session status
    UPDATE game_sessions 
    SET 
        status = 'completed',
        winning_numbers = p_winning_numbers,
        results_data = p_results_data
    WHERE id = p_session_id;
    
    RETURN QUERY SELECT processed_bets, total_winnings, winners;
END;
$$;
