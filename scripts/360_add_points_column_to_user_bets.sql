-- Add points column to user_bets table to distinguish between point-based and money-based betting
-- This allows us to properly handle Lô (point-based) vs Đề/Xiên (money-based) calculations

-- Check if points column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_bets' AND column_name = 'points'
    ) THEN
        -- Add points column
        ALTER TABLE public.user_bets 
        ADD COLUMN points INTEGER DEFAULT 0;
        
        -- Add comment to explain the column
        COMMENT ON COLUMN public.user_bets.points IS 'Points used for Lô betting (point-based), 0 for Đề/Xiên (money-based)';
        
        RAISE NOTICE 'Added points column to user_bets table';
    ELSE
        RAISE NOTICE 'Points column already exists in user_bets table';
    END IF;
END $$;

-- Update existing records to set points = 0 for money-based bets
UPDATE public.user_bets 
SET points = 0 
WHERE points IS NULL;

-- Create index for better performance on points queries
CREATE INDEX IF NOT EXISTS idx_user_bets_points ON public.user_bets(points);

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Points column setup completed successfully';
    RAISE NOTICE 'Point-based bets (Lô): points > 0, amount = total cost in VND';
    RAISE NOTICE 'Money-based bets (Đề/Xiên): points = 0, amount = bet amount in VND';
END $$;
