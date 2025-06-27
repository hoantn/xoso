-- Kiểm tra constraint hiện tại của bảng transactions
DO $$
DECLARE
    constraint_def text;
BEGIN
    -- Lấy định nghĩa constraint hiện tại
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint 
    WHERE conname = 'transactions_type_check' 
    AND conrelid = 'public.transactions'::regclass;
    
    IF constraint_def IS NOT NULL THEN
        RAISE NOTICE 'Current constraint: %', constraint_def;
    ELSE
        RAISE NOTICE 'No transactions_type_check constraint found';
    END IF;
    
    -- Kiểm tra các giá trị type hiện có trong bảng
    RAISE NOTICE 'Existing transaction types in database:';
    FOR constraint_def IN 
        SELECT DISTINCT type FROM public.transactions ORDER BY type
    LOOP
        RAISE NOTICE '  - %', constraint_def;
    END LOOP;
END $$;

-- Sửa lại hàm payout_winner_with_points để sử dụng đúng type
CREATE OR REPLACE FUNCTION public.payout_winner_with_points(
  p_bet_id uuid,
  p_session_id uuid,
  p_winning_numbers text[],
  p_game_mode text,
  p_bet_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bet record;
  v_user_balance numeric;
  v_win_amount numeric := 0;
  v_multiplier numeric := 0;
  v_hits integer := 0;
  v_transaction_id uuid;
  v_new_balance numeric;
BEGIN
  -- Lấy thông tin bet
  SELECT ub.*, u.balance as user_balance
  INTO v_bet
  FROM public.user_bets ub
  JOIN public.users u ON ub.user_id = u.id
  WHERE ub.id = p_bet_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bet not found'
    );
  END IF;

  -- Xác định multiplier dựa trên bet_type
  CASE 
    WHEN p_bet_type LIKE '%lo_2_so%' THEN v_multiplier := 99;
    WHEN p_bet_type LIKE '%lo_3_so%' THEN v_multiplier := 900;
    WHEN p_bet_type LIKE '%de_dac_biet%' THEN v_multiplier := 99;
    WHEN p_bet_type LIKE '%xien_2%' THEN v_multiplier := 17;
    WHEN p_bet_type LIKE '%xien_3%' THEN v_multiplier := 65;
    WHEN p_bet_type LIKE '%xien_4%' THEN v_multiplier := 200;
    WHEN p_bet_type LIKE '%nhat_to%' THEN v_multiplier := 9;
    WHEN p_bet_type LIKE '%de_dau_duoi%' THEN v_multiplier := 9;
    ELSE v_multiplier := 0;
  END CASE;

  IF v_multiplier = 0 THEN
    -- Mark as lost
    UPDATE public.user_bets 
    SET status = 'lost', processed_at = NOW()
    WHERE id = p_bet_id;
    
    RETURN json_build_object(
      'success', true,
      'winnings', 0,
      'status', 'lost'
    );
  END IF;

  -- Tính toán số lần trúng
  IF p_bet_type LIKE '%lo%' THEN
    -- Lô: đếm số lần xuất hiện của mỗi số
    FOR i IN 1..array_length(v_bet.numbers, 1) LOOP
      SELECT COUNT(*) INTO v_hits 
      FROM unnest(p_winning_numbers) AS wn 
      WHERE wn = v_bet.numbers[i];
      
      IF v_bet.points > 0 THEN
        -- Point-based: points × multiplier × hits × 1000
        v_win_amount := v_win_amount + (v_bet.points * v_multiplier * v_hits * 1000);
      ELSE
        -- Money-based: amount × multiplier × hits
        v_win_amount := v_win_amount + (v_bet.amount * v_multiplier * v_hits);
      END IF;
    END LOOP;
  ELSIF p_bet_type LIKE '%xien%' THEN
    -- Xiên: tất cả số phải trúng
    SELECT COUNT(DISTINCT num) INTO v_hits
    FROM unnest(v_bet.numbers) AS num
    WHERE num = ANY(p_winning_numbers);
    
    IF v_hits = array_length(v_bet.numbers, 1) THEN
      v_win_amount := v_bet.amount * v_multiplier;
    END IF;
  ELSE
    -- Đề và các loại khác
    FOR i IN 1..array_length(v_bet.numbers, 1) LOOP
      IF v_bet.numbers[i] = ANY(p_winning_numbers) THEN
        v_hits := v_hits + 1;
      END IF;
    END LOOP;
    v_win_amount := v_bet.amount * v_multiplier * v_hits;
  END IF;

  IF v_win_amount > 0 THEN
    -- Cập nhật balance user
    v_new_balance := v_bet.user_balance + v_win_amount;
    
    UPDATE public.users 
    SET balance = v_new_balance
    WHERE id = v_bet.user_id;

    -- Tạo transaction với type đúng (sử dụng 'bet_won' thay vì 'game_winnings')
    v_transaction_id := gen_random_uuid();
    INSERT INTO public.transactions (
      id, user_id, amount, type, balance_before, balance_after,
      description, created_at
    ) VALUES (
      v_transaction_id,
      v_bet.user_id,
      v_win_amount,
      'bet_won', -- Sử dụng type đã có trong hệ thống
      v_bet.user_balance,
      v_new_balance,
      format('Thắng cược phiên %s', p_session_id),
      NOW()
    );

    -- Cập nhật bet status
    UPDATE public.user_bets 
    SET 
      status = 'won',
      win_amount = v_win_amount,
      winnings_transaction_id = v_transaction_id,
      processed_at = NOW()
    WHERE id = p_bet_id;

    RETURN json_build_object(
      'success', true,
      'winnings', v_win_amount,
      'status', 'won'
    );
  ELSE
    -- Mark as lost
    UPDATE public.user_bets 
    SET status = 'lost', processed_at = NOW()
    WHERE id = p_bet_id;
    
    RETURN json_build_object(
      'success', true,
      'winnings', 0,
      'status', 'lost'
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Payout failed for bet %: %', p_bet_id, SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(uuid, uuid, text[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(uuid, uuid, text[], text, text) TO service_role;

-- Thông báo hoàn thành
DO $$
BEGIN
    RAISE NOTICE 'Fixed payout function to use existing transaction type: bet_won';
END $$;
