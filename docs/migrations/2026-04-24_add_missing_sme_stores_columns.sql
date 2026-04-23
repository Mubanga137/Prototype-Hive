-- =====================================================================
-- 2026-04-24 — Add Missing sme_stores Columns (CRITICAL FIX)
-- 
-- Problem: The columns logo_url, draft_data, and store_slug don't exist
--          in the sme_stores table, causing:
--          "[ensureStore] could not create store: column sme_stores.logo_url does not exist"
--
-- This migration MUST be run in Supabase SQL Editor to fix the error.
-- =====================================================================

-- Step 1: Add all missing columns to sme_stores
-- These are IDEMPOTENT — safe to re-run
ALTER TABLE public.sme_stores
  ADD COLUMN IF NOT EXISTS store_slug   text UNIQUE,
  ADD COLUMN IF NOT EXISTS logo_url     text,
  ADD COLUMN IF NOT EXISTS draft_data   jsonb DEFAULT '{}'::jsonb;

-- Step 2: Backfill store_slug for existing rows (if any)
-- Generate slugs from brand_name if store_slug is NULL
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

-- Step 3: Ensure draft_data defaults to empty JSON for all rows
UPDATE public.sme_stores
SET draft_data = COALESCE(draft_data, '{}'::jsonb)
WHERE draft_data IS NULL;

-- Step 4: Create unique index on store_slug
-- (handles NULL values gracefully with WHERE clause)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sme_stores_store_slug
  ON public.sme_stores (store_slug)
  WHERE store_slug IS NOT NULL;

-- Step 5: Create index on owner_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sme_stores_owner_user_id
  ON public.sme_stores (owner_user_id);

-- Step 6: Verify RLS is enabled
ALTER TABLE public.sme_stores ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop all existing policies (clean slate)
DROP POLICY IF EXISTS "sme_stores public read"           ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner insert"          ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner update"          ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner delete"          ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_select_public"         ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_insert_own"            ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_update_own"            ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_delete_own"            ON public.sme_stores;
DROP POLICY IF EXISTS "Public can view stores"           ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can view own store"        ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can insert own store"      ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can update own store"      ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can delete own store"      ON public.sme_stores;

-- Step 8: Create single, clean set of RLS policies
-- Public read: anyone can browse storefronts
CREATE POLICY "sme_stores_select_public"
  ON public.sme_stores
  FOR SELECT
  USING (true);

-- Authenticated insert: can only insert your own store
CREATE POLICY "sme_stores_insert_own"
  ON public.sme_stores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- Authenticated update: can only update your own store
CREATE POLICY "sme_stores_update_own"
  ON public.sme_stores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Authenticated delete: can only delete your own store
CREATE POLICY "sme_stores_delete_own"
  ON public.sme_stores
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- Step 9: Force schema cache refresh
ANALYZE public.sme_stores;

-- =====================================================================
-- VERIFICATION
-- After running this, verify columns exist with:
-- 
-- SELECT column_name, data_type 
-- FROM information_schema.columns
-- WHERE table_name = 'sme_stores'
-- ORDER BY ordinal_position;
-- 
-- You should see: store_slug, logo_url, draft_data
-- =====================================================================

-- =====================================================================
-- INSTRUCTIONS TO APPLY THIS MIGRATION:
--
-- 1. Go to https://app.supabase.com
-- 2. Select your project (cnaajzmbkisybwnjeiie)
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "New Query" (or the "+" button)
-- 5. Copy and paste THIS ENTIRE SQL FILE into the editor
-- 6. Click "Run" at the top right (or press Ctrl+Enter)
-- 7. Wait for "Query executed" message (should be green)
-- 8. Close the SQL Editor tab
-- 9. Hard refresh your browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
-- 10. Go back to the Storefront Builder page
-- 11. Try clicking "🚀 LAUNCH ONLINE STORE" or "Add Offer"
-- 12. Error should be gone and button should work instantly
-- =====================================================================
