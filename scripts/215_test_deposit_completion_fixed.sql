-- Script để test việc hoàn thành một giao dịch nạp tiền
-- Thay thế USER_ID_HERE bằng ID thực của user bạn muốn test

DO $$
DECLARE
    test_user_id uuid := 'c71c3ad3-8acb-4538-845a-9049cd4141f3'; -- ID của user hoantn1
    test_transaction_id uuid;
    current_balance numeric := 0;
    transaction_record record;
BEGIN
    -- Lấy số dư hiện tại của user
    SELECT COALESCE(balance, 0) INTO current_balance 
    FROM users 
    WHERE id = test_user_id;
    
    RAISE NOTICE 'Current balance for user %: %', test_user_id, current_balance;
    
    -- Tạo một giao dịch nạp tiền pending
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        status,
        balance_before,
        balance_after,
        description,
        created_by
    ) VALUES (
        test_user_id,
        'deposit',
        50000,
        'pending',
        current_balance,
        current_balance, -- Chưa cộng vào balance
        'Test deposit for realtime notification',
        test_user_id
    ) RETURNING id INTO test_transaction_id;
    
    RAISE NOTICE 'Created pending deposit transaction: %', test_transaction_id;
    
    -- Đợi 2 giây để user có thể thấy transaction pending
    PERFORM pg_sleep(2);
    
    -- Cập nhật transaction thành completed và cộng tiền vào balance
    UPDATE transactions 
    SET 
        status = 'completed',
        balance_after = current_balance + 50000,
        updated_at = NOW()
    WHERE id = test_transaction_id;
    
    -- Cập nhật balance của user
    UPDATE users 
    SET balance = current_balance + 50000
    WHERE id = test_user_id;
    
    RAISE NOTICE 'Completed deposit transaction: %. New balance: %', test_transaction_id, current_balance + 50000;
    
    -- Lấy thông tin transaction để hiển thị
    SELECT 
        id,
        type,
        amount,
        status,
        balance_before,
        balance_after,
        description
    INTO transaction_record
    FROM transactions 
    WHERE id = test_transaction_id;
    
    RAISE NOTICE 'Transaction details: ID=%, Type=%, Amount=%, Status=%, Balance Before=%, Balance After=%', 
        transaction_record.id, 
        transaction_record.type, 
        transaction_record.amount, 
        transaction_record.status, 
        transaction_record.balance_before, 
        transaction_record.balance_after;
    
END $$;

-- Kiểm tra kết quả cuối cùng
SELECT 
    'Test completed successfully' as message,
    id,
    type,
    amount,
    status,
    balance_before,
    balance_after,
    description,
    created_at,
    updated_at
FROM transactions 
WHERE description = 'Test deposit for realtime notification'
ORDER BY created_at DESC 
LIMIT 1;
