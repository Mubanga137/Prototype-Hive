-- =====================================================================
-- HARDENED FIX: UUID Tracking Columns Setup & Secure Access Controls
-- Issue: Enforces Server-Side Authority over order claiming and delivery states.
-- =====================================================================

-- STEP 1: Add UUID columns to track rider and runner users cleanly
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS rider_user_id UUID,
ADD COLUMN IF NOT EXISTS runner_user_id UUID;

-- STEP 2: Add foreign key constraints to ensure user integrity
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_rider_user_id_fkey,
DROP CONSTRAINT IF EXISTS orders_runner_user_id_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_rider_user_id_fkey
  FOREIGN KEY (rider_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE public.orders
ADD CONSTRAINT orders_runner_user_id_fkey
  FOREIGN KEY (runner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  ON UPDATE CASCADE;

-- STEP 3: Create optimized indexes for fast lookups in GigRadar
CREATE INDEX IF NOT EXISTS idx_orders_rider_user_id ON public.orders(rider_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_runner_user_id ON public.orders(runner_user_id);

-- STEP 4: Lock down client-side mutations (Drop unsafe direct UPDATE policies)
DROP POLICY IF EXISTS "gig_riders_can_claim_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_riders_can_update_assigned_orders" ON public.orders;

-- 4A. Allow riders/runners to view active or assigned orders safely without editing them
DROP POLICY IF EXISTS "gig_workers_can_view_orders" ON public.orders;
CREATE POLICY "gig_workers_can_view_orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  status = 'processing'
  OR rider_user_id = auth.uid()
  OR runner_user_id = auth.uid()
);

-- STEP 5: Re-optimize database execution metrics
ANALYZE public.orders;

-- =====================================================================
-- UNHACKABLE GIG WORKER CLAIM FUNCTION (RPC)
-- Prevents double-claiming race conditions and enforces state logic
-- =====================================================================
CREATE OR REPLACE FUNCTION claim_delivery_order(
    p_order_uuid_token UUID
) RETURNS JSON AS $$
DECLARE
    v_current_rider UUID;
    v_order_status TEXT;
BEGIN
    -- 1. Grab current authenticated user ID on the server side
    v_current_rider := auth.uid();

    IF v_current_rider IS NULL THEN
        RETURN json_build_object('success', false, 'reason', 'UNAUTHORIZED_ACCESS');
    END IF;

    -- 2. Lock the specific row immediately to prevent concurrent race conditions
    SELECT rider_user_id, status INTO v_current_rider, v_order_status
    FROM orders
    WHERE tracking_token = p_order_uuid_token
    FOR UPDATE; -- Critical: Freezes row until transaction completes

    -- 3. Validate eligibility
    IF v_order_status != 'processing' THEN
        RETURN json_build_object('success', false, 'reason', 'ORDER_ALREADY_CLAIMED_OR_INACTIVE');
    END IF;

    -- 4. Execute atomic state mutation
    UPDATE orders
    SET
        rider_user_id = auth.uid(),
        status = 'in_transit'
    WHERE tracking_token = p_order_uuid_token;

    RETURN json_build_object('success', true, 'new_status', 'in_transit');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated riders
GRANT EXECUTE ON FUNCTION claim_delivery_order(UUID) TO authenticated;
