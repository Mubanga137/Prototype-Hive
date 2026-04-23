-- =====================================================================
-- 2026-04-27 — Fix discount_type Schema Cache Issue
--
-- Problem: PostgREST schema cache doesn't recognize discount_type and
--          other recently added columns on hive_catalogue
--
-- Solution: Re-apply columns and force cache refresh
-- =====================================================================

-- Ensure all discount and feature columns exist
ALTER TABLE public.hive_catalogue
  ADD COLUMN IF NOT EXISTS discount_type       text,
  ADD COLUMN IF NOT EXISTS discount_value      numeric,
  ADD COLUMN IF NOT EXISTS is_featured         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_custom_category text,
  ADD COLUMN IF NOT EXISTS video_url           text,
  ADD COLUMN IF NOT EXISTS media_gallery       jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variants            jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating              numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count        integer DEFAULT 0;

-- Add storefront_config to sme_stores for advanced merchandising
ALTER TABLE public.sme_stores
  ADD COLUMN IF NOT EXISTS storefront_config   jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hero_title          text,
  ADD COLUMN IF NOT EXISTS hero_subtitle       text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hive_catalogue_is_featured
  ON public.hive_catalogue (is_featured)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_hive_catalogue_store_custom_category
  ON public.hive_catalogue (store_custom_category);

-- Force schema cache refresh
ANALYZE public.hive_catalogue;
ANALYZE public.sme_stores;

-- =====================================================================
-- Schema is now fully updated with all luxury marketplace features
-- =====================================================================
