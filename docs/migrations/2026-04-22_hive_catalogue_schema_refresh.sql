-- =====================================================================
-- 2026-04-22 — Force hive_catalogue Schema Cache Refresh
-- 
-- Problem: Supabase's PostgREST schema cache doesn't recognize the
--          newly added columns (description, duration, location_type,
--          stock_quantity) on the hive_catalogue table, causing inserts
--          to fail when including these fields.
--
-- Solution: 
--   1. Re-apply all column additions to ensure they exist
--   2. Run ANALYZE to update query planner stats
--   3. Trigger a full schema cache refresh in PostgREST
-- =====================================================================

-- Step 1: Ensure ALL required columns exist on hive_catalogue
-- (idempotent — IF NOT EXISTS means we can safely re-run)
ALTER TABLE public.hive_catalogue
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS duration       text,
  ADD COLUMN IF NOT EXISTS location_type  text,
  ADD COLUMN IF NOT EXISTS stock_quantity integer;

-- Step 2: Set defaults and backfill for stock_quantity
ALTER TABLE public.hive_catalogue
  ALTER COLUMN stock_quantity SET DEFAULT 0;

UPDATE public.hive_catalogue
  SET stock_quantity = COALESCE(stock_quantity, stock_count, 0)
  WHERE stock_quantity IS NULL OR stock_quantity = 0;

-- Step 3: ANALYZE the table to update statistics
-- This signals to PostgREST that the schema has changed
ANALYZE public.hive_catalogue;

-- Step 4: Also ensure RLS is enabled on hive_catalogue
-- (required for the security policies to take effect)
ALTER TABLE public.hive_catalogue ENABLE ROW LEVEL SECURITY;

-- Step 5: Clean up any duplicate or conflicting RLS policies
DROP POLICY IF EXISTS "Public can read hive_catalogue"     ON public.hive_catalogue;
DROP POLICY IF EXISTS "Users can read all offers"          ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue public read"              ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner insert"             ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner update"             ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner delete"             ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue_public_read"              ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue_owner_insert"             ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue_owner_update"             ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue_owner_delete"             ON public.hive_catalogue;

-- Step 6: Re-create the canonical RLS policies
CREATE POLICY "catalogue_public_read"
  ON public.hive_catalogue FOR SELECT
  USING (true);

CREATE POLICY "catalogue_owner_insert"
  ON public.hive_catalogue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sme_stores s
      WHERE s.id = hive_catalogue.sme_id
        AND s.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "catalogue_owner_update"
  ON public.hive_catalogue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sme_stores s
      WHERE s.id = hive_catalogue.sme_id
        AND s.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sme_stores s
      WHERE s.id = hive_catalogue.sme_id
        AND s.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "catalogue_owner_delete"
  ON public.hive_catalogue FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sme_stores s
      WHERE s.id = hive_catalogue.sme_id
        AND s.owner_user_id = auth.uid()
    )
  );

-- =====================================================================
-- After running this migration:
--   1. In Supabase SQL Editor: Click "Run" and wait for "Query executed"
--   2. Close the SQL Editor tab
--   3. Hard refresh your browser (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac)
--   4. Go to Storefront Builder and click "Add Offer" or "Create your first offer"
--   5. The form should now submit successfully
-- =====================================================================
