-- =====================================================================
-- FIX: UUID Type Mismatch in Gig Worker RLS Policies
-- Issue: rider_id and runner_id are BIGINT, but policies compared them to auth.uid() (UUID)
-- PostgreSQL error: "invalid input syntax for type uuid" when riders try to claim orders
-- =====================================================================

-- STEP 1: Drop the problematic policies that compare bigint to UUID
DROP POLICY IF EXISTS "gig_workers_can_claim_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_update_assigned_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_read_processing_orders" ON public.orders;

-- STEP 2: Recreate gig worker policies WITHOUT UUID comparison
-- Note: Since rider_id and runner_id are BIGINT, not UUID, gig workers must be
-- identified by their user_id (UUID) in a separate riders/runners table.
-- For now, we disable direct order claiming via RLS - use RPC instead.

-- STEP 3: Ensure minimal, working policies remain
-- Verify that only safe policies exist (checkout works, no gig worker direct access)
CREATE POLICY IF NOT EXISTS "allow_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "allow_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- STEP 4: Refresh schema cache
ANALYZE public.orders;

-- =====================================================================
-- VERIFICATION (run to confirm fix)
-- =====================================================================

/*
-- Check for UUID mismatch policies (should be empty)
SELECT policyname
FROM pg_policies
WHERE tablename = 'orders'
  AND (with_check ILIKE '%auth.uid()%' OR qual ILIKE '%auth.uid()%')
  AND policyname LIKE '%gig%worker%';

-- List remaining policies (should be minimal)
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;
*/
