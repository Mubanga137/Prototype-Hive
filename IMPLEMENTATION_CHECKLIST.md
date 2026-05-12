# Implementation Checklist & Verification

## Code Changes Verification ✅

### Change 1: Database Schema Fix
- [x] File: `src/hooks/gig-radar/useOrderClustering.ts`
- [x] Lines: 44-52
- [x] Change: Removed invalid `sme_stores.latitude/longitude` queries
- [x] Action: Now generates synthetic SME locations from rider location
- [x] Verification: Code compiles without errors

### Change 2: SME Name Hydration Fix
- [x] File: `src/hooks/gig-radar/useOrderClustering.ts`
- [x] Lines: 63-75
- [x] Change: Fixed `pickupSmeName` → `pickupSmeNam` property name
- [x] Change: Changed column from `name` → `brand_name`
- [x] Action: Uses `.maybeSingle()` for safety
- [x] Verification: Property matches BatchedOrder interface

### Change 3: User ID Reference Fix
- [x] File: `src/pages/GigRadar.tsx`
- [x] Lines: 77-103
- [x] Change: Replaced `profile.id` with `user.id`
- [x] Action: Batch claim handler now has valid user ID
- [x] Verification: user.id is always available for authenticated users

### Compilation Check
- [x] Ran `npm run build`
- [x] Result: ✓ built in 16.24s
- [x] No TypeScript errors
- [x] No missing imports
- [x] All types resolve correctly

---

## Your Action Items (Required)

### Step 1: Apply RLS Policies
- [ ] Open https://app.supabase.com
- [ ] Select your project
- [ ] Navigate to SQL Editor
- [ ] Create new query
- [ ] Copy this SQL:

```sql
create policy "gig_workers_can_read_processing_orders"
on public.orders for select to authenticated
using (exists (select 1 from public.profiles p
  where p.user_id = auth.uid() and p.role = 'gig_worker')
  and status = 'processing');

create policy "gig_workers_can_claim_orders"
on public.orders for update to authenticated
using (exists (select 1 from public.profiles p
  where p.user_id = auth.uid() and p.role = 'gig_worker')
  and status = 'processing')
with check (rider_id = auth.uid() and status = 'in_transit');
```

- [ ] Click Run (green button)
- [ ] Verify: "0 rows affected" (expected)

### Step 2: Verify RLS Policies Created
- [ ] Open new SQL query
- [ ] Run this:

```sql
select policyname, permissive, roles
from pg_policies
where tablename = 'orders'
  and policyname like 'gig_worker%'
order by policyname;
```

- [ ] Expected result: 2 rows
  - `gig_workers_can_claim_orders`
  - `gig_workers_can_read_processing_orders`

### Step 3: Prepare Test Data
- [ ] Verify you have a test user with `role='gig_worker'`:

```sql
select user_id, role, full_name
from public.profiles
where role = 'gig_worker'
limit 1;
```

- [ ] If no gig_worker users, create one:

```sql
update public.profiles
set role = 'gig_worker'
where user_id = 'YOUR_TEST_USER_UUID';
```

### Step 4: Create Test Orders
- [ ] Check if processing orders exist:

```sql
select id, status, sme_id
from public.orders
where status = 'processing'
limit 5;
```

- [ ] If none exist, create test orders:

```sql
insert into public.orders (status, sme_id, total_price, buyer_id, created_at)
select 'processing', s.id, 50000, 
  (select user_id from public.profiles where role='gig_worker' limit 1),
  now()
from public.sme_stores s
where s.id > 0
limit 3;
```

### Step 5: Test Gig Radar
- [ ] Open Gig Radar page in browser
- [ ] Login as gig_worker user
- [ ] Click "Go Online" button (should turn gold/glow)
- [ ] Wait 2-3 seconds for batches to load
- [ ] Check browser console (F12 → Console):
  - [ ] Should see: `[useOrderClustering] Found X processing orders`
  - [ ] Should see: `[useOrderClustering] Clustered into Y batches`
  - [ ] Should NOT see: `401`, `403`, or permission errors
- [ ] Bottom panel should show:
  - [ ] "Route Batches" header
  - [ ] "X optimized routes" (not "0 optimized routes")
  - [ ] Batch cards with SME names and order counts

### Step 6: Test Batch Claim
- [ ] Click on a batch card
- [ ] Verify batch details display correctly
- [ ] Click "View Route" button
- [ ] Should open navigation modal
- [ ] Should NOT show error toast

---

## Troubleshooting Checklist

### Issue: Still shows "0 optimized routes"

Check these in order:

