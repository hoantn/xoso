-- Fix all remaining functions that still use user_profiles

-- 1. Fix get_user_role function
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text AS $$
DECLARE
    user_role_result text;
BEGIN
    SELECT role INTO user_role_result
    FROM users  -- Changed from user_profiles to users
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 'user'; -- Default role if user not found
    END IF;
    
    RETURN user_role_result;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix place_bet function
DROP FUNCTION IF EXISTS place_bet(uuid, uuid, text, text[], numeric) CASCADE;
CREATE OR REPLACE FUNCTION place_bet(
    p_user_id uuid,
    p_session_id uuid,
    p_bet_type text,
    p_numbers text[],
    p_amount numeric
) RETURNS json AS $$
DECLARE
    v_user_balance numeric;
    v_session_status text;
    v_bet_id uuid;
    v_new_balance numeric;
BEGIN
    -- Check if session exists and is open
    SELECT status INTO v_session_status
    FROM game_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;
    
    IF v_session_status != 'open' THEN
        RAISE EXCEPTION 'Game session is not open for betting';
    END IF;
    
    -- Get user balance from users table
    SELECT balance INTO v_user_balance
    FROM users  -- Changed from user_profiles to users
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;
    
    -- Check sufficient balance
    IF v_user_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_user_balance - p_amount;
    
    -- Create bet record
    INSERT INTO game_bets (
        user_id, session_id, bet_type, numbers, amount, status, created_at
    ) VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers, p_amount, 'pending', NOW()
    ) RETURNING id INTO v_bet_id;
    
    -- Update user balance in users table
    UPDATE users  -- Changed from user_profiles to users
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'bet_id', v_bet_id,
        'new_balance', v_new_balance
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix place_bet_transaction function
DROP FUNCTION IF EXISTS place_bet_transaction(uuid, uuid, text, text[], numeric, numeric, numeric) CASCADE;
CREATE OR REPLACE FUNCTION place_bet_transaction(
    p_user_id uuid,
    p_session_id uuid,
    p_bet_type text,
    p_numbers text[],
    p_amount numeric,
    p_potential_win numeric,
    p_total_cost numeric
) RETURNS json AS $$
DECLARE
    v_user_balance numeric;
    v_session_status text;
    v_bet_id uuid;
    v_transaction_id uuid;
    v_new_balance numeric;
