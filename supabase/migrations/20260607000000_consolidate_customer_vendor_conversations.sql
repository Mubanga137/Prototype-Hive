-- =====================================================================
-- MIGRATION: Consolidate customer-vendor conversations
-- Purpose: One conversation thread per customer-vendor pair
-- Problem: Multiple orders from same customer create separate threads
-- Solution: 
--   1. Look up vendor actor ID from store
--   2. Check if conversation exists between customer & vendor
--   3. Reuse existing conversation (don't create new one)
--   4. Insert order message into existing/new conversation
-- =====================================================================

-- Drop the old function to recreate it
DROP FUNCTION IF EXISTS public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) CASCADE;

-- Recreate with conversation consolidation logic
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
  conversation_id UUID,
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
  v_system_bot_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
  v_item_name TEXT;
  v_customer_actor_id UUID;
  v_vendor_actor_id UUID;
  v_existing_conv_id UUID;
BEGIN
  -- Sanitize inputs with explicit casting and null-safety
  v_buyer_id := NULLIF(p_buyer_id::TEXT, '')::UUID;
  v_sme_id := NULLIF(p_sme_id::TEXT, '')::BIGINT;
  v_store_id := NULLIF(p_store_id::TEXT, '')::BIGINT;
  v_item_type := COALESCE(p_item_type, 'product');
  
  -- Generate OTP code
  v_otp_code := LPAD((RANDOM() * 9000 + 1000)::INT::TEXT, 4, '0');

  -- Fetch item and validate it exists
  SELECT product_name, price, stock_count 
  INTO v_item_name, v_item_price, v_stock_count
  FROM public.hive_catalogue
  WHERE id = p_item_id;

  IF v_item_price IS NULL THEN
    RETURN QUERY SELECT
      NULL::BIGINT,
      NULL::NUMERIC,
      v_otp_code,
      NULL::UUID,
      NULL::UUID,
      'error'::TEXT,
      'Item not found or has been removed'::TEXT;
    RETURN;
  END IF;

  -- Fallback if product_name is NULL
  v_item_name := COALESCE(v_item_name, 'Item ' || p_item_id::TEXT);

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

  -- STEP 2: Resolve actor IDs for conversation consolidation
  BEGIN
    -- For authenticated users: customer actor is derived from buyer_id
    -- For guests: customer actor should be null (guest orders use tracking token)
    v_customer_actor_id := v_buyer_id;

    -- Look up vendor actor ID from store_id
    IF v_store_id IS NOT NULL THEN
      SELECT id INTO v_vendor_actor_id
      FROM public.actors
      WHERE store_id = v_store_id
      LIMIT 1;
    END IF;

    -- STEP 3: Check if conversation already exists between customer and vendor
    -- This consolidates multiple orders into a single conversation thread
    IF v_customer_actor_id IS NOT NULL AND v_vendor_actor_id IS NOT NULL THEN
      -- Both authenticated customer and vendor: check participant_1 and participant_2
      SELECT id INTO v_existing_conv_id
      FROM public.conversations
      WHERE (participant_1 = v_customer_actor_id AND participant_2 = v_vendor_actor_id)
         OR (participant_1 = v_vendor_actor_id AND participant_2 = v_customer_actor_id)
      LIMIT 1;

      IF v_existing_conv_id IS NOT NULL THEN
        -- Reuse existing conversation
        v_conversation_id := v_existing_conv_id;
        
        -- Update the conversation's last_message_at to reflect new activity
        UPDATE public.conversations
        SET last_message_at = NOW()
        WHERE id = v_conversation_id;
      ELSE
        -- Create new conversation between customer and vendor
        INSERT INTO public.conversations (
          participant_1,
          participant_2,
          context_order_id,
          last_message,
          last_message_at
        ) VALUES (
          v_customer_actor_id,
          v_vendor_actor_id,
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
          WHERE (participant_1 = v_customer_actor_id AND participant_2 = v_vendor_actor_id)
             OR (participant_1 = v_vendor_actor_id AND participant_2 = v_customer_actor_id)
          LIMIT 1;
        END IF;
      END IF;
    ELSE
      -- Guest flow: create conversation using guest_tracking_token
      INSERT INTO public.conversations (
        participant_1,
        guest_tracking_token,
        context_order_id,
        last_message,
        last_message_at
      ) VALUES (
        v_customer_actor_id,
        CASE WHEN v_customer_actor_id IS NULL THEN v_tracking_token::TEXT ELSE NULL END,
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
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to resolve actors or create conversation for order %: %', v_order_id, SQLERRM;
  END;

  -- STEP 4: Insert order notification message into the conversation
  -- This message goes to the shared conversation thread (customer sees it)
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (
      conversation_id,
      sender_actor_id,
      content,
      message_type,
      created_at
    ) VALUES (
      v_conversation_id,
      v_system_bot_id::TEXT,
      '🛒 Order #' || v_order_id || ' placed — ' || v_item_name || 
      CASE WHEN p_quantity > 1 THEN ' × ' || p_quantity::TEXT ELSE '' END ||
      '. Total: ZMW ' || v_total_amount,
      'system_receipt',
      NOW()
    )
    ON CONFLICT DO NOTHING;

    -- Update conversation's last_message to the new order message
    UPDATE public.conversations
    SET 
      last_message = '🛒 Order #' || v_order_id || ' placed',
      last_message_at = NOW()
    WHERE id = v_conversation_id;
  END IF;

  -- STEP 5: Update order with conversation_id
  UPDATE public.orders
  SET conversation_id = v_conversation_id
  WHERE id = v_order_id;

  -- STEP 6: Insert vendor notification (separate from conversation)
  -- This notification goes to the notifications table; vendor sees it in notification bell
  BEGIN
    IF v_store_id IS NOT NULL THEN
      INSERT INTO public.sme_notifications (
        sme_id,
        store_id,
        order_id,
        type,
        title,
        body,
        metadata
      ) VALUES (
        v_sme_id,
        v_store_id,
        v_order_id,
        'new_order',
        'New Order Received',
        '📦 Order #' || v_order_id || ' — ' || v_item_name || 
        CASE WHEN p_quantity > 1 THEN ' × ' || p_quantity::TEXT ELSE '' END ||
        '. Customer: ' || p_customer_name || '. Total: ZMW ' || v_total_amount,
        jsonb_build_object(
          'order_id', v_order_id,
          'item_id', p_item_id,
          'item_name', v_item_name,
          'quantity', CASE WHEN v_item_type = 'service' THEN 1 ELSE p_quantity END,
          'total_amount', v_total_amount,
          'customer_name', p_customer_name,
          'customer_phone', p_customer_phone,
          'conversation_id', v_conversation_id,
          'otp_code', v_otp_code
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail the order if notification creation fails
    RAISE WARNING 'Failed to create vendor notification for order %: %', v_order_id, SQLERRM;
  END;

  -- Return success response
  RETURN QUERY SELECT
    v_order_id::BIGINT,
    v_total_amount::NUMERIC,
    v_otp_code::TEXT,
    v_tracking_token::UUID,
    v_conversation_id::UUID,
    'success'::TEXT,
    'Order placed successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    NULL::BIGINT,
    NULL::NUMERIC,
    v_otp_code,
    NULL::UUID,
    NULL::UUID,
    'error'::TEXT,
    ('Database error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) TO anon, authenticated, public;
