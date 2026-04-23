-- =====================================================================
-- 2026-04-21 — Fix conflicting RLS policies (policy naming mismatch)
--
-- Problem: 
--   - 2026-04-16 created policies named "sme_stores public read", etc.
--   - 2026-04-20 tried to drop "sme_stores_select_public" (different names!)
--   - Result: BOTH policy sets are active, causing RLS violations
--
-- Solution: Drop all conflicting policies and create a single, clean set
-- =====================================================================

-- Drop ALL policies on sme_stores (both naming conventions)
DROP POLICY IF EXISTS "sme_stores public read"       ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner insert"      ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner update"      ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores owner delete"      ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_select_public"     ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_insert_own"        ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_update_own"        ON public.sme_stores;
DROP POLICY IF EXISTS "sme_stores_delete_own"        ON public.sme_stores;
DROP POLICY IF EXISTS "Public can view stores"       ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can view own store"    ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can insert own store"  ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can update own store"  ON public.sme_stores;
DROP POLICY IF EXISTS "Owners can delete own store"  ON public.sme_stores;

-- Ensure RLS is enabled
ALTER TABLE public.sme_stores ENABLE ROW LEVEL SECURITY;

-- Create clean, canonical policy set
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

-- Also clean up hive_catalogue policies (same issue may exist)
DROP POLICY IF EXISTS "catalogue public read"        ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner insert"       ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner update"       ON public.hive_catalogue;
DROP POLICY IF EXISTS "catalogue owner delete"       ON public.hive_catalogue;

ALTER TABLE public.hive_catalogue ENABLE ROW LEVEL SECURITY;

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
