-- Fix transactions table and ensure it works properly
DROP TABLE IF EXISTS transactions CASCADE;

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'proxy_purchase', 'admin_adjustment', 'refund', 'test_transaction')),
    amount DECIMAL(15,2) NOT NULL,
    balance_before DECIMAL(15,2) NOT NULL DEFAULT 0,
    balance_after DECIMAL(15,2) NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    reference_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference_id ON transactions(reference_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data to verify the table works
INSERT INTO transactions (user_id, type, amount, balance_before, balance_after, description, status)
SELECT 
    u.id,
    'test_transaction',
    1000,
    COALESCE(u.balance, 0),
    COALESCE(u.balance, 0) + 1000,
    'Test transaction to verify table works',
    'completed'
FROM users u 
WHERE u.role = 'user' 
LIMIT 1;

-- Verify the insert worked
SELECT 'TRANSACTIONS TABLE VERIFICATION' as step;
SELECT COUNT(*) as transaction_count FROM transactions;
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
