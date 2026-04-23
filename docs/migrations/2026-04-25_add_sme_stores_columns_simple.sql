-- =====================================================================
-- 2026-04-25 — Add Missing sme_stores Columns (SIMPLE VERSION)
-- 
-- This is a simplified migration focused ONLY on adding the missing
-- columns. No complex RLS or indexes — just the essential fixes.
-- =====================================================================

-- Add the missing columns one at a time (more robust)
ALTER TABLE public.sme_stores
ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.sme_stores
ADD COLUMN IF NOT EXISTS draft_data jsonb;

ALTER TABLE public.sme_stores
ADD COLUMN IF NOT EXISTS store_slug text;

-- Set defaults
ALTER TABLE public.sme_stores
ALTER COLUMN draft_data SET DEFAULT '{}'::jsonb;

-- For any existing rows, set draft_data to empty object if NULL
UPDATE public.sme_stores
SET draft_data = '{}'::jsonb
WHERE draft_data IS NULL;

-- For any existing rows, generate store_slug from brand_name if missing
UPDATE public.sme_stores
SET store_slug = 'store-' || id::text
WHERE store_slug IS NULL OR store_slug = '';

-- Force schema cache refresh
ANALYZE public.sme_stores;

-- =====================================================================
-- VERIFICATION: After running this, check if columns exist:
-- 
-- SELECT column_name, data_type 
-- FROM information_schema.columns
-- WHERE table_name = 'sme_stores'
-- ORDER BY ordinal_position;
--
-- You should see rows for:
-- - logo_url (text)
-- - draft_data (jsonb)
-- - store_slug (text)
-- =====================================================================
