-- Create some sample transactions for testing
DO $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
  v_proxy_id UUID;
BEGIN
  -- Get a sample user
  SELECT id INTO v_user_id FROM users WHERE role = 'user' LIMIT 1;
  
  -- Get an admin user
  SELECT id INTO v_admin_id FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1;
  
  -- Get a sample proxy
  SELECT id INTO v_proxy_id FROM proxies LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_admin_id IS NOT NULL THEN
    -- Insert sample deposit transaction
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      balance_before,
      balance_after,
      description,
      status,
      created_by,
      metadata
    ) VALUES (
      v_user_id,
      'deposit',
      100000,
      0,
      100000,
      'Nạp tiền test - Sample deposit',
      'completed',
      v_admin_id,
      '{"test": true, "sample_data": true}'::jsonb
    );
    
    -- Insert sample admin adjustment
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      balance_before,
      balance_after,
      description,
      status,
      created_by,
      metadata
    ) VALUES (
      v_user_id,
      'admin_adjustment',
      50000,
      100000,
      150000,
      'Điều chỉnh số dư test - Sample adjustment',
      'completed',
      v_admin_id,
      '{"test": true, "adjustment_reason": "Testing"}'::jsonb
    );
    
    -- Insert sample proxy purchase if proxy exists
    IF v_proxy_id IS NOT NULL THEN
      INSERT INTO transactions (
        user_id,
        type,
        amount,
        balance_before,
        balance_after,
        description,
        status,
        reference_id,
        metadata
      ) VALUES (
        v_user_id,
        'proxy_purchase',
        -25000,
        150000,
        125000,
        'Mua proxy test - Sample proxy purchase',
        'completed',
        v_proxy_id,
        jsonb_build_object(
          'test', true,
          'proxy_id', v_proxy_id,
          'price', 25000
        )
      );
    END IF;
    
    RAISE NOTICE 'Sample transactions created successfully';
  ELSE
    RAISE NOTICE 'No users found to create sample transactions';
  END IF;
END $$;

-- Check the created transactions
SELECT 
  t.id,
  t.type,
  t.amount,
  t.balance_before,
  t.balance_after,
  t.description,
  t.status,
  t.created_at,
  u.username as user_name,
  cb.username as created_by_name
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN users cb ON t.created_by = cb.id
ORDER BY t.created_at DESC
LIMIT 10;
