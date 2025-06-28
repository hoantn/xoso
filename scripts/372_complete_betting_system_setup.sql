-- =====================================================
-- COMPLETE BETTING SYSTEM SETUP
-- Tạo toàn bộ hệ thống đặt cược, quay số, trả thưởng
-- =====================================================

-- Drop all existing functions to start fresh
DROP FUNCTION IF EXISTS place_bet_with_transaction CASCADE;
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description CASCADE;
DROP FUNCTION IF EXISTS payout_winner_with_detailed_description CASCADE;
DROP FUNCTION IF EXISTS payout_winner_with_points CASCADE;
DROP FUNCTION IF EXISTS process_lottery_draw CASCADE;

-- =====================================================
-- 1. PLACE BET FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION place_bet_with_transaction(
    p_user_id UUID,
    p_session_id UUID,
    p_bet_type TEXT,
    p_numbers TEXT[],
    p_points INTEGER DEFAULT NULL,
    p_amount NUMERIC DEFAULT NULL,
    p_potential_win NUMERIC DEFAULT 0,
    p_description TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bet_id UUID;
    v_transaction_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_numbers_int INTEGER[];
    i INTEGER;
    v_final_amount NUMERIC;
BEGIN
    -- Convert TEXT[] to INTEGER[] for storage
    v_numbers_int := ARRAY[]::INTEGER[];
    FOR i IN 1..array_length(p_numbers, 1) LOOP
        v_numbers_int := array_append(v_numbers_int, p_numbers[i]::INTEGER);
    END LOOP;
    
    -- Determine final amount
    v_final_amount := COALESCE(p_amount, 0);
    
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM users
    WHERE id = p_user_id;
    
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', p_user_id;
    END IF;
    
    -- Check if user has sufficient balance
    IF v_current_balance < v_final_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_final_amount, v_current_balance;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - v_final_amount;
    
    -- Generate bet ID
    v_bet_id := gen_random_uuid();
    
    -- Insert bet record
    INSERT INTO user_bets (
        id,
        user_id,
        session_id,
        bet_type,
        numbers,
        points,
        amount,
        potential_win,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_bet_id,
        p_user_id,
        p_session_id,
        p_bet_type,
        v_numbers_int,
        p_points,
        v_final_amount,
        p_potential_win,
        'pending',
        NOW(),
        NOW()
    );
    
    -- Generate transaction ID
    v_transaction_id := gen_random_uuid();
    
    -- Insert transaction record
    INSERT INTO transactions (
        id,
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        description,
        game_bet_id,
        created_at
    ) VALUES (
        v_transaction_id,
        p_user_id,
        'bet',
        -v_final_amount,
        v_current_balance,
        v_new_balance,
        COALESCE(NULLIF(p_description, ''), 'Đặt cược ' || p_bet_type),
        v_bet_id,
        NOW()
    );
    
    -- Update user balance
    UPDATE users
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RAISE NOTICE 'Bet placed successfully: User %, Bet %, Amount %', p_user_id, v_bet_id, v_final_amount;
    
    RETURN v_bet_id;
END;
$$;

-- =====================================================
-- 2. PAYOUT WINNER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION payout_winner(
    p_bet_id UUID,
    p_winning_amount NUMERIC,
    p_detailed_description TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    FROM user_bets ub
    JOIN game_sessions gs ON ub.session_id = gs.id
    WHERE ub.id = p_bet_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Bet not found: %', p_bet_id;
    END IF;

    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM users
    WHERE id = v_user_id;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found: %', v_user_id;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance + p_winning_amount;

    -- Start transaction
    BEGIN
        -- Add winning amount to user balance
        UPDATE users
        SET balance = v_new_balance,
            updated_at = NOW()
        WHERE id = v_user_id;

        -- Update bet status to won
        UPDATE user_bets
        SET status = 'won',
            win_amount = p_winning_amount,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_bet_id;

        -- Record the winning transaction
        INSERT INTO transactions (
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
            COALESCE(NULLIF(p_detailed_description, ''), 'Thắng cược ' || v_bet_type),
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
$$;

-- =====================================================
-- 3. PROCESS LOTTERY DRAW FUNCTION
-- =====================================================
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
BEGIN
    -- Define multipliers for different bet types
    v_multipliers := '{
        "lo_2_so_1p": 99,
        "lo_2_so_5p": 99,
        "lo_2_so_30p": 99,
        "lo_3_so_1p": 900,
        "de_dac_biet_1p": 99,
        "de_dac_biet_5p": 99,
        "de_dac_biet_30p": 99,
        "xien_2_1p": 17,
        "xien_3_1p": 65,
        "xien_4_1p": 200
    }'::JSONB;

    -- Get session details
    SELECT * INTO v_session_record
    FROM game_sessions
    WHERE id = p_session_id;

    IF v_session_record IS NULL THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;

    -- Update session with results
    UPDATE game_sessions
    SET status = 'completed',
        winning_numbers = p_winning_numbers,
        results_data = p_results_data,
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Process all pending bets for this session
    FOR v_bet_record IN 
        SELECT * FROM user_bets 
        WHERE session_id = p_session_id AND status = 'pending'
    LOOP
        v_total_processed := v_total_processed + 1;
        v_win_amount := 0;
        v_hit_count := 0;

        -- Convert INTEGER[] to TEXT[] for comparison
        v_bet_numbers_str := ARRAY[]::TEXT[];
        FOR i IN 1..array_length(v_bet_record.numbers, 1) LOOP
            v_bet_numbers_str := array_append(v_bet_numbers_str, v_bet_record.numbers[i]::TEXT);
        END LOOP;

        -- Calculate wins based on bet type
        IF v_bet_record.bet_type LIKE '%lo%' THEN
            -- Lô betting: count occurrences of each number
            FOREACH v_number IN ARRAY v_bet_numbers_str LOOP
                v_hit_count := v_hit_count + (
                    SELECT COUNT(*) 
                    FROM unnest(p_winning_numbers) AS winning_num 
                    WHERE winning_num = v_number
                );
            END LOOP;

            IF v_hit_count > 0 THEN
                v_multiplier := (v_multipliers->>v_bet_record.bet_type)::NUMERIC;
                IF v_bet_record.points > 0 THEN
                    -- Point-based: points × multiplier × hit_count × 1000
                    v_win_amount := v_bet_record.points * v_multiplier * v_hit_count * 1000;
                ELSE
                    -- Money-based: amount × multiplier × hit_count
                    v_win_amount := v_bet_record.amount * v_multiplier * v_hit_count;
                END IF;
            END IF;

        ELSIF v_bet_record.bet_type LIKE '%de%' THEN
            -- Đề betting: exact match with special prize last 2 digits
            IF array_length(p_winning_numbers, 1) > 0 THEN
                v_number := p_winning_numbers[1]; -- First number is special prize
                IF v_number = ANY(v_bet_numbers_str) THEN
                    v_hit_count := 1;
                    v_multiplier := (v_multipliers->>v_bet_record.bet_type)::NUMERIC;
                    v_win_amount := v_bet_record.amount * v_multiplier;
                END IF;
            END IF;

        ELSIF v_bet_record.bet_type LIKE '%xien%' THEN
            -- Xiên betting: all numbers must be present
            v_win_count := 0;
            FOREACH v_number IN ARRAY v_bet_numbers_str LOOP
                IF v_number = ANY(p_winning_numbers) THEN
                    v_win_count := v_win_count + 1;
                END IF;
            END LOOP;

            IF v_win_count = array_length(v_bet_numbers_str, 1) THEN
                v_hit_count := 1;
                v_multiplier := (v_multipliers->>v_bet_record.bet_type)::NUMERIC;
                v_win_amount := v_bet_record.amount * v_multiplier;
            END IF;
        END IF;

        -- Process the bet result
        IF v_win_amount > 0 THEN
            -- Create detailed winning description
            v_detailed_description := format(
                '🏆 Thắng cược %s: Số trúng [%s] | %s | Tổng %s lần trúng | Phiên %s | Thưởng: %sđ',
                v_bet_record.bet_type,
                array_to_string(v_bet_numbers_str, ', '),
                CASE 
                    WHEN v_bet_record.points > 0 THEN v_bet_record.points || ' điểm/số'
                    ELSE (v_bet_record.amount / array_length(v_bet_numbers_str, 1))::TEXT || 'đ/số'
                END,
                v_hit_count,
                v_session_record.session_number,
                v_win_amount::TEXT
            );

            -- Pay the winner
            PERFORM payout_winner(v_bet_record.id, v_win_amount, v_detailed_description);
            
            v_total_winners := v_total_winners + 1;
            v_total_payout := v_total_payout + v_win_amount;
        ELSE
            -- Mark as lost
            UPDATE user_bets
            SET status = 'lost',
                win_amount = 0,
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_bet_record.id;
        END IF;
    END LOOP;

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

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION place_bet_with_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION place_bet_with_transaction TO service_role;

GRANT EXECUTE ON FUNCTION payout_winner TO authenticated;
GRANT EXECUTE ON FUNCTION payout_winner TO service_role;

GRANT EXECUTE ON FUNCTION process_lottery_draw TO authenticated;
GRANT EXECUTE ON FUNCTION process_lottery_draw TO service_role;

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_bets_session_status ON user_bets(session_id, status);
CREATE INDEX IF NOT EXISTS idx_user_bets_user_created ON user_bets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_game_bet ON transactions(game_bet_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status, end_time);

-- =====================================================
-- 6. VERIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== BETTING SYSTEM SETUP COMPLETE ===';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - place_bet_with_transaction: Đặt cược với transaction';
    RAISE NOTICE '  - payout_winner: Trả thưởng cho người thắng';
    RAISE NOTICE '  - process_lottery_draw: Xử lý quay số và trả thưởng';
    RAISE NOTICE 'Cost per point: 29,000 VND';
    RAISE NOTICE 'Multipliers configured for all bet types';
    RAISE NOTICE 'Indexes created for performance';
    RAISE NOTICE '=====================================';
END $$;
