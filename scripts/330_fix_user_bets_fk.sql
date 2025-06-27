-- 1️⃣  Xoá FK cũ (nếu còn)
ALTER TABLE public.user_bets
  DROP CONSTRAINT IF EXISTS user_bets_user_id_fkey;

-- 2️⃣  Thêm FK mới trỏ về public.users(id)
ALTER TABLE public.user_bets
  ADD CONSTRAINT user_bets_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;
