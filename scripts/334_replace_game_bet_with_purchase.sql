-- Update function: transactions.type = 'purchase' (hợp lệ với CHECK)
CREATE OR REPLACE FUNCTION public.place_bet_transaction(
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
    v_before   numeric;
    v_after    numeric;
    v_bet_id   uuid;
    v_txn_id   uuid;
    v_status   text;
BEGIN
    /* 1 — Xác minh phiên */
    SELECT status
      INTO v_status
      FROM game_sessions
     WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Game session not found';
    END IF;

    IF v_status <> 'open' THEN
        RAISE EXCEPTION 'Game session is not open for betting';
    END IF;

    /* 2 — Lấy & kiểm tra số dư */
    SELECT balance
      INTO v_before
      FROM users
     WHERE id = p_user_id
       AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or inactive';
    END IF;

    IF v_before < p_total_cost THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    v_after := v_before - p_total_cost;

    /* 3 — Tạo bản ghi cược */
    INSERT INTO user_bets (
        user_id, session_id, bet_type, numbers,
        amount, potential_win, status,
        created_at, updated_at
    ) VALUES (
        p_user_id, p_session_id, p_bet_type, p_numbers,
        p_total_cost, p_potential_win, 'pending',
        NOW(), NOW()
    ) RETURNING id INTO v_bet_id;

    /* 4 — Cập nhật số dư */
    UPDATE users
       SET balance    = v_after,
           updated_at = NOW()
     WHERE id = p_user_id;

    /* 5 — Ghi giao dịch  ➜  type = 'purchase' (đã hợp lệ) */
    INSERT INTO transactions (
        user_id, type, amount,
        balance_before, balance_after,
        description, status, reference_id, created_at
    ) VALUES (
        p_user_id, 'purchase', -p_total_cost,
        v_before,  v_after,
        'Bet ' || p_bet_type || ' – Session ' || p_session_id,
        'completed', v_bet_id, NOW()
    ) RETURNING id INTO v_txn_id;

    RETURN json_build_object(
        'success', true,
        'bet_id',  v_bet_id,
        'txn_id',  v_txn_id,
        'balance', v_after,
        'message', 'Bet placed successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$;

-- confirm
SELECT '✅ Updated place_bet_transaction: transactions.type = ''purchase''' AS info;
