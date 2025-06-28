-- Drop all versions of the place_bet_transaction_with_detailed_description function
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description(UUID, UUID, TEXT, INTEGER[], INTEGER, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description(UUID, UUID, TEXT, TEXT[], INTEGER, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description(UUID, UUID, TEXT, INTEGER[], INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description(UUID, UUID, TEXT, TEXT[], INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description(UUID, UUID, TEXT, INTEGER[], INTEGER);
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description(UUID, UUID, TEXT, TEXT[], INTEGER);

-- Also drop any other variations that might exist
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description CASCADE;

-- Create the correct function using "amount" column instead of "bet_amount"
CREATE OR REPLACE FUNCTION place_bet_transaction_with_detailed_description(
    p_user_id UUID,
    p_session_id UUID,
    p_bet_type TEXT,
    p_numbers TEXT[], -- Changed to TEXT[] to match the API call
    p_points INTEGER DEFAULT NULL,
    p_bet_amount NUMERIC DEFAULT NULL,
    p_detailed_description TEXT DEFAULT ''
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
BEGIN
    -- Convert TEXT[] to INTEGER[] for storage
    v_numbers_int := ARRAY[]::INTEGER[];
    FOR i IN 1..array_length(p_numbers, 1) LOOP
        v_numbers_int := array_append(v_numbers_int, p_numbers[i]::INTEGER);
    END LOOP;
    
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM users
    WHERE id = p_user_id;
    
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check if user has sufficient balance
    IF v_current_balance < p_bet_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', p_bet_amount, v_current_balance;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_bet_amount;
    
    -- Generate bet ID
    v_bet_id := gen_random_uuid();
    
    -- Insert bet record using "amount" column instead of "bet_amount"
    INSERT INTO user_bets (
        id,
        user_id,
        session_id,
        bet_type,
        numbers,
        points,
        amount,  -- Changed from bet_amount to amount
        status,
        created_at
    ) VALUES (
        v_bet_id,
        p_user_id,
        p_session_id,
        p_bet_type,
        v_numbers_int,
        p_points,
        p_bet_amount,
        'pending',
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
        status,
        game_bet_id,
        created_at
    ) VALUES (
        v_transaction_id,
        p_user_id,
        'bet',
        -p_bet_amount,
        v_current_balance,
        v_new_balance,
        COALESCE(p_detailed_description, 'Đặt cược ' || p_bet_type),
        'completed',
        v_bet_id,
        NOW()
    );
    
    -- Update user balance
    UPDATE users
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN v_bet_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION place_bet_transaction_with_detailed_description TO authenticated;
