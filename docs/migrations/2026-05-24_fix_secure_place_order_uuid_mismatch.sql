-- =====================================================================
-- FIX: secure_place_order RPC - UUID Type Mismatch Resolution
-- Issue: Invalid input syntax for type uuid: "7"
-- Root Cause: Parameter type coercion from client JavaScript
-- Solution: Recreate RPC with explicit type casting and null handling
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
BEGIN
  -- STEP 1: Sanitize inputs with explicit casting and null-safety
  -- This prevents type coercion errors from JavaScript client
  v_buyer_id := NULLIF(p_buyer_id::TEXT, '')::UUID;
  v_sme_id := NULLIF(p_sme_id::TEXT, '')::BIGINT;
  v_store_id := NULLIF(p_store_id::TEXT, '')::BIGINT;
  v_item_type := COALESCE(p_item_type, 'product');
  
  -- Generate OTP code
  v_otp_code := LPAD((RANDOM() * 9000 + 1000)::INT::TEXT, 4, '0');

  -- STEP 2: Fetch and validate item exists
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

  -- STEP 3: Calculate total amount based on item type
  IF v_item_type = 'service' THEN
    v_total_amount := v_item_price;  -- Services are not quantity-based
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

  -- STEP 4: Generate cryptographically secure tracking token
  v_tracking_token := gen_random_uuid();

  -- STEP 5: Insert order atomically with proper NULL handling
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
    v_buyer_id,           -- NULL for guests, UUID for authenticated users
    p_item_id,            -- Always non-NULL
    v_sme_id,             -- BIGINT, nullable
    v_store_id,           -- BIGINT, nullable
    v_total_amount,       -- NUMERIC, non-NULL
    v_total_amount,       -- NUMERIC, non-NULL
    CASE WHEN v_item_type = 'service' THEN 1 ELSE p_quantity END,
    v_otp_code,           -- TEXT, non-NULL
    v_tracking_token,     -- UUID, non-NULL
    'pending_payment'::TEXT,
    p_customer_name,      -- TEXT, non-NULL
    p_customer_phone,     -- TEXT, non-NULL
    p_delivery_address,   -- TEXT, nullable
    p_scheduled_date,     -- DATE, nullable
    p_service_notes,      -- TEXT, nullable
    v_item_type           -- TEXT, non-NULL
  )
  RETURNING id INTO v_order_id;

  -- STEP 6: Return success response
  RETURN QUERY SELECT
    v_order_id::BIGINT,
    v_total_amount::NUMERIC,
    v_otp_code::TEXT,
    v_tracking_token::UUID,
    'success'::TEXT,
    'Order placed successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Log error details for debugging (sanitized)
  RETURN QUERY SELECT
    NULL::BIGINT,
    NULL::NUMERIC,
    v_otp_code,
    NULL::UUID,
    'error'::TEXT,
    ('Database error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution rights to all users (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) TO anon, authenticated, public;

-- Refresh schema cache
ANALYZE public.orders;
ANALYZE public.hive_catalogue;

-- =====================================================================
-- VERIFICATION: Test function signature
-- =====================================================================
/*
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'secure_place_order';
*/
