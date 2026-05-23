-- =====================================================================
-- SECURE PLACE ORDER RPC FUNCTION
-- Purpose: Validate inventory, calculate final price, and atomically create order
-- Security: Runs as DEFINER (elevated privileges) to bypass some RLS checks
-- Usage: Called from checkout UI to ensure consistency and validate availability
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
BEGIN
  -- Generate OTP
  v_otp_code := LPAD((RANDOM() * 9000 + 1000)::INT::TEXT, 4, '0');

  -- Fetch item price and validate it exists
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

  -- Calculate total amount
  IF p_item_type = 'service' THEN
    v_total_amount := v_item_price;  -- Services are not quantity-based
  ELSE
    -- For products, check stock if it's a physical item
    IF p_item_type IN ('physical', 'product') AND v_stock_count IS NOT NULL THEN
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

  -- Generate tracking token
  v_tracking_token := gen_random_uuid();

  -- Insert the order (this will trigger RLS if applicable)
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
    service_notes
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
    p_service_notes
  )
  RETURNING id INTO v_order_id;

  -- Return success with order details
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all roles (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) TO anon, authenticated;

-- =====================================================================
-- Verify the function exists
-- =====================================================================
/*
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'secure_place_order';
*/
