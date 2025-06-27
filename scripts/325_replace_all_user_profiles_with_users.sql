-- Replace ALL references from user_profiles to users table

-- 1. First, let's check what functions are using user_profiles
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition ILIKE '%user_profiles%';

-- 2. Drop and recreate get_user_role function to use users table
DROP FUNCTION IF EXISTS get_user_role(uuid);

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

-- 3. Fix place_bet_transaction function to use users table
DROP FUNCTION IF EXISTS place_bet_transaction(uuid, uuid, text, text[], numeric, numeric, numeric);

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
    FROM users
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
    UPDATE users
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

-- 4. Fix any other functions that might reference user_profiles
-- Update process_bet_results if it exists
DROP FUNCTION IF EXISTS process_bet_results(uuid, text[]);

CREATE OR REPLACE FUNCTION process_bet_results(
    p_session_id uuid,
    p_winning_numbers text[]
) RETURNS json AS $$
DECLARE
    v_bet_record RECORD;
    v_user_balance numeric;
    v_new_balance numeric;
    v_processed_count integer := 0;
    v_winners_count integer := 0;
BEGIN
    -- Process all pending bets for this session
    FOR v_bet_record IN 
        SELECT * FROM game_bets 
        WHERE session_id = p_session_id AND status = 'pending'
    LOOP
        -- Check if bet won
        IF v_bet_record.numbers && p_winning_numbers THEN
            -- Winner - update bet status and user balance
            UPDATE game_bets 
            SET status = 'won', win_amount = v_bet_record.potential_win, updated_at = NOW()
            WHERE id = v_bet_record.id;
            
            -- Get current user balance from users table
            SELECT balance INTO v_user_balance
            FROM users
            WHERE id = v_bet_record.user_id;
            
            -- Calculate new balance
            v_new_balance := v_user_balance + v_bet_record.potential_win;
            
            -- Update user balance in users table
            UPDATE users
            SET balance = v_new_balance, updated_at = NOW()
            WHERE id = v_bet_record.user_id;
            
            -- Create win transaction
            INSERT INTO transactions (
                user_id, type, amount, balance_before, balance_after,
                description, status, reference_id, created_at
            ) VALUES (
                v_bet_record.user_id, 'game_win', v_bet_record.potential_win,
                v_user_balance, v_new_balance,
                'Thắng cược ' || v_bet_record.bet_type || ' - Phiên ' || p_session_id,
                'completed', v_bet_record.id, NOW()
            );
            
            v_winners_count := v_winners_count + 1;
        ELSE
            -- Loser - just update bet status
            UPDATE game_bets 
            SET status = 'lost', win_amount = 0, updated_at = NOW()
            WHERE id = v_bet_record.id;
        END IF;
        
        v_processed_count := v_processed_count + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'processed_bets', v_processed_count,
        'winners', v_winners_count,
        'message', 'Bet results processed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Processing bet results failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 5. Verify all functions now use users table
SELECT routine_name, 
       CASE 
           WHEN routine_definition ILIKE '%user_profiles%' THEN 'ERROR: Still uses user_profiles'
           WHEN routine_definition ILIKE '%users%' THEN 'OK: Uses users table'
           ELSE 'No user table reference'
       END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_definition ILIKE '%user_profiles%' OR routine_definition ILIKE '%users%')
ORDER BY routine_name;

-- 6. Check if user_profiles table exists and can be dropped
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as user_profiles_exists;

-- 7. Show users table structure to confirm it has all needed columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;
