-- Check if place_bet_transaction function exists and view its definition
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'place_bet_transaction';

-- Drop and recreate the place_bet_transaction function with correct table reference
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
    v_new_balance numeric;
    v_bet_id uuid;
    v_transaction_id uuid;
BEGIN
    -- Get current user balance from users table (not user_profiles)
    SELECT balance INTO v_user_balance
    FROM users
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;
    
    -- Check sufficient balance
    IF v_user_balance < p_total_cost THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Required: %', v_user_balance, p_total_cost;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_user_balance - p_total_cost;
    
    -- Update user balance in users table
    UPDATE users 
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Create game bet record
    INSERT INTO game_bets (
        user_id, session_id, bet_type, numbers, amount, potential_win, status
    ) VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers, p_total_cost, p_potential_win, 'pending'
    ) RETURNING id INTO v_bet_id;
    
    -- Create transaction record
    INSERT INTO transactions (
        user_id, type, amount, balance_before, balance_after, 
        description, status, reference_id
    ) VALUES (
        p_user_id, 'game_bet', -p_total_cost, v_user_balance, v_new_balance,
        'Đặt cược ' || p_bet_type || ' - Phiên ' || p_session_id::text,
        'completed', v_bet_id::text
    ) RETURNING id INTO v_transaction_id;
    
    -- Return result
    RETURN json_build_object(
        'success', true,
        'bet_id', v_bet_id,
        'transaction_id', v_transaction_id,
        'old_balance', v_user_balance,
        'new_balance', v_new_balance,
        'amount_deducted', p_total_cost
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Check if there are any other functions referencing user_profiles
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition ILIKE '%user_profiles%';
