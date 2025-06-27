-- Add game_bet_id to transactions table for traceability
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS game_bet_id UUID REFERENCES public.user_bets(id) ON DELETE SET NULL;

-- Add index for game_bet_id
CREATE INDEX IF NOT EXISTS idx_transactions_game_bet_id ON public.transactions (game_bet_id);
