# CRITICAL: Supabase RLS Policies for Gig Radar

## Overview
The Gig Radar page is currently blocked by insufficient Row Level Security (RLS) policies. Gig workers cannot read or update orders because the RLS policies only allow:
- Customers (buyers) to read/update their own orders
- Store owners (SMEs) to read/update their store's orders

**Gig workers are not covered by any policy**, so all operations fail silently or with 401/403 errors.

## Required Changes

### 1. Add RLS Policy for Gig Workers to READ Orders (Required for Clustering)

Execute this SQL in your Supabase SQL Editor:

```sql
-- Policy: Gig workers can read orders with status 'processing'
-- Purpose: Allows riders/runners to see available orders for clustering and batch creation
create policy "gig_workers_can_read_processing_orders"
on public.orders
for select
to authenticated
using (
  -- Check if user has a profile with role 'gig_worker'
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'gig_worker'
  )
  -- AND can only read orders with 'processing' status
  and status = 'processing'
);
```

**Why this works:**
- `to authenticated` means only logged-in users (not anonymous)
- `profile.role = 'gig_worker'` restricts to workers only
- `status = 'processing'` means they only see unassigned orders
- This allows `useOrderClustering.ts` to fetch orders successfully

---

### 2. Add RLS Policy for Gig Workers to UPDATE Orders (Required for Claiming)

Execute this SQL in your Supabase SQL Editor:

```sql
-- Policy: Gig workers can claim orders (update status and rider_id)
-- Purpose: Allows riders/runners to mark themselves as the rider for an order batch
create policy "gig_workers_can_claim_orders"
on public.orders
for update
to authenticated
using (
  -- Check if user has a profile with role 'gig_worker'
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'gig_worker'
  )
  -- AND can only update orders with 'processing' status (unassigned)
  and status = 'processing'
)
with check (
  -- After update, ensure:
  -- 1. They set themselves as the rider
  rider_id = auth.uid()
  -- 2. They move the order to 'in_transit' state
  and status = 'in_transit'
);
```

**Why this works:**
- Restricts updates to gig workers only
- Allows them to update `status` from `'processing'` → `'in_transit'`
- Allows them to set `rider_id = auth.uid()` (claiming ownership)
- The `with check` clause prevents abuse (they can't set status to anything else or claim orders they didn't set rider_id for)

---

### 3. Verify Existing Policies Don't Conflict

List existing policies on the `orders` table:

```sql
-- Check what policies currently exist
select schemaname, tablename, policyname, permissive, roles, qual, with_check
from pg_policies
where tablename = 'orders'
order by policyname;
```

You should see policies like:
- `anyone can place an order` (INSERT)
- `buyer can read own orders` (SELECT for buyers)
- `sme owner can read store orders` (SELECT for store owners)
- `sme owner can update store orders` (UPDATE for store owners)
- `gig_workers_can_read_processing_orders` ← **NEW**
- `gig_workers_can_claim_orders` ← **NEW**

**Do NOT delete the existing buyer/SME policies** — they are still needed for customers and stores.

---

### 4. Verify Table Schema Has Required Columns

Execute this to confirm the `orders` table has the columns we're using:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'orders'
  and column_name in ('id', 'status', 'rider_id', 'sme_id', 'total_price')
order by column_name;
```

Expected columns:
- `id` (integer/bigint) - order ID
- `status` (text) - currently 'processing', will be 'in_transit'
- `rider_id` (uuid/text) - the assigned gig worker's user ID
- `sme_id` (integer) - the store that owns the order
- `total_price` (numeric) - order value

If any are missing, contact your database admin.

---

### 5. Verify sme_stores Schema

The `sme_stores` table needs to have `brand_name` for batch hydration:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'sme_stores'
  and column_name in ('id', 'brand_name')
order by column_name;
```

Expected columns:
- `id` (integer) - store ID
- `brand_name` (text) - store/business name

If `brand_name` is missing, the code will fall back to `"SME #<id>"` labels.

---

## How to Apply These Changes

### Option A: Direct Supabase Dashboard (Recommended for Quick Fix)

1. Go to your Supabase project: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the policies from sections 1 and 2 above
6. Click **Run** to execute

### Option B: Via CLI (If You Have supabase-cli)

```bash
# Create a new migration file
supabase migration new add_gig_worker_rls_policies

# Edit the file in supabase/migrations/
# Add the policy SQL from sections 1 and 2

# Push to your project
supabase db push
```

---

## Testing After Applying

Once you've applied the RLS policies, test the Gig Radar flow:

1. **Login as a gig worker** (ensure profile.role = 'gig_worker')
2. **Click "Go Online"** — should allow location + start fetching batches
3. **Check browser console** (F12 → Console tab) for errors
4. **Bottom panel should show "Route Batches"** with actual orders (if any exist with status='processing')
5. **Click on a batch** → should be able to claim it without errors

### Debugging If Still Failing

If you still see errors after applying policies, check:

```sql
-- Check if user has gig_worker role
select user_id, role, full_name
from public.profiles
where user_id = auth.uid()
limit 1;

-- Check if processing orders exist
select id, status, sme_id, total_price, rider_id
from public.orders
where status = 'processing'
limit 5;

-- Check RLS policies are created
select policyname, qual, with_check
from pg_policies
where tablename = 'orders'
  and policyname like 'gig_worker%';
```

---

## Important Notes

### CORS / API Keys
You mentioned concerns about CORS. Supabase handles CORS via:
- **Anon key** (public): Used for anonymous/unauthenticated queries
  - Only works on tables with `RLS disabled` OR with policies allowing public access
  - Your anon key is already correct in the code

- **Service Role key** (secret): Used for admin queries
  - Never put this in frontend code
  - Only use on backend/edge functions

**You don't need to set up CORS lists** in Supabase. The anon key + RLS policies control access.

### Token Validation Errors
Once RLS is fixed:
- Sessions will be validated via Supabase auth automatically
- The client-side code already handles refresh token issues
- If you see "Invalid JWT token" or "Refresh token not found" errors, it means the session expired — user needs to log in again

### What This Doesn't Fix (Already Code Issues)
1. ✅ SME location syncing → Fixed by using random offsets as proxy
2. ✅ SME name hydration → Fixed by using `brand_name` column
3. ✅ `profile.id` missing → Fixed by using `user.id` instead
4. ✅ RLS policies blocking reads → **This document fixes it**
5. ❌ Clustering uses synthetic coordinates — by design (would need real delivery data)
6. ❌ Orders don't have real destination addresses — would need order detail schema update

---

## Summary

**Three new RLS policies are REQUIRED:**
1. Gig workers can SELECT from orders where status='processing'
2. Gig workers can UPDATE orders to claim them (status='processing' → 'in_transit', set rider_id)
3. sme_stores remains publicly readable (already in place)

**Code fixes already applied:**
1. ✅ useOrderClustering.ts now uses synthetic SME locations
2. ✅ useOrderClustering.ts now uses brand_name (correct column)
3. ✅ GigRadar.tsx now uses user.id instead of profile.id

**Next steps:**
1. Apply the SQL policies above in Supabase dashboard
2. Verify your user has role='gig_worker' in profiles table
3. Test Gig Radar flow again
4. Check browser console for any remaining errors