BEGIN
    -- Check if session exists and is open
    SELECT status INTO v_session_status
    FROM game_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;
    
    IF v_session_status != 'open' THEN
        RAISE EXCEPTION 'Game session is not open for betting';
    END IF;
    
    -- Get user balance from users table
    SELECT balance INTO v_user_balance
    FROM users  -- Changed from user_profiles to users
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;
    
    -- Check sufficient balance
    IF v_user_balance < p_total_cost THEN
        RAISE EXCEPTION 'Insufficient balance. Required: % VND', p_total_cost;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_user_balance - p_total_cost;
    
    -- Create bet record
    INSERT INTO game_bets (
        user_id, session_id, bet_type, numbers, amount, potential_win, status, created_at
    ) VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers, p_total_cost, p_potential_win, 'pending', NOW()
    ) RETURNING id INTO v_bet_id;
    
    -- Update user balance in users table
    UPDATE users  -- Changed from user_profiles to users
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id, type, amount, balance_before, balance_after, 
        description, status, reference_id, created_at
    ) VALUES (
        p_user_id, 'game_bet', -p_total_cost, v_user_balance, v_new_balance,
        'Đặt cược ' || p_bet_type || ' - Phiên ' || p_session_id,
        'completed', v_bet_id, NOW()
    ) RETURNING id INTO v_transaction_id;
    
    RETURN json_build_object(
        'success', true,
        'bet_id', v_bet_id,
        'transaction_id', v_transaction_id,
        'new_balance', v_new_balance,
        'message', 'Bet placed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. Fix process_bet_results function
DROP FUNCTION IF EXISTS process_bet_results(uuid) CASCADE;
CREATE OR REPLACE FUNCTION process_bet_results(p_session_id uuid)
RETURNS json AS $$
DECLARE
    v_session_record RECORD;
    v_bet_record RECORD;
    v_winning_numbers text[];
    v_is_winner boolean;
    v_payout_amount numeric;
    v_user_balance numeric;
    v_new_balance numeric;
    v_total_bets integer := 0;
    v_total_winners integer := 0;
    v_total_payout numeric := 0;
BEGIN
    -- Get session details
    SELECT * INTO v_session_record
    FROM game_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    IF v_session_record.status != 'completed' THEN
        RAISE EXCEPTION 'Session is not completed yet';
    END IF;
    
    -- Parse winning numbers
    v_winning_numbers := string_to_array(v_session_record.winning_numbers, ',');
    
    -- Process each bet for this session
    FOR v_bet_record IN 
        SELECT * FROM game_bets 
        WHERE session_id = p_session_id AND status = 'pending'
    LOOP
        v_total_bets := v_total_bets + 1;
        v_is_winner := false;
        v_payout_amount := 0;
        
        -- Check if bet is a winner based on bet type
        CASE v_bet_record.bet_type
            WHEN 'lo_2_so_nhanh', 'lo_3_so_nhanh', 'de_dac_biet_nhanh', 'nhat_to_nhanh' THEN
                -- Check if all bet numbers are in winning numbers
                IF v_bet_record.numbers <@ v_winning_numbers THEN
                    v_is_winner := true;
                    v_payout_amount := v_bet_record.potential_win;
                END IF;
            ELSE
                -- Default logic for other bet types
                IF v_bet_record.numbers <@ v_winning_numbers THEN
                    v_is_winner := true;
                    v_payout_amount := v_bet_record.potential_win;
                END IF;
        END CASE;
        
        -- Update bet status
        IF v_is_winner THEN
            UPDATE game_bets 
            SET status = 'won', payout_amount = v_payout_amount, updated_at = NOW()
            WHERE id = v_bet_record.id;
            
            v_total_winners := v_total_winners + 1;
            v_total_payout := v_total_payout + v_payout_amount;
            
            -- Update user balance in users table
            SELECT balance INTO v_user_balance
            FROM users  -- Changed from user_profiles to users
            WHERE id = v_bet_record.user_id;
            
            v_new_balance := v_user_balance + v_payout_amount;
            
            UPDATE users  -- Changed from user_profiles to users
            SET balance = v_new_balance, updated_at = NOW()
            WHERE id = v_bet_record.user_id;
            
            -- Create transaction record for winnings
            INSERT INTO transactions (
                user_id, type, amount, balance_before, balance_after,
                description, status, reference_id, created_at
            ) VALUES (
                v_bet_record.user_id, 'game_win', v_payout_amount, v_user_balance, v_new_balance,
                'Thắng cược ' || v_bet_record.bet_type || ' - Phiên ' || p_session_id,
                'completed', v_bet_record.id, NOW()
            );
        ELSE
            UPDATE game_bets 
            SET status = 'lost', updated_at = NOW()
            WHERE id = v_bet_record.id;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'session_id', p_session_id,
        'total_bets', v_total_bets,
        'total_winners', v_total_winners,
        'total_payout', v_total_payout,
        'message', 'Bet results processed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Processing bet results failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 5. Fix process_lottery_bet functions
DROP FUNCTION IF EXISTS process_lottery_bet(uuid, text, text[], numeric, numeric) CASCADE;
CREATE OR REPLACE FUNCTION process_lottery_bet(
    p_user_id uuid,
    p_session_id uuid,
    p_bet_type text,
    p_numbers text[],
    p_amount numeric
) RETURNS json AS $$
DECLARE
    v_user_balance numeric;
    v_bet_id uuid;
    v_new_balance numeric;
BEGIN
    -- Get user balance from users table
    SELECT balance INTO v_user_balance
    FROM users  -- Changed from user_profiles to users
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;
    
    -- Check sufficient balance
    IF v_user_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_user_balance - p_amount;
    
    -- Create bet record
    INSERT INTO game_bets (
        user_id, session_id, bet_type, numbers, amount, status, created_at
    ) VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers, p_amount, 'pending', NOW()
    ) RETURNING id INTO v_bet_id;
    
    -- Update user balance in users table
    UPDATE users  -- Changed from user_profiles to users
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'bet_id', v_bet_id,
        'new_balance', v_new_balance
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Processing lottery bet failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Final verification
SELECT routine_name, 
       CASE 
           WHEN routine_definition ILIKE '%user_profiles%' THEN 'ERROR: Still uses user_profiles'
           WHEN routine_definition ILIKE '%users%' THEN 'OK: Uses users table'
           ELSE 'No user table reference'
       END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_role', 'place_bet', 'place_bet_transaction', 'process_bet_results', 'process_lottery_bet')
ORDER BY routine_name;

-- Test the functions
SELECT 'Testing get_user_role:' as test, get_user_role('2a7a0c39-328d-43e2-ac21-8d4c37557a96'::uuid) as result;