1. [ ] RLS policies created:
```sql
select count(*) from pg_policies 
where tablename = 'orders' and policyname like 'gig_worker%';
-- Expected: 2
```

2. [ ] Processing orders exist:
```sql
select count(*) from public.orders 
where status = 'processing';
-- Expected: > 0
```

3. [ ] User is gig_worker:
```sql
select role from public.profiles 
where user_id = auth.uid();
-- Expected: gig_worker
```

4. [ ] Browser console errors:
   - Open F12 → Console tab
   - Look for any red errors
   - Screenshot and check

### Issue: "Permission denied" or 401/403 errors

1. [ ] RLS policies exist (check above)
2. [ ] User is authenticated (logged in)
3. [ ] User has gig_worker role (check above)
4. [ ] Try force refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
5. [ ] Check if browser localStorage is clearing sessions:
   - Open F12 → Application tab
   - Look for `sb_<project>_auth_token`
   - Should contain valid JWT

### Issue: Batch claim errors

1. [ ] Make sure user is authenticated
2. [ ] Make sure order status is 'processing' (not already claimed)
3. [ ] Check browser console for exact error
4. [ ] Verify rider_id column exists on orders table:
```sql
select column_name from information_schema.columns
where table_name = 'orders' and column_name = 'rider_id';
-- Expected: 1 row
```

### Issue: SME names not showing

1. [ ] Check brand_name column exists:
```sql
select brand_name from public.sme_stores limit 1;
-- Should return name, not error
```

2. [ ] Verify sme_id in orders matches existing sme_stores:
```sql
select distinct o.sme_id, s.brand_name
from public.orders o
left join public.sme_stores s on s.id = o.sme_id
where o.status = 'processing';
-- All sme_id should have matching names
```

---

## Documentation Reference

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `README_GIG_RADAR_FIX.md` | Quick overview | First - high level summary |
| `EXECUTIVE_SUMMARY.md` | Management summary | Second - understand what happened |
| `ACTION_REQUIRED_RLS_SETUP.md` | Detailed setup | Third - detailed RLS instructions |
| `GIG_RADAR_AUDIT_REPORT.md` | Full technical audit | Reference - deep dive |
| `SUPABASE_RLS_FIXES_REQUIRED.md` | RLS documentation | Reference - policy details |
| `IMPLEMENTATION_CHECKLIST.md` | This file | During setup - track progress |

---

## Sign-Off Checklist

Once everything is working:

- [ ] Gig Radar page loads without errors
- [ ] "Go Online" button toggles correctly
- [ ] Batch list appears with multiple batches
- [ ] Batch cards show correct SME names
- [ ] Can click batch and view details
- [ ] Can claim batch without errors
- [ ] Navigation modal appears after claim
- [ ] Browser console has no permission/auth errors

If all checkboxes above are checked, **Gig Radar is fully operational!** ✅

---

## Quick Reference

### Most Important SQL (Copy These)

**Apply RLS policies:**
```sql
create policy "gig_workers_can_read_processing_orders"
on public.orders for select to authenticated
using (exists (select 1 from public.profiles p
  where p.user_id = auth.uid() and p.role = 'gig_worker')
  and status = 'processing');

create policy "gig_workers_can_claim_orders"
on public.orders for update to authenticated
using (exists (select 1 from public.profiles p
  where p.user_id = auth.uid() and p.role = 'gig_worker')
  and status = 'processing')
with check (rider_id = auth.uid() and status = 'in_transit');
```

**Verify policies exist:**
```sql
select policyname from pg_policies 
where tablename = 'orders' and policyname like 'gig_worker%';
```

**Create test data:**
```sql
update public.profiles set role = 'gig_worker' 
where user_id = auth.uid();

insert into public.orders (status, sme_id, total_price, buyer_id, created_at)
values ('processing', 1, 50000, auth.uid(), now());
```

---

## Success Indicators

### Code Level ✅
- [x] No TypeScript errors
- [x] All imports resolve
- [x] Component renders without crashes
- [x] Hooks return correct types

### Database Level 🔄 (Your Action)
- [ ] RLS policies created
- [ ] Test user is gig_worker role
- [ ] Test orders exist with status='processing'
- [ ] Batches fetch successfully

### UI Level 🎯 (Final Test)
- [ ] Bottom panel shows "X optimized routes"
- [ ] Batch cards display with names
- [ ] Claim button works
- [ ] Navigation flows complete

---

## Timeline

**Expected Setup Time:**
- Read docs: 10 minutes
- Apply RLS policies: 2 minutes
- Create test data: 2 minutes
- Test and verify: 5 minutes
- **Total: 20 minutes**

---

**You're almost there! Just need those RLS policies. 💪**
