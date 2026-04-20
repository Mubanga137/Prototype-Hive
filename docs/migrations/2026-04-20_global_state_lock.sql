-- =====================================================================
-- 2026-04-20 — Global State Lock migration
-- Run this in the Supabase SQL Editor for project cnaajzmbkisybwnjeiie.
--
-- Fixes:
--   1. RLS on sme_stores blocking authenticated vendors from creating
--      / updating their own store row (root cause of "Sign in to manage
--      storefront" overlay despite a valid session).
--   2. Adds draft_data jsonb for the autosave system on
--      /retailer-studio/storefront.
--   3. Adds stock_quantity int on hive_catalogue (canonical inventory
--      column for the Hybrid Inventory Engine). Backfilled from
--      legacy stock_count.
--   4. Ensures store_slug + logo_url exist (used by app code today).
-- =====================================================================

-- ---------- sme_stores: missing columns ------------------------------
alter table public.sme_stores
  add column if not exists store_slug   text,
  add column if not exists logo_url     text,
  add column if not exists draft_data   jsonb not null default '{}'::jsonb;

create unique index if not exists sme_stores_store_slug_key
  on public.sme_stores (store_slug)
  where store_slug is not null;

-- ---------- sme_stores: RLS ------------------------------------------
alter table public.sme_stores enable row level security;

-- Wipe any legacy policies so the new set is canonical.
drop policy if exists "Public can view stores"          on public.sme_stores;
drop policy if exists "Owners can view own store"       on public.sme_stores;
drop policy if exists "Owners can insert own store"     on public.sme_stores;
drop policy if exists "Owners can update own store"     on public.sme_stores;
drop policy if exists "Owners can delete own store"     on public.sme_stores;
drop policy if exists "sme_stores_select_public"        on public.sme_stores;
drop policy if exists "sme_stores_insert_own"           on public.sme_stores;
drop policy if exists "sme_stores_update_own"           on public.sme_stores;
drop policy if exists "sme_stores_delete_own"           on public.sme_stores;

-- Public storefronts are browsable by anyone (anon + authenticated).
create policy "sme_stores_select_public"
  on public.sme_stores
  for select
  using (true);

-- Vendors can only insert a row they own.
create policy "sme_stores_insert_own"
  on public.sme_stores
  for insert
  to authenticated
  with check (auth.uid() = owner_user_id);

-- Vendors can only update their own row.
create policy "sme_stores_update_own"
  on public.sme_stores
  for update
  to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Vendors can delete their own row (rare, but symmetric).
create policy "sme_stores_delete_own"
  on public.sme_stores
  for delete
  to authenticated
  using (auth.uid() = owner_user_id);

-- ---------- hive_catalogue: stock_quantity ---------------------------
alter table public.hive_catalogue
  add column if not exists stock_quantity integer;

-- Backfill from legacy stock_count where missing.
update public.hive_catalogue
   set stock_quantity = coalesce(stock_quantity, stock_count, 0)
 where stock_quantity is null;

-- Default 0 going forward, not null.
alter table public.hive_catalogue
  alter column stock_quantity set default 0,
  alter column stock_quantity set not null;
