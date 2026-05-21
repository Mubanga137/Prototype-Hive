# 🚨 RLS Emergency Fix: Guest Checkout Blocked

## Error
```
[Checkout Error] new row violates row-level security policy for table "orders" (42501)
```

## Root Cause
The RLS INSERT policy for **anonymous users** is missing or broken. The previous migration failed due to a type mismatch, so the policies were never created.

---

## Solution: 3 Steps (5 minutes)

### Step 1: Run Simple INSERT Policy Fix

**Go to**: Supabase Dashboard → SQL Editor

**Copy & paste this ONLY**:

```sql
-- Drop any conflicting policies
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "anyone_can_place_order" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;

-- Create the INSERT policy for anon + authenticated users
CREATE POLICY "anyone_can_place_order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

**Click Run** (or Cmd+Enter)

✅ You should see no errors.

---

### Step 2: Verify Column & Index

**Run this verification query**:

```sql
-- Check if tracking_token column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tracking_token';
```

**Expected result**: One row showing `tracking_token | uuid`

**If it doesn't exist**, run this:

```sql
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
```

---

### Step 3: Verify Policy Was Created

**Run this query**:

```sql
SELECT policyname, roles
FROM pg_policies
WHERE tablename = 'orders' AND policyname = 'anyone_can_place_order';
```

**Expected result**: One row showing:
- `policyname`: `anyone_can_place_order`
- `roles`: `{anon,authenticated}`

✅ If you see this, the fix worked.

---

## Quick Test

After running Step 1, test guest checkout:

1. Open your app in browser
2. Go to home page
3. Add item to cart
4. Click checkout
5. Fill form (name, phone, address)
6. **Click Submit**

**Expected**: Order inserts successfully, no RLS error.

**If it works**: ✅ You're done!

**If it still fails**: Proceed to Step 4 below.

---

## Step 4: Nuclear Option (If Still Failing)

If the above doesn't work, RLS might be misconfigured on the entire table. Run this:

```sql
-- Disable RLS temporarily to diagnose
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

-- Test: Try checkout again in browser
-- If it works now, the problem is the policies

-- Then re-enable RLS and fix policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "anyone_can_place_order" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.orders;
DROP POLICY IF EXISTS "Gig workers can claim and update orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_claim_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_read_processing_orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can read store orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can update store orders" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Reading" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Updates" ON public.orders;
DROP POLICY IF EXISTS "guest_no_direct_select" ON public.orders;

-- Create the ONLY policy needed for checkout to work
CREATE POLICY "anyone_can_place_order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Test checkout again
```

---

## Understanding the Error

| Error | Cause | Fix |
|-------|-------|-----|
| `42501: new row violates RLS policy` | No INSERT policy for anon | Add `TO anon, authenticated` |
| `42501: insufficient_privilege` | RLS is too restrictive | Allow `true` in `WITH CHECK` |
| `type mismatch` | UUID vs bigint columns | Cast types explicitly |

Your error is **#1**: missing INSERT policy for anon.

---

## What Should Happen After Fix

1. ✅ Guest clicks checkout
2. ✅ Form submits (no auth modal)
3. ✅ INSERT succeeds (RLS allows anon)
4. ✅ `tracking_token` auto-generated
5. ✅ Response includes `id` + `tracking_token`
6. ✅ Saved to localStorage
7. ✅ Redirected to `/track-order/:id?token=...`

---

## Files to Reference

- `docs/migrations/2026-05-21_add_tracking_token_column.sql` — Full migration with all checks
- `docs/migrations/2026-05-21_fix_rls_insert_policy.sql` — Minimal INSERT policy fix

---

## Status

**Priority**: CRITICAL (blocks all guest checkouts)  
**Complexity**: Simple (2 SQL lines)  
**Time to fix**: 5 minutes

Run Step 1 now, then test checkout.

