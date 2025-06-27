DO $$
BEGIN
    -- Drop function place_bet_transaction_with_points if it exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'place_bet_transaction_with_points') THEN
        DROP FUNCTION public.place_bet_transaction_with_points(uuid, text, text[], numeric, numeric);
    END IF;

    -- Drop function payout_winner if it exists (assuming it uses the old signature)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'payout_winner') THEN
        DROP FUNCTION public.payout_winner(uuid, text, numeric);
    END IF;

    -- Also check for the _with_points version of payout_winner
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'payout_winner_with_points') THEN
        DROP FUNCTION public.payout_winner_with_points(uuid, text);
    END IF;

END $$;
