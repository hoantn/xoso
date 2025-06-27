-- ✅ SỬA LỖI: Ambiguous variable names
-- Sử dụng label blocks để tránh conflict giữa variable và column names

DO $$
DECLARE
    bet_record RECORD;
    user_current_balance NUMERIC;
    user_new_balance NUMERIC;
    existing_transaction_count INTEGER;
    processed_count INTEGER := 0;
    total_winnings NUMERIC := 0;
    constraint_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🎯 BƯỚC 1: Kiểm tra và sửa constraint transactions_type_check';
    
    -- Kiểm tra constraint hiện tại
    SELECT EXISTS(
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_type_check'
        AND conrelid = 'transactions'::regclass
    ) INTO constraint_exists;
    
    RAISE NOTICE 'Constraint tồn tại: %', constraint_exists;
    
    -- Thêm 'game_win' vào constraint nếu chưa có
    BEGIN
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
        CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'adjustment', 'game_win', 'refund'));
        RAISE NOTICE '✅ Đã cập nhật constraint cho phép game_win';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Lỗi cập nhật constraint: %', SQLERRM;
    END;

    RAISE NOTICE '🎯 BƯỚC 2: Tìm và xử lý cược pending cho phiên #2336';
    
    -- Tìm tất cả cược pending cho session 2336
    FOR bet_record IN 
        SELECT 
            ub.id,
            ub.user_id,
            ub.session_id,
            ub.bet_type,
            ub.numbers,
            ub.amount,
            ub.status,
            gs.session_number,
            gs.winning_numbers,
            gs.results_data
        FROM user_bets ub
        JOIN game_sessions gs ON ub.session_id = gs.id
        WHERE gs.session_number = 2336
        AND ub.status = 'pending'
    LOOP
        RAISE NOTICE '📋 Xử lý cược: ID=%, Type=%, Numbers=%, Amount=%', 
            bet_record.id, bet_record.bet_type, bet_record.numbers, bet_record.amount;
        
        -- ✅ SỬA: Sử dụng labeled block để tránh variable conflicts
        <<bet_processing>>
        DECLARE
            is_winner BOOLEAN := FALSE;
            calculated_win_amount NUMERIC := 0;  -- ✅ Đổi tên variable để tránh conflict
            special_prize TEXT;
            last_two_digits TEXT;
        BEGIN
            -- Lấy giải đặc biệt từ results_data
            special_prize := bet_record.results_data->>'special_prize';
            last_two_digits := RIGHT(special_prize, 2);
            
            RAISE NOTICE '🎲 Giải đặc biệt: %, 2 số cuối: %, Winning numbers: %', 
                special_prize, last_two_digits, bet_record.winning_numbers;
            
            -- Logic kiểm tra thắng thua cho lô 2 số
            IF bet_record.bet_type LIKE '%lo_2_so%' THEN
                -- Kiểm tra xem có số nào trong bet trùng với winning_numbers
                SELECT EXISTS(
                    SELECT 1 FROM unnest(bet_record.numbers) AS bet_num
                    WHERE bet_num = ANY(bet_record.winning_numbers)
                ) INTO is_winner;
                
                IF is_winner THEN
                    calculated_win_amount := bet_record.amount * 99; -- Tỷ lệ lô 2 số 1:99
                END IF;
            END IF;
            
            -- Logic cho đề đặc biệt  
            IF bet_record.bet_type LIKE '%de_dac_biet%' THEN
                SELECT EXISTS(
                    SELECT 1 FROM unnest(bet_record.numbers) AS bet_num
                    WHERE bet_num = last_two_digits
                ) INTO is_winner;
                
                IF is_winner THEN
                    calculated_win_amount := bet_record.amount * 99; -- Tỷ lệ đề 1:99
                END IF;
            END IF;
            
            RAISE NOTICE '🏆 Kết quả: Winner=%, Win Amount=%', is_winner, calculated_win_amount;
            
            -- ✅ SỬA: Cập nhật trạng thái cược với variable name rõ ràng
            UPDATE user_bets 
            SET 
                status = CASE WHEN is_winner THEN 'won' ELSE 'lost' END,
                win_amount = calculated_win_amount,  -- ✅ Sử dụng variable name khác
                updated_at = NOW(),
                processed_at = NOW()
            WHERE id = bet_record.id;
            
            processed_count := processed_count + 1;
            
            -- Nếu thắng, cập nhật balance và tạo transaction
            IF is_winner AND calculated_win_amount > 0 THEN
                -- Lấy balance hiện tại
                SELECT balance INTO user_current_balance 
                FROM users 
                WHERE id = bet_record.user_id;
                
                user_new_balance := user_current_balance + calculated_win_amount;
                total_winnings := total_winnings + calculated_win_amount;
                
                -- Kiểm tra transaction trùng lặp
                SELECT COUNT(*) INTO existing_transaction_count
                FROM transactions 
                WHERE reference_id = bet_record.id
                AND type = 'game_win';
                
                IF existing_transaction_count = 0 THEN
                    -- Cập nhật balance user
                    UPDATE users 
                    SET balance = user_new_balance 
                    WHERE id = bet_record.user_id;
                    
                    -- Tạo transaction thắng
                    INSERT INTO transactions (
                        user_id,
                        type,
                        amount,
                        balance_before,
                        balance_after,
                        description,
                        status,
                        reference_id,
                        metadata,
                        created_at
                    ) VALUES (
                        bet_record.user_id,
                        'game_win',
                        calculated_win_amount,
                        user_current_balance,
                        user_new_balance,
                        'Thắng cược ' || bet_record.bet_type || ' - Phiên 2336',
                        'completed',
                        bet_record.id,
                        jsonb_build_object(
                            'bet_id', bet_record.id,
                            'session_number', 2336,
                            'bet_type', bet_record.bet_type,
                            'bet_numbers', bet_record.numbers,
                            'win_amount', calculated_win_amount,
                            'processed_manually', true
                        ),
                        NOW()
                    );
                    
                    RAISE NOTICE '💰 Đã cập nhật balance user % từ % thành % (+%)', 
                        bet_record.user_id, user_current_balance, user_new_balance, calculated_win_amount;
                ELSE
                    RAISE NOTICE '⚠️ Transaction đã tồn tại cho bet %', bet_record.id;
                END IF;
            END IF;
        END bet_processing;
        
    END LOOP;
    
    RAISE NOTICE '🎯 BƯỚC 3: Tổng kết kết quả';
    RAISE NOTICE '✅ Đã xử lý % cược', processed_count;
    RAISE NOTICE '💰 Tổng tiền thưởng: %', total_winnings;
    
