-- =====================================================================
-- 2026-04-23 — Force sme_stores Schema Cache Refresh
-- 
-- Problem: Supabase's PostgREST schema cache doesn't recognize the
--          newly added columns (logo_url, draft_data) on the sme_stores 
--          table, causing the "Launch Online Store" button to fail with:
--          "Could not find 'logo_url' column of 'sme_stores' in schema cache"
--
-- Root Cause: Previous migrations added these columns but didn't trigger
--             a cache refresh in Supabase's PostgREST API.
--
-- Solution:
--   1. Re-apply all column additions to ensure they exist
--   2. Run ANALYZE to force schema cache refresh
--   3. Ensure all RLS policies are correct and clean
-- =====================================================================

-- Step 1: Ensure ALL required columns exist on sme_stores
-- (idempotent — IF NOT EXISTS means we can safely re-run)
ALTER TABLE public.sme_stores
  ADD COLUMN IF NOT EXISTS store_slug   text,
  ADD COLUMN IF NOT EXISTS logo_url     text,
  ADD COLUMN IF NOT EXISTS draft_data   jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Step 2: Create unique indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS sme_stores_store_slug_unique
  ON public.sme_stores (store_slug)
  WHERE store_slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sme_stores_owner_unique
  ON public.sme_stores (owner_user_id);

-- Step 3: Backfill any missing store_slug values
UPDATE public.sme_stores
  SET store_slug = LOWER(
    REGEXP_REPLACE(
      COALESCE(brand_name, 'store-' || id::text),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  )
  WHERE store_slug IS NULL OR store_slug = '';

-- Step 4: ANALYZE the table to update query planner statistics
-- This signals to PostgREST that the schema has changed
ANALYZE public.sme_stores;

-- Step 5: Ensure RLS is enabled
ALTER TABLE public.sme_stores ENABLE ROW LEVEL SECURITY;

-- Step 6: Clean up any conflicting RLS policies
DROP POLICY IF EXISTS "sme_stores public read"        ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner insert"       ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner update"       ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner delete"       ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_select_public"      ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_insert_own"         ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_update_own"         ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_delete_own"         ON public.sme_stores;
DROP POLICY IF EXISTS "Public can view stores"        ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can view own store"     ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can insert own store"   ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can update own store"   ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can delete own store"   ON public.sme_stores;

-- Step 7: Create canonical RLS policies (clean, single set)
CREATE POLICY "sme_stores_select_public"
  ON public.sme_stores
  FOR SELECT
  USING (true);

CREATE POLICY "sme_stores_insert_own"
  ON public.sme_stores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "sme_stores_update_own"
  ON public.sme_stores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "sme_stores_delete_own"
  ON public.sme_stores
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- =====================================================================
-- FINAL VERIFICATION QUERY
-- After running this migration, check that the columns exist:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sme_stores'
-- ORDER BY ordinal_position;
-- =====================================================================

-- =====================================================================
-- After running this migration in Supabase:
--   1. Click "Run" in SQL Editor and wait for "Query executed"
--   2. Close the SQL Editor tab
--   3. Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)
--   4. Return to Storefront Builder
--   5. Click "🚀 LAUNCH ONLINE STORE" — it should now work immediately
-- =====================================================================
