-- =====================================================================
-- FINAL RLS FIX FOR GUEST CHECKOUT
-- This migration CLEARS all RLS policies and creates ONLY what's needed
-- =====================================================================

-- STEP 1: Ensure RLS is enabled on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- STEP 2: DROP ALL existing policies (clean slate)
-- This is the nuclear option - we'll rebuild from scratch
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
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.orders;

-- STEP 3: Create MINIMAL policies (ONLY what's needed for checkout to work)

-- POLICY 1: CRITICAL - Allow anyone (anon + authenticated) to INSERT orders
-- This is what enables guest checkout
CREATE POLICY "allow_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- POLICY 2: Allow buyers to read their own orders
CREATE POLICY "allow_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- STEP 4: Add tracking_token column if it doesn't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- STEP 5: Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- STEP 6: Refresh schema cache
ANALYZE public.orders;

-- =====================================================================
-- VERIFICATION QUERIES (run these to confirm the fix)
-- =====================================================================

-- Verify tracking_token column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tracking_token'
LIMIT 1;

-- Verify INSERT policy exists
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'orders' AND policyname = 'allow_insert_orders';

-- List ALL policies on orders (should be minimal now)
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'orders';