END $$;

-- Hiển thị báo cáo cuối cùng
DO $$
DECLARE
    final_report RECORD;
BEGIN
    -- Lấy báo cáo cuối cùng
    SELECT 
        COUNT(*) as total_bets,
        COUNT(*) FILTER (WHERE ub.status = 'won') as won_bets,
        COUNT(*) FILTER (WHERE ub.status = 'lost') as lost_bets,
        COUNT(*) FILTER (WHERE ub.status = 'pending') as still_pending,
        COALESCE(SUM(ub.win_amount) FILTER (WHERE ub.status = 'won'), 0) as total_winnings
    INTO final_report
    FROM user_bets ub
    JOIN game_sessions gs ON ub.session_id = gs.id
    WHERE gs.session_number = 2336;
    
    RAISE NOTICE '🏆 KẾT QUẢ CUỐI CÙNG PHIÊN 2336:';
    RAISE NOTICE '   📊 Tổng cược: %', final_report.total_bets;
    RAISE NOTICE '   ✅ Thắng: %', final_report.won_bets;
    RAISE NOTICE '   ❌ Thua: %', final_report.lost_bets;
    RAISE NOTICE '   ⏳ Còn pending: %', final_report.still_pending;
    RAISE NOTICE '   💰 Tổng thưởng: %', final_report.total_winnings;
END $$;

-- Hiển thị user balance sau khi xử lý
SELECT 
    '💰 USER BALANCE SAU XỬ LÝ' as report_title,
    u.id,
    u.username,
    u.balance,
    COUNT(ub.id) as total_bets_placed,
    COUNT(ub.id) FILTER (WHERE ub.status = 'won') as won_bets,
    COALESCE(SUM(ub.win_amount) FILTER (WHERE ub.status = 'won'), 0) as total_winnings_received
FROM users u
JOIN user_bets ub ON u.id = ub.user_id
JOIN game_sessions gs ON ub.session_id = gs.id
WHERE gs.session_number = 2336
GROUP BY u.id, u.username, u.balance
ORDER BY total_winnings_received DESC;
