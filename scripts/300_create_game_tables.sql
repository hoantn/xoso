-- Create game_sessions table
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type TEXT NOT NULL, -- e.g., 'lode_nhanh_1p', 'lode_mien_bac'
    session_number INT NOT NULL, -- e.g., 12345 or date YYYYMMDD
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Time when betting closes
    draw_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Actual draw time (can be same as end_time or later)
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed', 'drawing', 'completed'
    winning_numbers TEXT[], -- Array of winning numbers (e.g., ['12', '34', '56'])
    results_data JSONB, -- Detailed results for traditional lottery (e.g., 8 prizes)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add unique constraint for game_type and session_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_sessions_game_type_session_number ON public.game_sessions (game_type, session_number);

-- RLS for game_sessions (read-only for users, full for admin)
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.game_sessions;
CREATE POLICY "Allow public read access" ON public.game_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin full access" ON public.game_sessions;
CREATE POLICY "Allow admin full access" ON public.game_sessions FOR ALL USING (get_user_role() IN ('admin', 'super_admin')) WITH CHECK (get_user_role() IN ('admin', 'super_admin'));


-- Create user_bets table
CREATE TABLE IF NOT EXISTS public.user_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    bet_type TEXT NOT NULL, -- e.g., 'lo', 'de', 'xien2', 'dau', 'duoi', 'lo_kep'
    numbers TEXT[] NOT NULL, -- e.g., ['12', '34']
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    potential_win NUMERIC(18, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'won', 'lost', 'refunded'
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL, -- FK to transaction for deducting bet amount
    winnings_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL, -- FK to transaction for crediting winnings
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for user_id and session_id for faster queries
CREATE INDEX IF NOT EXISTS idx_user_bets_user_id ON public.user_bets (user_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_session_id ON public.user_bets (session_id);

-- RLS for user_bets (user can only see their own bets, admin full access)
ALTER TABLE public.user_bets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bets" ON public.user_bets;
CREATE POLICY "Users can view their own bets" ON public.user_bets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bets" ON public.user_bets;
CREATE POLICY "Users can insert their own bets" ON public.user_bets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admin full access to user_bets" ON public.user_bets;
CREATE POLICY "Allow admin full access to user_bets" ON public.user_bets FOR ALL USING (get_user_role() IN ('admin', 'super_admin')) WITH CHECK (get_user_role() IN ('admin', 'super_admin'));

-- Trigger to update updated_at column for game_sessions
CREATE OR REPLACE FUNCTION update_game_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_game_sessions_updated_at_trigger ON public.game_sessions;
CREATE TRIGGER update_game_sessions_updated_at_trigger
BEFORE UPDATE ON public.game_sessions
FOR EACH ROW EXECUTE FUNCTION update_game_sessions_updated_at();

-- Trigger to update updated_at column for user_bets
CREATE OR REPLACE FUNCTION update_user_bets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_bets_updated_at_trigger ON public.user_bets;
CREATE TRIGGER update_user_bets_updated_at_trigger
BEFORE UPDATE ON public.user_bets
FOR EACH ROW EXECUTE FUNCTION update_user_bets_updated_at();
