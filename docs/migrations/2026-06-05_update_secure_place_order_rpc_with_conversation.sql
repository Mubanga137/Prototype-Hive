-- =====================================================================
-- UPDATE SECURE PLACE ORDER RPC
-- Purpose: Atomically create order AND conversation in single RPC call
-- Enforces INVARIANT #1: Single conversation per order
-- =====================================================================

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
  conversation_id UUID,
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
  v_conversation_id UUID;
  v_system_bot_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- INVARIANT #1: Generate OTP and tracking token
  v_otp_code := LPAD((RANDOM() * 9000 + 1000)::INT::TEXT, 4, '0');
  v_tracking_token := gen_random_uuid();

  -- Fetch item price and validate it exists
  SELECT price, stock_count INTO v_item_price, v_stock_count
  FROM public.hive_catalogue
  WHERE id = p_item_id;

  IF v_item_price IS NULL THEN
    RETURN QUERY SELECT
      NULL::BIGINT,
      NULL::UUID,
      NULL::NUMERIC,
      v_otp_code,
      NULL::UUID,
      'error'::TEXT,
      'Item not found or has been removed'::TEXT;
    RETURN;
  END IF;

  -- Calculate total amount
  IF p_item_type = 'service' THEN
    v_total_amount := v_item_price;
  ELSE
    IF p_item_type IN ('physical', 'product') AND v_stock_count IS NOT NULL THEN
      IF v_stock_count < p_quantity THEN
        RETURN QUERY SELECT
          NULL::BIGINT,
          NULL::UUID,
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

  -- INVARIANT #1: Step 1 - Insert the order
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
    p_buyer_id,
    p_item_id,
    p_sme_id,
    p_store_id,
    v_total_amount,
    v_total_amount,
    CASE WHEN p_item_type = 'service' THEN 1 ELSE p_quantity END,
    v_otp_code,
    v_tracking_token,
    'pending_payment'::TEXT,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    p_scheduled_date,
    p_service_notes,
    CASE WHEN p_item_type = 'service' THEN 'service' ELSE 'product' END
  )
  RETURNING id INTO v_order_id;

  -- INVARIANT #1: Step 2 - Create conversation atomically with order
  INSERT INTO public.conversations (
    participant_a,
    guest_tracking_token,
    context_order_id,
    last_message,
    last_message_at
  ) VALUES (
    CASE WHEN p_buyer_id IS NULL THEN NULL ELSE p_buyer_id END,
    CASE WHEN p_buyer_id IS NULL THEN v_tracking_token::TEXT ELSE NULL END,
    v_order_id,
    '🐝 Order Received',
    NOW()
  )
  RETURNING id INTO v_conversation_id;

  -- INVARIANT #1: Step 3 - Update order with conversation_id
  UPDATE public.orders
  SET conversation_id = v_conversation_id
  WHERE id = v_order_id;

  -- INVARIANT #3: Step 4 - Insert initial system receipt message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    message_type
  ) VALUES (
    v_conversation_id,
    v_system_bot_id::TEXT,
    '🐝 Hive System Receipt' || E'\n\n' ||
    'Order #' || v_order_id || E'\n' ||
    'Customer: ' || p_customer_name || E'\n' ||
    'Total: K' || v_total_amount || E'\n' ||
    CASE
      WHEN p_item_type = 'service' THEN 'Scheduled: ' || p_scheduled_date || E'\n'
      ELSE 'Items: ' || CASE WHEN p_item_type = 'service' THEN '1' ELSE p_quantity::TEXT END || E'\n'
    END ||
    'OTP: ' || v_otp_code,
    'system_receipt'
  );

  -- Log to server logs for debugging (INVARIANT #7)
  RAISE LOG '[secure_place_order] INVARIANT #1 SATISFIED: Order=%, Conversation=%, TrackingToken=%',
    v_order_id, v_conversation_id, v_tracking_token;

  -- Return success with conversation_id included
  RETURN QUERY SELECT
    v_order_id::BIGINT,
    v_conversation_id::UUID,
    v_total_amount::NUMERIC,
    v_otp_code::TEXT,
    v_tracking_token::UUID,
    'success'::TEXT,
    'Order placed successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[secure_place_order] EXCEPTION: %', SQLERRM;
  RETURN QUERY SELECT
    NULL::BIGINT,
    NULL::UUID,
    NULL::NUMERIC,
    v_otp_code,
    NULL::UUID,
    'error'::TEXT,
    ('Database error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all roles
GRANT EXECUTE ON FUNCTION public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) TO anon, authenticated;

-- =====================================================================
-- IMPORTANT: Update frontend code to handle conversation_id in response
-- =====================================================================
/*
FRONTEND UPDATE REQUIRED:
In src/components/CheckoutDrawer.tsx, update line ~232:

OLD:
  const result = data?.[0] || data;
  const extractedOrderId = result.order_id;
  const extractedTrackingToken = result.tracking_token;

NEW:
  const result = data?.[0] || data;
  const extractedOrderId = result.order_id;
  const extractedConversationId = result.conversation_id;  // NEW
  const extractedTrackingToken = result.tracking_token;

Then log INVARIANT #7:
  logMessagingFlowEvent('order_created', {
    orderId: extractedOrderId,
    conversationId: extractedConversationId,
  });
*/
