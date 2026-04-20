-- ============================================================
-- Hive · Checkout & WhatsApp Handoff — orders table extension
-- Run in Supabase SQL editor. Idempotent.
-- ============================================================

-- 1) Add the columns the storefront checkout drawer writes to.
alter table public.orders
  add column if not exists store_id          bigint,
  add column if not exists offer_id          bigint,
  add column if not exists item_type         text,
  add column if not exists quantity          integer default 1,
  add column if not exists total_amount      numeric(12,2),
  add column if not exists customer_name     text,
  add column if not exists customer_phone    text,
  add column if not exists delivery_address  text,
  add column if not exists scheduled_date    date,
  add column if not exists service_notes     text,
  add column if not exists otp_code          text;

-- 2) FKs (best-effort — only added if the parent tables exist).
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'sme_stores') then
    begin
      alter table public.orders
        add constraint orders_store_id_fkey
        foreign key (store_id) references public.sme_stores(id) on delete set null;
    exception when duplicate_object then null; end;
  end if;

  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'hive_catalogue') then
    begin
      alter table public.orders
        add constraint orders_offer_id_fkey
        foreign key (offer_id) references public.hive_catalogue(id) on delete set null;
    exception when duplicate_object then null; end;
  end if;
end$$;

-- 3) Helpful indexes for the SME order feed.
create index if not exists idx_orders_store_id   on public.orders(store_id);
create index if not exists idx_orders_sme_id     on public.orders(sme_id);
create index if not exists idx_orders_status     on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- 4) RLS — let any visitor (anon or signed-in) place an order;
--    only the owning SME and the buyer can read it back.
alter table public.orders enable row level security;

drop policy if exists "anyone can place an order" on public.orders;
create policy "anyone can place an order"
on public.orders for insert
to anon, authenticated
with check (true);

drop policy if exists "buyer can read own orders" on public.orders;
create policy "buyer can read own orders"
on public.orders for select
to authenticated
using (buyer_id = auth.uid());

drop policy if exists "sme owner can read store orders" on public.orders;
create policy "sme owner can read store orders"
on public.orders for select
to authenticated
using (
  exists (
    select 1 from public.sme_stores s
    where s.id = orders.store_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "sme owner can update store orders" on public.orders;
create policy "sme owner can update store orders"
on public.orders for update
to authenticated
using (
  exists (
    select 1 from public.sme_stores s
    where s.id = orders.store_id
      and s.owner_user_id = auth.uid()
  )
);
