/* ------------------------------------------------------------------
   Fix: use existing transaction type 'bet' thay vì 'game_bet'
   ------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION place_bet_transaction(
    p_user_id         uuid,
    p_session_id      uuid,
    p_bet_type        text,
    p_numbers         text[],
    p_amount          numeric,
    p_potential_win   numeric,
    p_total_cost      numeric
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_balance    numeric;
    v_session_status  text;
    v_bet_id          uuid;
    v_transaction_id  uuid;
    v_new_balance     numeric;
BEGIN
    /* 1. Kiểm tra phiên */
    SELECT status INTO v_session_status
    FROM game_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;

    IF v_session_status <> 'open' THEN
        RAISE EXCEPTION 'Game session is not open for betting';
    END IF;

    /* 2. Lấy số dư */
    SELECT balance INTO v_user_balance
    FROM users
    WHERE id = p_user_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;

    IF v_user_balance < p_total_cost THEN
        RAISE EXCEPTION 'Insufficient balance. Required: % VND', p_total_cost;
    END IF;

    /* 3. Trừ tiền và tạo cược */
    v_new_balance := v_user_balance - p_total_cost;

    INSERT INTO user_bets (
        user_id, session_id, bet_type, numbers, amount,
        potential_win, status, created_at, updated_at
    )
    VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers,
        p_total_cost, p_potential_win, 'pending', NOW(), NOW()
    )
    RETURNING id INTO v_bet_id;

    UPDATE users
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;

    /* 4. Ghi giao dịch — ĐỔI type -> 'bet'  */
    INSERT INTO transactions (
        user_id, type, amount, balance_before, balance_after,
        description, status, reference_id, created_at
    )
    VALUES (
        p_user_id, 'bet', -p_total_cost,              -- <- fix ở đây
        v_user_balance, v_new_balance,
        'Đặt cược '||p_bet_type||' - Phiên '||p_session_id,
        'completed', v_bet_id, NOW()
    )
    RETURNING id INTO v_transaction_id;

    /* 5. Trả kết quả */
    RETURN json_build_object(
        'success',        true,
        'bet_id',         v_bet_id,
        'transaction_id', v_transaction_id,
        'new_balance',    v_new_balance,
        'message',        'Bet placed successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$;

/* Xác nhận */
SELECT 'place_bet_transaction updated - type set to ''bet''' AS status;
