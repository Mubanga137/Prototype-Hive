-- =====================================================================
-- FINAL ORDERS TABLE SCHEMA VALIDATION
-- Ensures orders table has ONLY the necessary columns
-- No extra columns like "title" that cause errors
-- =====================================================================

-- STEP 1: Drop any columns that shouldn't exist in orders table
-- These should only exist in sme_notifications
ALTER TABLE public.orders
DROP COLUMN IF EXISTS title;

-- STEP 2: Ensure all required columns exist and have correct types
-- Do this safely with IF NOT EXISTS checks

DO $$
BEGIN
  -- Core columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='id') THEN
    -- Table doesn't have id, which means it doesn't exist - unlikely but safe
    NULL;
  END IF;

  -- Buyer/Customer Info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='buyer_id') THEN
    ALTER TABLE public.orders ADD COLUMN buyer_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_name') THEN
    ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_phone') THEN
    ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
  END IF;

  -- Vendor/Store Info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='sme_id') THEN
    ALTER TABLE public.orders ADD COLUMN sme_id BIGINT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='store_id') THEN
    ALTER TABLE public.orders ADD COLUMN store_id BIGINT;
  END IF;

  -- Item/Product Info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='item_id') THEN
    ALTER TABLE public.orders ADD COLUMN item_id BIGINT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='offer_id') THEN
    ALTER TABLE public.orders ADD COLUMN offer_id BIGINT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='item_type') THEN
    ALTER TABLE public.orders ADD COLUMN item_type TEXT;
  END IF;

  -- Order Details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='quantity') THEN
    ALTER TABLE public.orders ADD COLUMN quantity INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total_amount') THEN
    ALTER TABLE public.orders ADD COLUMN total_amount NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total_price') THEN
    ALTER TABLE public.orders ADD COLUMN total_price NUMERIC(12,2);
  END IF;

  -- Delivery/Service Info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_address') THEN
    ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='scheduled_date') THEN
    ALTER TABLE public.orders ADD COLUMN scheduled_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='service_notes') THEN
    ALTER TABLE public.orders ADD COLUMN service_notes TEXT;
  END IF;

  -- Order Status & Verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status') THEN
    ALTER TABLE public.orders ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='otp_code') THEN
    ALTER TABLE public.orders ADD COLUMN otp_code TEXT;
  END IF;

  -- Tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_token') THEN
    ALTER TABLE public.orders ADD COLUMN tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;
  END IF;

  -- Logistics (gig worker assignment)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='node_id') THEN
    ALTER TABLE public.orders ADD COLUMN node_id BIGINT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='rider_id') THEN
    ALTER TABLE public.orders ADD COLUMN rider_id BIGINT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='runner_id') THEN
    ALTER TABLE public.orders ADD COLUMN runner_id BIGINT;
  END IF;

  -- Pricing Breakdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='hive_skim_amount') THEN
    ALTER TABLE public.orders ADD COLUMN hive_skim_amount NUMERIC(12,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='system_fee') THEN
    ALTER TABLE public.orders ADD COLUMN system_fee NUMERIC(12,2);
  END IF;

  -- Flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='is_resold_item') THEN
    ALTER TABLE public.orders ADD COLUMN is_resold_item BOOLEAN DEFAULT false;
  END IF;

  -- Timestamps (if not auto-created)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='created_at') THEN
    ALTER TABLE public.orders ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;

END $$;

-- STEP 3: Recreate indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_sme_id ON public.orders(sme_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_item_id ON public.orders(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_otp_code ON public.orders(otp_code);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_node_id ON public.orders(node_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);

-- STEP 4: Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- STEP 5: Clear and recreate RLS policies (minimal set)
DROP POLICY IF EXISTS "allow_all_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_authenticated_read_own_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_authenticated_update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_sme_read_own_store_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_sme_update_own_store_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_read_own_orders" ON public.orders;

-- Recreate minimal policies
CREATE POLICY "allow_all_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "allow_authenticated_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

CREATE POLICY "allow_authenticated_update_own_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

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

-- STEP 6: Force schema cache refresh
ANALYZE public.orders;

-- =====================================================================
-- VERIFICATION - Run these to confirm everything is correct
-- =====================================================================
/*
-- List all columns on orders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Verify NO title column exists
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'title';
-- Should return 0

-- List all RLS policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;
*/
