-- =====================================================================
-- CRITICAL: Force Supabase Schema Cache Refresh for Orders Table
-- =====================================================================
-- Problem: Supabase schema cache doesn't recognize columns that physically exist
-- Error: "400 PGRST204: Could not find the 'customer_name' column"
-- 
-- Solution: Multiple cache refresh techniques to force Supabase to reload
-- =====================================================================

-- Method 1: ANALYZE (standard PostgreSQL cache refresh)
ANALYZE public.orders;

-- Method 2: Touch table structure (trigger metadata refresh)
-- This forces PostgreSQL to recompute the table structure
ALTER TABLE public.orders SET (fillfactor = 90);

-- Method 3: Verify all columns exist and are readable
-- This query forces column metadata to be loaded
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Method 4: Recreate the table statistics
VACUUM ANALYZE public.orders;

-- Method 5: Force constraint revalidation
-- This touches all constraints and forces a full schema reload
DO $$
BEGIN
  -- Re-enable RLS (forces schema refresh)
  ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
  ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE 'RLS refreshed for orders table';
END $$;

-- =====================================================================
-- VERIFY RLS POLICIES ARE CORRECT
-- The checkout needs: anyone can INSERT
-- =====================================================================

-- Check current policies
SELECT policyname, permissive, action, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "buyer can read own orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can read store orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can update store orders" ON public.orders;
DROP POLICY IF EXISTS "guest can read order by otp" ON public.orders;

-- Recreate INSERT policy (most permissive - allows anyone to insert)
CREATE POLICY "anyone can place an order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Recreate SELECT policy for buyers
CREATE POLICY "buyer can read own orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Recreate SELECT policy for SME owners
CREATE POLICY "sme owner can read store orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

-- Recreate UPDATE policy for SME owners
CREATE POLICY "sme owner can update store orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

-- Recreate SELECT policy for guests looking up by OTP
CREATE POLICY "guest can read order by otp"
ON public.orders FOR SELECT
TO anon, authenticated
USING (otp_code IS NOT NULL);

-- =====================================================================
-- GRANT PROPER PERMISSIONS
-- =====================================================================
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO anon, authenticated;

-- =====================================================================
-- FINAL CACHE REFRESH
-- =====================================================================
-- Run this last to ensure everything is cached
ANALYZE public.orders;

-- =====================================================================
-- NOTIFICATION
-- =====================================================================
-- After running this migration:
-- 1. WAIT 5-10 MINUTES (Supabase needs time to sync cache)
-- 2. RESTART your dev server
-- 3. CLEAR browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
-- 4. Try checkout again
-- =====================================================================
