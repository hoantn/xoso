-- Script hoàn chỉnh tạo functions và triggers (đã được cập nhật)

BEGIN;

-- 0. Drop existing functions and their dependent objects first
DROP FUNCTION IF EXISTS purchase_proxy_plan(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 1. Tạo function update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Tạo triggers cho tất cả bảng
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxies_updated_at BEFORE UPDATE ON public.proxies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxy_plans_updated_at BEFORE UPDATE ON public.proxy_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxy_orders_updated_at BEFORE UPDATE ON public.proxy_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON public.deposit_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Tạo function purchase_proxy_plan hoàn chỉnh
CREATE OR REPLACE FUNCTION purchase_proxy_plan(p_user_id uuid, p_plan_id uuid)
RETURNS TABLE(success boolean, message text, order_id uuid, proxy_id uuid, expires_at timestamptz) AS $$
DECLARE
    v_plan_price numeric;
    v_plan_duration_days integer;
    v_plan_max_connections integer;
    v_plan_proxy_type text;
    v_user_balance numeric;
    v_new_balance numeric;
    v_order_id uuid;
    v_proxy_id uuid;
    v_expires_at timestamptz;
BEGIN
    -- Lock the user row to prevent race conditions
    SELECT balance INTO v_user_balance FROM public.users WHERE id = p_user_id FOR UPDATE;

    IF v_user_balance IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Người dùng không tồn tại hoặc số dư chưa được khởi tạo.', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Get plan details
    SELECT price, duration_days, max_connections, proxy_type
    INTO v_plan_price, v_plan_duration_days, v_plan_max_connections, v_plan_proxy_type
    FROM public.proxy_plans
    WHERE id = p_plan_id AND is_active = TRUE;

    IF v_plan_price IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Gói proxy không tồn tại hoặc không hoạt động.', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Check if user has enough balance
    IF v_user_balance < v_plan_price THEN
        RETURN QUERY SELECT FALSE, 'Số dư không đủ để mua gói proxy này. Số dư hiện tại: ' || v_user_balance || ' VNĐ, cần: ' || v_plan_price || ' VNĐ', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Calculate new balance
    v_new_balance := v_user_balance - v_plan_price;

    -- Update user balance
    UPDATE public.users
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_user_id;

    -- Select an available proxy based on proxy_type and visibility
    SELECT id INTO v_proxy_id
    FROM public.proxies
    WHERE (proxy_type = v_plan_proxy_type OR type = v_plan_proxy_type) 
      AND is_active = TRUE 
      AND user_id IS NULL
      AND visibility = 'private' -- <-- Thêm điều kiện này để chỉ chọn proxy private
    ORDER BY RANDOM()
    LIMIT 1
    FOR UPDATE;

    IF v_proxy_id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Không có proxy khả dụng cho loại ' || v_plan_proxy_type || '. Vui lòng thử lại sau.', NULL::uuid, NULL::uuid, NULL::timestamptz;
        RETURN;
    END IF;

    -- Calculate expiration date
    v_expires_at := NOW() + (v_plan_duration_days || ' days')::interval;

    -- Create proxy order
    INSERT INTO public.proxy_orders (user_id, proxy_id, plan_id, price, expires_at, created_at, updated_at)
    VALUES (p_user_id, v_proxy_id, p_plan_id, v_plan_price, v_expires_at, NOW(), NOW())
    RETURNING id INTO v_order_id;

    -- Update proxy status
    UPDATE public.proxies
    SET user_id = p_user_id,
        expires_at = v_expires_at,
        max_users = v_plan_max_connections,
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_proxy_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, amount, type, status, description, reference_id, created_at, updated_at, balance_before, balance_after) -- <-- Thêm balance_before và balance_after
    VALUES (p_user_id, -v_plan_price, 'purchase', 'completed', 'Mua gói proxy ' || v_plan_proxy_type, v_order_id, NOW(), NOW(), v_user_balance, v_new_balance); -- <-- Điền giá trị

    -- Return success result
    RETURN QUERY SELECT TRUE, 'Mua proxy thành công! Proxy sẽ hết hạn vào ' || v_expires_at::text, v_order_id, v_proxy_id, v_expires_at;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE NOTICE 'Error in purchase_proxy_plan: %', SQLERRM;
        -- Return error result
        RETURN QUERY SELECT FALSE, 'Lỗi hệ thống khi xử lý yêu cầu mua proxy: ' || SQLERRM, NULL::uuid, NULL::uuid, NULL::timestamptz;
END;
$$ LANGUAGE plpgsql;

-- 4. Tạo function để cleanup proxy hết hạn
CREATE OR REPLACE FUNCTION cleanup_expired_proxies()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Reset expired proxies back to available state
    UPDATE public.proxies 
    SET user_id = NULL, 
        expires_at = NULL,
        updated_at = NOW()
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW() 
      AND user_id IS NOT NULL;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Tạo indexes để tối ưu performance
CREATE INDEX IF NOT EXISTS idx_proxies_user_id ON public.proxies(user_id);
CREATE INDEX IF NOT EXISTS idx_proxies_type ON public.proxies(proxy_type);
CREATE INDEX IF NOT EXISTS idx_proxies_available ON public.proxies(is_active, user_id) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_proxies_expires_at ON public.proxies(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proxy_orders_user_id ON public.proxy_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_orders_expires_at ON public.proxy_orders(expires_at);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

COMMIT;

-- Thông báo hoàn thành
SELECT 'Functions, triggers và indexes đã được tạo thành công!' AS message;
