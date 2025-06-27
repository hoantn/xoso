-- Force replace all user_profiles references with CASCADE

-- 1. First check what depends on get_user_role
SELECT DISTINCT dependent_ns.nspname as dependent_schema,
       dependent_view.relname as dependent_table,
       source_ns.nspname as source_schema,
       source_table.relname as source_table
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
JOIN pg_namespace source_ns ON source_ns.oid = source_table.relnamespace
WHERE source_table.relname = 'get_user_role';

-- 2. Drop function with CASCADE to remove all dependencies
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;

-- 3. Recreate get_user_role function using users table
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

-- 4. Drop and recreate place_bet_transaction with CASCADE
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
    
    -- Get user balance from users table (NOT user_profiles)
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
    
    -- Update user balance in users table (NOT user_profiles)
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

-- 5. Check and fix any other functions that reference user_profiles
DO $$
DECLARE
    func_record RECORD;
    new_definition text;
BEGIN
    -- Get all functions that reference user_profiles
    FOR func_record IN 
        SELECT routine_name, routine_definition
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_definition ILIKE '%user_profiles%'
    LOOP
        RAISE NOTICE 'Found function % that references user_profiles', func_record.routine_name;
        
        -- Replace user_profiles with users in the function definition
        new_definition := REPLACE(func_record.routine_definition, 'user_profiles', 'users');
        
        -- Try to execute the new definition
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_name || ' CASCADE';
            EXECUTE new_definition;
            RAISE NOTICE 'Successfully updated function %', func_record.routine_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to update function %: %', func_record.routine_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 6. Final verification - check all functions
SELECT routine_name, 
       CASE 
           WHEN routine_definition ILIKE '%user_profiles%' THEN 'ERROR: Still uses user_profiles'
           WHEN routine_definition ILIKE '%users%' THEN 'OK: Uses users table'
           ELSE 'No user table reference'
       END as status,
       LENGTH(routine_definition) as def_length
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_definition ILIKE '%user_profiles%' OR routine_definition ILIKE '%users%')
ORDER BY routine_name;

-- 7. Test the fixed function
SELECT get_user_role('2a7a0c39-328d-43e2-ac21-8d4c37557a96'::uuid) as test_user_role;
