-- =====================================================================
-- MIGRATION: Ensure secure_place_order RPC exists in migrations
-- Purpose: This migration brings the RPC from docs/migrations into actual use
-- =====================================================================

-- STEP 1: Drop ANY conflicting versions to ensure clean slate
DROP FUNCTION IF EXISTS public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS public.secure_place_order(
  UUID, UUID, UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS public.secure_place_order(
  UUID, TEXT, TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, UUID, UUID
) CASCADE;

DROP FUNCTION IF EXISTS public.secure_place_order() CASCADE;

-- STEP 2: Recreate the CORRECT secure_place_order RPC
CREATE OR REPLACE FUNCTION public.secure_place_order(
  p_buyer_id UUID,
  p_item_id BIGINT,
  p_sme_id BIGINT,
  p_store_id BIGINT,
  p_quantity INT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_address TEXT,
  p_scheduled_date DATE,
  p_service_notes TEXT,
  p_item_type TEXT
)
RETURNS TABLE (
  order_id BIGINT,
  total_to_pay NUMERIC,
  otp_code TEXT,
  tracking_token UUID,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_item_price NUMERIC;
  v_stock_count INT;
  v_otp_code TEXT;
  v_total_amount NUMERIC;
  v_order_id BIGINT;
  v_tracking_token UUID;
  v_item_type TEXT;
  v_buyer_id UUID;
  v_sme_id BIGINT;
  v_store_id BIGINT;
  v_conversation_id UUID;
  v_system_bot_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- Sanitize inputs with explicit casting and null-safety
  v_buyer_id := NULLIF(p_buyer_id::TEXT, '')::UUID;
  v_sme_id := NULLIF(p_sme_id::TEXT, '')::BIGINT;
  v_store_id := NULLIF(p_store_id::TEXT, '')::BIGINT;
  v_item_type := COALESCE(p_item_type, 'product');
  
  -- Generate OTP code
  v_otp_code := LPAD((RANDOM() * 9000 + 1000)::INT::TEXT, 4, '0');

  -- Fetch and validate item exists
  SELECT price, stock_count INTO v_item_price, v_stock_count
  FROM public.hive_catalogue
  WHERE id = p_item_id;

  IF v_item_price IS NULL THEN
    RETURN QUERY SELECT
      NULL::BIGINT,
      NULL::NUMERIC,
      v_otp_code,
      NULL::UUID,
      'error'::TEXT,
      'Item not found or has been removed'::TEXT;
    RETURN;
  END IF;

  -- Calculate total amount based on item type
  IF v_item_type = 'service' THEN
    v_total_amount := v_item_price;
  ELSE
    -- For physical/digital products, validate stock if available
    IF v_item_type IN ('physical', 'product') AND v_stock_count IS NOT NULL THEN
      IF v_stock_count < p_quantity THEN
        RETURN QUERY SELECT
          NULL::BIGINT,
          NULL::NUMERIC,
          v_otp_code,
          NULL::UUID,
          'insufficient_stock'::TEXT,
          ('Only ' || v_stock_count || ' items available')::TEXT;
        RETURN;
      END IF;
    END IF;
    v_total_amount := v_item_price * p_quantity;
  END IF;

  -- Generate cryptographically secure tracking token
  v_tracking_token := gen_random_uuid();

  -- Insert order atomically
  INSERT INTO public.orders (
    buyer_id,
    item_id,
    sme_id,
    store_id,
    total_amount,
    total_price,
    quantity,
    otp_code,
    tracking_token,
    status,
    customer_name,
    customer_phone,
    delivery_address,
    scheduled_date,
    service_notes,
    item_type
  ) VALUES (
    v_buyer_id,
    p_item_id,
    v_sme_id,
    v_store_id,
    v_total_amount,
    v_total_amount,
    CASE WHEN v_item_type = 'service' THEN 1 ELSE p_quantity END,
    v_otp_code,
    v_tracking_token,
    'pending_payment'::TEXT,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    p_scheduled_date,
    p_service_notes,
    v_item_type
  )
  RETURNING id INTO v_order_id;

  -- STEP 2: Ensure conversation exists for order (handles both authenticated and guest)
  -- For authenticated: participant_a = buyer_id, participant_b = null
  -- For guest: participant_a = null, guest_tracking_token = tracking_token
  BEGIN
    INSERT INTO public.conversations (
      participant_a,
      guest_tracking_token,
      context_order_id,
      last_message,
      last_message_at
    ) VALUES (
      v_buyer_id,
      CASE WHEN v_buyer_id IS NULL THEN v_tracking_token::TEXT ELSE NULL END,
      v_order_id,
      '🐝 Order Received',
      NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_conversation_id;

    -- If insert didn't return (conflict), fetch the existing conversation
    IF v_conversation_id IS NULL THEN
      SELECT id INTO v_conversation_id
      FROM public.conversations
      WHERE context_order_id = v_order_id
      LIMIT 1;
    END IF;

    -- STEP 3: Insert initial system message if conversation exists
    IF v_conversation_id IS NOT NULL THEN
      INSERT INTO public.messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        created_at
      ) VALUES (
        v_conversation_id,
        v_system_bot_id::TEXT,
        '🐝 Hive System Receipt: Your order has been received and confirmed. A vendor/provider will contact you shortly.',
        'system_receipt',
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail the order if conversation creation fails
    RAISE WARNING 'Failed to create conversation for order %: %', v_order_id, SQLERRM;
  END;

  -- Return success response
  RETURN QUERY SELECT
    v_order_id::BIGINT,
    v_total_amount::NUMERIC,
    v_otp_code::TEXT,
    v_tracking_token::UUID,
    'success'::TEXT,
    'Order placed successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    NULL::BIGINT,
    NULL::NUMERIC,
    v_otp_code,
    NULL::UUID,
    'error'::TEXT,
    ('Database error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) TO anon, authenticated, public;

-- Ensure RLS policy allows inserts
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_insert_orders" ON public.orders;

CREATE POLICY "allow_all_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated, public
WITH CHECK (true);

-- Refresh schema
ANALYZE public.orders;
