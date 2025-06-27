-- Add visibility column to proxies table
ALTER TABLE proxies 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- Update existing records to have default visibility
UPDATE proxies 
SET visibility = 'public' 
WHERE visibility IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN proxies.visibility IS 'Proxy visibility: public (free for all) or private (for sale)';
