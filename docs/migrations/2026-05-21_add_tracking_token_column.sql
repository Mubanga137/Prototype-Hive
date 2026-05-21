-- =====================================================================
-- STEP 1: Add tracking_token column (if missing)
-- =====================================================================
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create index for token-based lookups (if missing)
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- =====================================================================
-- STEP 2: Ensure RLS is enabled
-- =====================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 3: Drop ALL old INSERT policies
-- =====================================================================
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "anyone_can_place_order" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;

-- =====================================================================
-- STEP 4: Create the ONLY INSERT policy needed
-- =====================================================================
-- This policy allows BOTH anon (guests) and authenticated users to insert
CREATE POLICY "anyone_can_place_order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =====================================================================
-- STEP 5: Verify the policy was created
-- =====================================================================
SELECT policyname, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'orders' AND policyname = 'anyone_can_place_order';

-- =====================================================================
-- STEP 6: Refresh schema cache
-- =====================================================================
ANALYZE public.orders;
