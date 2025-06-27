/*
  365_update_transactions_type_check.sql
  -------------------------------------
  Thêm giá trị 'game_winnings' vào CHECK-constraint của cột `type`
  trong bảng `transactions`.  Nếu ràng buộc chưa tồn tại, script
  sẽ tự động bỏ qua bước drop.
*/

BEGIN;

-- Xoá ràng buộc cũ (nếu có)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'transactions_type_check'
       AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      DROP CONSTRAINT transactions_type_check;
  END IF;
END$$;

-- Tạo lại ràng buộc với giá trị mới
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (
    type IN (
      'deposit',
      'withdrawal',
      'purchase',
      'refund',
      'game_bet',
      'game_winnings',        -- mới thêm
      'admin_adjustment'
    )
  );

COMMIT;

-- Ghi log
DO $$ BEGIN
  RAISE NOTICE '✅ Constraint transactions_type_check đã được cập-nhật (thêm game_winnings).';
END $$;
