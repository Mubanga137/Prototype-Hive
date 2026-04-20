-- =====================================================================
-- 2026-04-21 — Force Supabase Schema Cache Refresh
-- 
-- Problem: Supabase's PostgREST schema cache hasn't recognized the
--          newly added columns (description, duration, location_type)
--          on hive_catalogue table added by previous migrations.
--
-- Solution: Re-apply the column additions (idempotent with IF NOT EXISTS)
--           and then use ANALYZE to force a schema cache refresh.
-- =====================================================================

-- Step 1: Ensure all required columns exist on hive_catalogue
ALTER TABLE public.hive_catalogue
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS duration       text,
  ADD COLUMN IF NOT EXISTS location_type  text,
  ADD COLUMN IF NOT EXISTS stock_quantity integer;

-- Step 2: ANALYZE the table to update statistics and trigger cache refresh
ANALYZE public.hive_catalogue;

-- Step 3: Also refresh the sme_stores table cache
ALTER TABLE public.sme_stores
  ADD COLUMN IF NOT EXISTS store_slug text,
  ADD COLUMN IF NOT EXISTS logo_url   text,
  ADD COLUMN IF NOT EXISTS draft_data jsonb;

ANALYZE public.sme_stores;

-- =====================================================================
-- After running this in the SQL Editor:
-- 1. Click "Run"
-- 2. Wait for "Query executed" confirmation
-- 3. Close the SQL Editor tab
-- 4. Hard refresh your browser (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac)
-- 5. Try the Storefront Builder again - error should be gone
-- =====================================================================
