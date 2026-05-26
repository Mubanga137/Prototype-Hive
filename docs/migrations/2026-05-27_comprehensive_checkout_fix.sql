-- =====================================================================
-- COMPREHENSIVE CHECKOUT FIX
-- Purpose: Fix order creation failures by ensuring correct schema and RPC
-- Issues Fixed:
--   1. "column title does not exist" - remove stray title column
--   2. RPC function conflicts - drop old/bad versions, recreate correct one
--   3. Missing tracking_token column - ensure it exists
--   4. RLS policies - ensure checkout can insert
-- =====================================================================

-- STEP 1: Remove the problematic title column if it exists
-- This fixes "column 'title' does not exist" errors
ALTER TABLE public.orders
DROP COLUMN IF EXISTS title;

-- STEP 2: Ensure tracking_token column exists with correct setup
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- STEP 3: Drop ALL conflicting RPC versions (be aggressive)
-- This prevents "Could not choose the best candidate function" errors
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

-- STEP 4: Recreate ONLY the CORRECT secure_place_order RPC
-- This version includes item_type and handles all edge cases properly
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

  -- Generate cryptographically secure tracking token
  v_tracking_token := gen_random_uuid();

  -- Insert order atomically with proper NULL handling
  -- NOTE: Does NOT insert title - orders table has no title column
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

  -- Return success response
  RETURN QUERY SELECT
    v_order_id::BIGINT,
    v_total_amount::NUMERIC,
    v_otp_code::TEXT,
    v_tracking_token::UUID,
    'success'::TEXT,
    'Order placed successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Log error details for debugging
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

-- STEP 5: Ensure RLS policies allow checkout
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "anyone_can_place_order" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "allow_all_insert_orders" ON public.orders;

-- Create clean INSERT policy
CREATE POLICY "allow_all_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- STEP 6: Refresh schema cache
ANALYZE public.orders;
ANALYZE public.hive_catalogue;

-- =====================================================================
-- VERIFICATION - Run these to confirm everything works
-- =====================================================================
/*
-- Check that title column is gone
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'title';
-- Should return: 0

-- Check that tracking_token column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tracking_token';
-- Should return: tracking_token | uuid

-- Check that the RPC exists and has correct signature
SELECT 
  routine_name,
  array_agg(data_type ORDER BY ordinal_position)::text AS parameter_types
FROM information_schema.parameters
WHERE routine_schema = 'public' AND routine_name = 'secure_place_order'
GROUP BY routine_name;
-- Should return ONE row with: secure_place_order | {uuid,bigint,bigint,bigint,integer,text,text,text,date,text,text}

-- Test the RPC with a sample call (replace IDs with real ones)
-- SELECT * FROM public.secure_place_order(
--   NULL::uuid,
--   1::bigint,
--   1::bigint,
--   1::bigint,
--   1::integer,
--   'Test Customer',
--   '0977123456',
--   'Test Address',
--   NULL::date,
--   NULL::text,
--   'product'
-- );
*/
