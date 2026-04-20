-- ============================================================
-- Hive · Order Notifications — sme_notifications table + RLS
-- Run AFTER 2026-04-17_orders_checkout_fields.sql.
-- ============================================================

-- 1) The notification feed the retailer studio subscribes to over Realtime.
create table if not exists public.sme_notifications (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  sme_id      bigint,
  store_id    bigint,
  order_id    bigint,
  title       text not null,
  body        text,
  metadata    jsonb,
  is_read     boolean not null default false
);

create index if not exists idx_sme_notifications_store on public.sme_notifications(store_id);
create index if not exists idx_sme_notifications_sme   on public.sme_notifications(sme_id);
create index if not exists idx_sme_notifications_created on public.sme_notifications(created_at desc);

-- 2) RLS — only the SME owner can read / mark-read their notifications.
alter table public.sme_notifications enable row level security;

drop policy if exists "owner reads own notifications" on public.sme_notifications;
create policy "owner reads own notifications"
on public.sme_notifications for select
to authenticated
using (
  exists (
    select 1 from public.sme_stores s
    where s.id = sme_notifications.store_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "owner updates own notifications" on public.sme_notifications;
create policy "owner updates own notifications"
on public.sme_notifications for update
to authenticated
using (
  exists (
    select 1 from public.sme_stores s
    where s.id = sme_notifications.store_id
      and s.owner_user_id = auth.uid()
  )
);

-- The edge function uses the service role to insert, so no insert policy
-- for end-users is required.

-- 3) Realtime — make sure the table is in the publication.
do $$
begin
  begin
    alter publication supabase_realtime add table public.sme_notifications;
  exception when duplicate_object then null;
  end;
end$$;
