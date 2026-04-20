-- =====================================================================
-- The Hive — Storefront RLS + Slug + Storage hardening (Audit fix)
-- Apply ONCE in your Supabase SQL editor (project: cnaajzmbkisybwnjeiie).
-- Safe to re-run — every statement is idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Schema additions (idempotent — picks up what 2026-04-16 may have missed)
-- ---------------------------------------------------------------------
ALTER TABLE public.sme_stores
  ADD COLUMN IF NOT EXISTS store_slug text,
  ADD COLUMN IF NOT EXISTS logo_url   text;

ALTER TABLE public.hive_catalogue
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS duration       text,
  ADD COLUMN IF NOT EXISTS location_type  text;

-- Backfill any missing slugs
UPDATE public.sme_stores
SET store_slug = lower(regexp_replace(coalesce(brand_name, 'store-' || id::text),
                                      '[^a-zA-Z0-9]+', '-', 'g'))
WHERE store_slug IS NULL OR store_slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS sme_stores_slug_unique
  ON public.sme_stores (store_slug);

CREATE UNIQUE INDEX IF NOT EXISTS sme_stores_owner_unique
  ON public.sme_stores (owner_user_id);

-- Default item_type for legacy rows
UPDATE public.hive_catalogue
SET item_type = 'physical'
WHERE item_type IS NULL OR item_type = 'product';

-- ---------------------------------------------------------------------
-- 2. Row-Level Security on sme_stores
--    Owners can SELECT/INSERT/UPDATE/DELETE their own row.
--    Public storefront viewers can SELECT all rows (read-only).
-- ---------------------------------------------------------------------
ALTER TABLE public.sme_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sme_stores public read"      ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner insert"     ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner update"     ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner delete"     ON public.sme_stores;

CREATE POLICY "sme_stores public read"
  ON public.sme_stores FOR SELECT
  USING (true);

CREATE POLICY "sme_stores owner insert"
  ON public.sme_stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "sme_stores owner update"
  ON public.sme_stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "sme_stores owner delete"
  ON public.sme_stores FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- ---------------------------------------------------------------------
-- 3. Row-Level Security on hive_catalogue (offers)
--    Anyone can read offers. Owners can write rows for stores they own.
-- ---------------------------------------------------------------------
ALTER TABLE public.hive_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalogue public read"   ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner insert"  ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner update"  ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner delete"  ON public.hive_catalogue;

CREATE POLICY "catalogue public read"
  ON public.hive_catalogue FOR SELECT
  USING (true);

CREATE POLICY "catalogue owner insert"
  ON public.hive_catalogue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sme_stores s
      WHERE s.id = hive_catalogue.sme_id
        AND s.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "catalogue owner update"
  ON public.hive_catalogue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sme_stores s
            WHERE s.id = hive_catalogue.sme_id
              AND s.owner_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sme_stores s
            WHERE s.id = hive_catalogue.sme_id
              AND s.owner_user_id = auth.uid())
  );

CREATE POLICY "catalogue owner delete"
  ON public.hive_catalogue FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sme_stores s
            WHERE s.id = hive_catalogue.sme_id
              AND s.owner_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- 4. Storage bucket for store logos / banners / offer images
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('hive_media', 'hive_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hive_media_public_read') THEN
    CREATE POLICY hive_media_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'hive_media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hive_media_owner_write') THEN
    CREATE POLICY hive_media_owner_write ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'hive_media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hive_media_owner_update') THEN
    CREATE POLICY hive_media_owner_update ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'hive_media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hive_media_owner_delete') THEN
    CREATE POLICY hive_media_owner_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'hive_media' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- =====================================================================
-- DONE. After running:
--   1. Reload the /retailer-studio/storefront page
--   2. The app will auto-create a store row for any new user on first visit
--   3. "Save Changes" will UPSERT and never throw "Store not found"
-- =====================================================================
