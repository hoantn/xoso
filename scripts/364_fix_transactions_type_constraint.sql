/*
  364_fix_transactions_type_constraint.sql
  ---------------------------------------
  Sửa hàm payout_winner_with_points:
  • dùng cột `type` thay vì `transaction_type`
  • giá trị hợp lệ: 'game_win'
  • Giữ nguyên logic cộng tiền & cập-nhật trạng thái bet
*/

CREATE OR REPLACE FUNCTION public.payout_winner_with_points(
  p_bet_id UUID,
  p_winning_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id           UUID;
  v_current_balance   NUMERIC;
  v_new_balance       NUMERIC;
  v_bet_type          TEXT;
  v_bet_points        INTEGER;
  v_session_number    TEXT;
  v_description       TEXT;
  v_is_point_based    BOOLEAN;
BEGIN
  /* ----------- LẤY THÔNG TIN CƯỢC ----------- */
  SELECT ub.user_id,
         ub.bet_type,
         COALESCE(ub.points, 0),
         gs.session_number
  INTO   v_user_id,
         v_bet_type,
         v_bet_points,
         v_session_number
  FROM   public.user_bets AS ub
  JOIN   public.game_sessions AS gs ON gs.id = ub.session_id
  WHERE  ub.id = p_bet_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Bet not found: %', p_bet_id;
  END IF;

  v_is_point_based := (v_bet_type LIKE '%lo%' AND v_bet_type NOT LIKE '%de%');

  /* ----------- SỐ DƯ HIỆN TẠI ----------- */
  SELECT balance INTO v_current_balance
  FROM   public.users
  WHERE  id = v_user_id;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_user_id;
  END IF;

  v_new_balance := v_current_balance + p_winning_amount;

  /* ----------- MÔ TẢ GIAO DỊCH ----------- */
  IF v_is_point_based THEN
    v_description := format(
      'Thắng Lô %s (%s điểm) – Phiên %s',
      v_bet_type, v_bet_points, v_session_number
    );
  ELSE
    v_description := format(
      'Thắng %s – Phiên %s',
      v_bet_type, v_session_number
    );
  END IF;

  /* ----------- CẬP NHẬT SỐ DƯ + GIAO DỊCH ----------- */
  UPDATE public.users
  SET    balance     = v_new_balance,
         updated_at  = NOW()
  WHERE  id = v_user_id;

  /*  Sử dụng cột `type` – giá trị hợp lệ `game_win`  */
  INSERT INTO public.transactions (
    user_id,
    amount,
    type,
    balance_before,
    balance_after,
    description,
    created_at
  )
  VALUES (
    v_user_id,
    p_winning_amount,
    'game_winnings',       -- *** giá trị hợp lệ (đã thêm vào CHECK) ***
    v_current_balance,
    v_new_balance,
    v_description,
    NOW()
  );

  /* ----------- CẬP NHẬT TRẠNG THÁI BET ----------- */
  UPDATE public.user_bets
  SET    status        = 'won',
         win_amount    = p_winning_amount,
         processed_at  = NOW(),
         updated_at    = NOW()
  WHERE  id = p_bet_id;

  /* ----------- TRẢ KẾT QUẢ ----------- */
  RETURN json_build_object(
    'success',         TRUE,
    'bet_id',          p_bet_id,
    'user_id',         v_user_id,
    'winning_amount',  p_winning_amount,
    'balance_before',  v_current_balance,
    'balance_after',   v_new_balance,
    'bet_type',        v_bet_type,
    'points',          v_bet_points
  );
END;
$$;

-- Phân quyền thực thi
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payout_winner_with_points(UUID, NUMERIC) TO service_role;

-- Ghi log
DO $$
BEGIN
  RAISE NOTICE '✅ Function payout_winner_with_points updated: uses column "type" = ''game_win''';
END $$;
