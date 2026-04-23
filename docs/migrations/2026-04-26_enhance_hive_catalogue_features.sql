-- =====================================================================
-- 2026-04-26 — Enhance hive_catalogue for Advanced Features
--
-- Adds support for:
--   1. Video uploads (video_url column)
--   2. Better discount management (discount_type, discount_value)
--   3. Quantity/stock display improvements
--   4. Promo/discount variants
--   5. Product variants support (jsonb)
--
-- This migration is IDEMPOTENT — safe to re-run
-- =====================================================================

-- Add missing columns for enhanced feature support
ALTER TABLE public.hive_catalogue
  ADD COLUMN IF NOT EXISTS video_url           text,
  ADD COLUMN IF NOT EXISTS discount_type       text,
  ADD COLUMN IF NOT EXISTS discount_value      numeric,
  ADD COLUMN IF NOT EXISTS media_gallery       jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variants            jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating              numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count        integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured         boolean DEFAULT false;

-- Ensure description, duration, location_type, stock_quantity exist
-- (from previous migrations, but re-applying for safety)
ALTER TABLE public.hive_catalogue
  ADD COLUMN IF NOT EXISTS description         text,
  ADD COLUMN IF NOT EXISTS duration            text,
  ADD COLUMN IF NOT EXISTS location_type       text,
  ADD COLUMN IF NOT EXISTS stock_quantity      integer DEFAULT 0;

-- Set defaults
ALTER TABLE public.hive_catalogue
  ALTER COLUMN media_gallery SET DEFAULT '[]'::jsonb,
  ALTER COLUMN variants SET DEFAULT '[]'::jsonb;

-- Backfill rating fields if NULL
UPDATE public.hive_catalogue
SET rating = 0 WHERE rating IS NULL;

UPDATE public.hive_catalogue
SET review_count = 0 WHERE review_count IS NULL;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_hive_catalogue_sme_id
  ON public.hive_catalogue (sme_id);

CREATE INDEX IF NOT EXISTS idx_hive_catalogue_item_type
  ON public.hive_catalogue (item_type);

CREATE INDEX IF NOT EXISTS idx_hive_catalogue_is_featured
  ON public.hive_catalogue (is_featured)
  WHERE is_featured = true;

-- Force schema cache refresh
ANALYZE public.hive_catalogue;

-- =====================================================================
-- Structure for media_gallery jsonb:
-- [
--   { "type": "image", "url": "...", "alt": "..." },
--   { "type": "video", "url": "...", "thumbnail": "..." }
-- ]
--
-- Structure for variants jsonb (for bulk items):
-- [
--   { "name": "White Airforce 1s", "sku": "AFW-WHT", "quantity": 10, "price": 2500 },
--   { "name": "Black Airforce 1s", "sku": "AFB-BLK", "quantity": 8, "price": 2500 }
-- ]
--
-- Structure for discount_type:
-- - "percentage" (e.g., 20% off)
-- - "fixed" (e.g., ZMW 500 off)
-- - "none" (no discount)
-- =====================================================================
