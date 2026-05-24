# Guest Order Ledger - Access Denied / Not Found Error

## Problem

When a guest user tries to access `/ledger/{tracking_token}`, they see:
- "Order not found or has expired"
- 403 Forbidden (Access Denied)
- `[GuestOrderLedger] Fetch error: [object Object]`

## Root Cause

The `orders` table RLS policy doesn't allow anonymous/guest users to read orders via the `tracking_token` column.

---

## Solution: Deploy RLS Policy Fix

### Step 1: Run This SQL in Supabase SQL Editor

```sql
-- Drop old policies that don't work
DROP POLICY IF EXISTS "allow_anon_guest_read_via_tracking_token" ON public.orders;
DROP POLICY IF EXISTS "guest_can_read_order_by_tracking_token" ON public.orders;
DROP POLICY IF EXISTS "allow_guest_read_orders" ON public.orders;

-- Create new policy for guest access via tracking token
CREATE POLICY "guest_ledger_read_via_tracking_token"
ON public.orders FOR SELECT
TO anon, authenticated
USING (
  -- Allow reading if order status is not pending
  status != 'pending'
  AND created_at > now() - interval '30 days'
);

-- Ensure INSERT policy exists (for checkout)
DROP POLICY IF EXISTS "allow_insert_orders" ON public.orders;
CREATE POLICY "allow_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Ensure authenticated users can read their own orders
DROP POLICY IF EXISTS "allow_authenticated_read_own_orders" ON public.orders;
CREATE POLICY "allow_authenticated_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Refresh schema
ANALYZE public.orders;
```

### Step 2: Verify the Policies

Run this query to confirm the policies are correct:

```sql
SELECT policyname, cmd, qual 
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;
```

**Expected Result**:
```
policyname                              | cmd    | qual
allow_insert_orders                     | INSERT | true
allow_authenticated_read_own_orders     | SELECT | (buyer_id = auth.uid())
guest_ledger_read_via_tracking_token    | SELECT | (status != 'pending' AND created_at > ...)
```

---

## How It Works

1. **Guest clicks order link**: `/ledger/550e8400-e29b-41d4-a716-446655440000`
2. **Frontend executes**: 
   ```javascript
   supabase.from("orders").select(...).eq("tracking_token", trackingToken).maybeSingle()
   ```
3. **RLS policy checks**:
   - Is the user anonymous or authenticated? ✅ Yes
   - Is status != 'pending'? ✅ Yes (should be pending_payment, in_transit, or delivered)
   - Was order created within 30 days? ✅ Yes
4. **Result**: Policy allows read access ✅

---

## Troubleshooting

### Symptom: Still getting 403 Forbidden

**Check**: Is the order status still "pending"?

```sql
SELECT id, tracking_token, status 
FROM public.orders 
WHERE tracking_token = '550e8400-e29b-41d4-a716-446655440000';
```

**Fix**: The RPC or CheckoutDrawer should set status to 'pending_payment', not 'pending'.

Verify in CheckoutDrawer.tsx line ~103:
```sql
status = 'pending_payment'::TEXT,  -- ← Should be this, not 'pending'
```

### Symptom: "Order not found"

**Possible Causes**:
1. Order doesn't exist → wrong tracking token
2. Order is too old (> 30 days) → adjust the RLS policy interval
3. Order status is 'pending' → see above

**Verify**:
```sql
SELECT COUNT(*) as total_orders FROM public.orders;
SELECT COUNT(*) as non_pending FROM public.orders WHERE status != 'pending';
SELECT * FROM public.orders WHERE created_at > now() - interval '30 days' LIMIT 1;
```

### Symptom: Browser console shows "[GuestOrderLedger] Fetch error"

This is now fixed with better error logging. Check the browser console for the detailed error:

```
[GuestOrderLedger] Fetch error: {
  message: "...",
  code: "...",
  status: 403,
  ...
}
```

Common codes:
- `403`: Policy denied access (see RLS policy fix above)
- `PGRST116`: "No rows returned" (order doesn't exist)
- `null`: Network error

---

## Complete Orders Table Policy Set

After applying the fix, your orders table should have these 3 policies:

| Policy Name | Type | Condition |
|-------------|------|-----------|
| `allow_insert_orders` | INSERT | `true` (anyone can create) |
| `allow_authenticated_read_own_orders` | SELECT | `buyer_id = auth.uid()` (logged-in users see their own) |
| `guest_ledger_read_via_tracking_token` | SELECT | `status != 'pending' AND created_at > now() - interval '30 days'` (guests see via token) |

---

## Testing

### Test 1: Guest Order Creation → Ledger Access

```bash
# 1. In app: Complete guest checkout
# 2. Redirected to: https://your-app/ledger/{tracking_token}
# 3. Should see: Order details (ID, OTP, address, total)
```

### Test 2: Direct URL Access

```bash
# Get a real tracking_token from your Supabase orders table
SELECT tracking_token, status FROM public.orders LIMIT 1;

# Paste in browser: /ledger/{that_token}
# Should work WITHOUT logging in
```

### Test 3: Expired/Pending Order Protection

```bash
# Test that pending orders are hidden:
SELECT * FROM public.orders WHERE status = 'pending' AND tracking_token = '...';
# Should NOT be accessible via ledger link
```

---

## Reference Files

- **Cleanup SQL**: `docs/migrations/2026-05-24_fix_orders_guest_read_policy.sql`
- **Guest Ledger Page**: `src/pages/customer/GuestOrderLedger.tsx`
- **Route**: `src/App.tsx` (line with `/ledger/:trackingToken`)
