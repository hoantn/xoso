-- Drop existing function if it exists
DROP FUNCTION IF EXISTS place_bet_transaction_with_detailed_description(UUID, UUID, TEXT, INTEGER[], INTEGER, NUMERIC, TEXT);

-- Create the corrected function with proper default parameters
CREATE OR REPLACE FUNCTION place_bet_transaction_with_detailed_description(
    p_user_id UUID,
    p_session_id UUID,
    p_bet_type TEXT,
    p_numbers INTEGER[],
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
BEGIN
    -- Get current user balance
    SELECT balance INTO v_current_balance
    FROM users
    WHERE id = p_user_id;
    
    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Check if user has sufficient balance
    IF v_current_balance < p_bet_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_bet_amount;
    
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
        bet_amount,
        status,
        created_at
    ) VALUES (
        v_bet_id,
        p_user_id,
        p_session_id,
        p_bet_type,
        p_numbers,
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
