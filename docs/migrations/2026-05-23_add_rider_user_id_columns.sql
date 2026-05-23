-- =====================================================================
-- Add Proper UUID Columns for Rider and Runner User Tracking
-- Issue: rider_id and runner_id are BIGINT (system IDs), but we need to track
--        which auth users are assigned to orders. This requires separate UUID columns.
-- =====================================================================

-- STEP 1: Add UUID columns to track rider and runner users
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS rider_user_id UUID,
ADD COLUMN IF NOT EXISTS runner_user_id UUID;

-- STEP 2: Add foreign key constraints (if auth.users exists)
ALTER TABLE public.orders
ADD CONSTRAINT orders_rider_user_id_fkey 
  FOREIGN KEY (rider_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
ADD CONSTRAINT orders_runner_user_id_fkey 
  FOREIGN KEY (runner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  ON UPDATE CASCADE;

-- STEP 3: Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_rider_user_id ON public.orders(rider_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_runner_user_id ON public.orders(runner_user_id);

-- STEP 4: Now safe RLS policies can be added that compare UUID to UUID
CREATE POLICY IF NOT EXISTS "gig_riders_can_claim_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  status = 'processing'
  AND rider_user_id IS NULL
  AND runner_user_id IS NULL
)
WITH CHECK (
  status = 'assigned'
  AND (rider_user_id = auth.uid() OR runner_user_id = auth.uid())
);

CREATE POLICY IF NOT EXISTS "gig_riders_can_update_assigned_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  (rider_user_id = auth.uid() OR runner_user_id = auth.uid())
  AND status IN ('assigned', 'in_transit')
)
WITH CHECK (
  (rider_user_id = auth.uid() OR runner_user_id = auth.uid())
  AND status IN ('in_transit', 'delivered')
);

-- STEP 5: Refresh schema
ANALYZE public.orders;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

/*
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('rider_user_id', 'runner_user_id')
ORDER BY column_name;
*/
