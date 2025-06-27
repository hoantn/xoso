-- Fix get_user_role function to use users table instead of user_profiles
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

-- Check and fix any other functions that might reference user_profiles
-- Let's also make sure place_bet function is using correct table references

DROP FUNCTION IF EXISTS place_bet(uuid, uuid, text, text[], numeric);

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
    
    -- Get user balance from users table (not user_profiles)
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
    
    -- Create bet record
    INSERT INTO game_bets (
        user_id, session_id, bet_type, numbers, amount, status
    ) VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers, p_amount, 'pending'
    ) RETURNING id INTO v_bet_id;
    
    -- Update user balance in users table
    UPDATE users  -- Changed from user_profiles to users
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN json_build_object(
        'success', true,
        'bet_id', v_bet_id,
        'message', 'Bet placed successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Bet placement failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Verify all functions are now using correct table references
SELECT routine_name, 
       CASE 
           WHEN routine_definition ILIKE '%user_profiles%' THEN 'STILL HAS user_profiles'
           WHEN routine_definition ILIKE '%users%' THEN 'Uses users table'
           ELSE 'No user table reference'
       END as table_usage
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_role', 'place_bet', 'place_bet_transaction', 'process_bet_results', 'process_lottery_bet');
