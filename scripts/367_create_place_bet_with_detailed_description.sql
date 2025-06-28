CREATE OR REPLACE FUNCTION place_bet_with_detailed_description(
    p_account_id INTEGER,
    p_bet_type TEXT,
    p_numbers INTEGER[],
    p_points INTEGER DEFAULT NULL,
    p_bet_amount NUMERIC DEFAULT NULL,
    p_is_point_based BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    v_session_number INTEGER;
    v_total_cost NUMERIC;
    v_description TEXT;
BEGIN
    -- Get the current session number
    SELECT session_number INTO v_session_number FROM current_session;

    -- Calculate costs based on bet type
    IF v_is_point_based THEN
        -- Point-based betting (Lô): cost = points × 29,000 VND per point × number of numbers
        v_total_cost := p_points * 29000 * array_length(p_numbers, 1);
        v_description := format('Cược %s: %s điểm/số (%s số) - Phiên %s - Chi phí: %s VND', 
            p_bet_type, p_points, array_length(p_numbers, 1), v_session_number, v_total_cost);
    ELSE
        -- Money-based betting (Đề/Xiên): cost = bet amount
        v_total_cost := p_bet_amount;
        v_description := format('Cược %s: %s VND (%s số) - Phiên %s', 
            p_bet_type, p_bet_amount, array_length(p_numbers, 1), v_session_number);
    END IF;

    -- Insert the bet into the bets table
    INSERT INTO bets (account_id, session_number, bet_type, numbers, points, bet_amount, cost, description)
    VALUES (p_account_id, v_session_number, p_bet_type, p_numbers, p_points, p_bet_amount, v_total_cost, v_description);

END;
$$ LANGUAGE plpgsql;
