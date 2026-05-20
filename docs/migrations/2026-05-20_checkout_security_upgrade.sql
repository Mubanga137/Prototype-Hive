-- =====================================================================
-- CHECKOUT SECURITY UPGRADE
-- Adds: tracking_token, secure guest RPC, complete RLS hierarchy
-- Created: 2026-05-20
-- =====================================================================

-- STEP 1: Add tracking_token column
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create index for token-based lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- =====================================================================
-- STEP 2: Ensure RLS is enabled
-- =====================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 3: Drop OLD policies (they are insufficient)
-- =====================================================================
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "buyer can read own orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can read store orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can update store orders" ON public.orders;
DROP POLICY IF EXISTS "guest can read order by otp" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.orders;
DROP POLICY IF EXISTS "Gig workers can claim and update orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_claim_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_read_processing_orders" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Reading" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Updates" ON public.orders;

-- =====================================================================
-- STEP 4: Create NEW RLS policies (complete hierarchy)
-- =====================================================================

-- POLICY 1: Anyone (anon + authenticated) can INSERT orders
CREATE POLICY "anyone_can_place_order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- POLICY 2: Authenticated buyers can read their own orders
CREATE POLICY "buyer_can_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- POLICY 3: Authenticated buyers can update their own orders
CREATE POLICY "buyer_can_update_own_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- POLICY 4: SME owners can read their store's orders
CREATE POLICY "sme_owner_can_read_store_orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

-- POLICY 5: SME owners can update their store's orders (status transitions)
CREATE POLICY "sme_owner_can_update_store_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

-- POLICY 6: Gig workers (riders/runners) can read orders in "processing" state
CREATE POLICY "gig_workers_can_read_processing_orders"
ON public.orders FOR SELECT
TO authenticated
USING (status = 'processing');

-- POLICY 7: Gig workers can claim processing orders (transition to assigned)
CREATE POLICY "gig_workers_can_claim_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  status = 'processing'
  AND rider_id IS NULL
  AND runner_id IS NULL
)
WITH CHECK (
  status = 'assigned'
  AND (rider_id = auth.uid() OR runner_id = auth.uid())
);

-- POLICY 8: Gig workers can update their assigned orders
CREATE POLICY "gig_workers_can_update_assigned_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  (rider_id = auth.uid() OR runner_id = auth.uid())
  AND status IN ('assigned', 'in_transit')
)
WITH CHECK (
  (rider_id = auth.uid() OR runner_id = auth.uid())
  AND status IN ('in_transit', 'delivered')
);

-- POLICY 9: Block direct guest SELECT (guests must use RPC instead)
CREATE POLICY "guest_no_direct_select"
ON public.orders FOR SELECT
TO anon
USING (false);

-- =====================================================================
-- STEP 5: Create secure RPC for guest order retrieval
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_secure_guest_order(
  p_order_id BIGINT,
  p_tracking_token UUID
)
RETURNS TABLE (
  id BIGINT,
  status TEXT,
  tracking_token UUID,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  total_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  runner_id BIGINT,
  rider_id BIGINT,
  otp_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.status,
    o.tracking_token,
    o.customer_name,
    o.customer_phone,
    o.delivery_address,
    o.total_price,
    o.created_at,
    o.runner_id,
    o.rider_id,
    CASE 
      WHEN o.status IN ('pending_payment', 'paid', 'processing') THEN NULL
      WHEN o.status IN ('assigned', 'in_transit') THEN NULL
      WHEN o.status = 'delivered' THEN o.otp_code
      ELSE NULL
    END AS otp_code
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.tracking_token = p_tracking_token
    AND o.buyer_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant RPC execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_secure_guest_order(BIGINT, UUID) 
  TO anon, authenticated;

-- =====================================================================
-- STEP 6: Refresh schema cache
-- =====================================================================
ANALYZE public.orders;

-- =====================================================================
-- VERIFICATION QUERIES (run to check)
-- =====================================================================

/*
-- Verify tracking_token column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tracking_token';

-- Verify RLS policies
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- Verify RPC function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_secure_guest_order';
*/
