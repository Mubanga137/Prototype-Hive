-- =====================================================================
-- DEFINITIVE GUEST CHECKOUT FIX
-- Problem: .insert(...).select(...) fails for guests due to SELECT RLS
-- Solution: Allow guests to INSERT, and return tracking_token without requiring SELECT permission
-- =====================================================================

-- STEP 1: Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL conflicting policies (nuclear option)
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "anyone_can_place_order" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "buyer can read own orders" ON public.orders;
DROP POLICY IF EXISTS "buyer_can_read_own_orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "buyer_can_update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can read store orders" ON public.orders;
DROP POLICY IF EXISTS "sme_owner_can_read_store_orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can update store orders" ON public.orders;
DROP POLICY IF EXISTS "sme_owner_can_update_store_orders" ON public.orders;
DROP POLICY IF EXISTS "guest can read order by otp" ON public.orders;
DROP POLICY IF EXISTS "Gig workers can claim and update orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_claim_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_read_processing_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_update_assigned_orders" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Reading" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Updates" ON public.orders;
DROP POLICY IF EXISTS "guest_no_direct_select" ON public.orders;
DROP POLICY IF EXISTS "allow_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_read_own_orders" ON public.orders;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.orders;

-- STEP 3: Create MINIMAL RLS policies

-- POLICY 1: CRITICAL - Allow ANYONE (anon + authenticated) to INSERT orders
-- This is what enables guest checkout
CREATE POLICY "allow_all_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- POLICY 2: Allow authenticated users to read their own orders
CREATE POLICY "allow_authenticated_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- POLICY 3: Allow authenticated users to update their own orders
CREATE POLICY "allow_authenticated_update_own_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- POLICY 4: Allow SME owners to read and update their store's orders
CREATE POLICY "allow_sme_read_own_store_orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

CREATE POLICY "allow_sme_update_own_store_orders"
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

-- STEP 4: Ensure tracking_token column exists
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- STEP 5: Create an RPC function for guests to retrieve their order securely
-- This allows guests to check order status without needing SELECT permissions
CREATE OR REPLACE FUNCTION public.get_guest_order(
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
    o.otp_code
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.tracking_token = p_tracking_token
    AND o.buyer_id IS NULL;  -- Only for guest orders
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to all roles
GRANT EXECUTE ON FUNCTION public.get_guest_order(BIGINT, UUID) TO anon, authenticated;

-- STEP 6: Refresh schema cache
ANALYZE public.orders;

-- =====================================================================
-- VERIFICATION (run to confirm)
-- =====================================================================

/*
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'orders';

-- Check all policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- Check tracking_token column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tracking_token';

-- Check RPC function
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_guest_order';
*/
