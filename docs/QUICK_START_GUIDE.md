# Quick Start: 5 Actions to Secure Checkout

## Action 1: Run SQL Migration (5 min)

### Do This First
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create new query, paste the entire contents of:
   ```
   docs/migrations/2026-05-20_checkout_security_upgrade.sql
   ```
3. Click **Run** (or Cmd+Enter)
4. Verify no errors appear

### What it does:
- ✅ Adds `tracking_token` column (UUID)
- ✅ Creates `get_secure_guest_order` RPC function
- ✅ Drops 9 old RLS policies
- ✅ Creates 9 new RLS policies with proper hierarchy
- ✅ Indexes `tracking_token` for fast lookups

### Verify Success
Run these verification queries:

```sql
-- Check tracking_token exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tracking_token';
-- Should return: tracking_token | uuid

-- Check RLS policies (should be 9)
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'orders';
-- Should return: 9

-- Check RPC exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_secure_guest_order';
-- Should return: get_secure_guest_order
```

---

## Action 2: Update Checkout Drawers (15 min)

### CheckoutDrawer.tsx

**Find line ~145** (where it says `.select("id")`):

```typescript
// BEFORE:
const { data, error } = await supabase
  .from("orders")
  .insert(insertPayload)
  .select("id")
  .single();

// AFTER:
const { data, error } = await supabase
  .from("orders")
  .insert(insertPayload)
  .select("id, tracking_token")
  .single();

if (error) {
  logCheckoutError(error, insertPayload);
  const userMessage = getUserFriendlyErrorMessage(error);
  toast.error(`⚠️ ${userMessage}`);
  setState("idle");
  return;
}

const orderId = data.id;
const trackingToken = data.tracking_token;

// ✅ Save to localStorage
if (guestMode) {
  localStorage.setItem(
    "hive_guest_order_session",
    JSON.stringify({ order_id: orderId, tracking_token: trackingToken })
  );
}

// ✅ Redirect with token
setState("success");
setTimeout(() => {
  navigate(`/track-order/${orderId}?token=${trackingToken}`, { replace: true });
  onOpenChange(false);
}, 500);
```

### CartDrawer.tsx

**Find line ~137** (where it says `.select("id")`):

```typescript
// BEFORE:
const { data, error } = await (supabase.from("orders") as any)
  .insert(payload)
  .select("id");

// AFTER:
const { data, error } = await (supabase.from("orders") as any)
  .insert(payload)
  .select("id, tracking_token");

if (error) {
  logCheckoutError(error, payload);
  const userMessage = getUserFriendlyErrorMessage(error);
  toast.error(`⚠️ ${userMessage}`);
  setState("idle");
  return;
}

const orders = ((data as any[]) || []);
const orderIds = orders.map((r) => r.id);

// ✅ NEW: Save guest session + redirect (for guestMode only)
if (guestMode && orders.length > 0) {
  localStorage.setItem(
    "hive_guest_order_session",
    JSON.stringify({
      order_id: orders[0].id,
      tracking_token: orders[0].tracking_token,
    })
  );
  
  setTimeout(() => {
    navigate(
      `/track-order/${orders[0].id}?token=${orders[0].tracking_token}`,
      { replace: true }
    );
    onOpenChange(false);
  }, 500);
  return;  // ← Exit early; skip WhatsApp logic for guests
}

// ✅ KEEP EXISTING: For authenticated users, proceed with WhatsApp
setState("success");
// ... rest of WhatsApp code continues
```

---

## Action 3: Create Guest OrderTracking Page (10 min)

### Create new file: `src/pages/OrderTracking.tsx`

Replace entire file with code from **docs/IMPLEMENTATION_STEPS.md** → **Section 2.3**

Key points:
- Uses URL param `?token=...` for guest validation
- Falls back to RPC if not authenticated
- Renders order details safely

---

## Action 4: Update State Machine (20 min)

### Change initial order status: `pending_payment`

**In CheckoutDrawer.tsx** (around line 110):

```typescript
// BEFORE:
const insertPayload: Record<string, any> = {
  // ...
  status: "pending",  // ← OLD
  // ...
};

// AFTER:
const insertPayload: Record<string, any> = {
  // ...
  status: "pending_payment",  // ← NEW
  // ...
};
```

**In CartDrawer.tsx** (around line 122):

```typescript
// BEFORE:
const payload = lines.map((l) => ({
  // ...
  status: "pending",  // ← OLD
  // ...
}));

// AFTER:
const payload = lines.map((l) => ({
  // ...
  status: "pending_payment",  // ← NEW
  // ...
}));
```

### Update GigRadar.tsx

**Find where it fetches orders** (look for `.eq("status", "pending")`):

```typescript
// BEFORE:
const { data: orders } = await supabase
  .from("orders")
  .select(`...`)
  .eq("status", "pending");  // ← OLD

// AFTER:
const { data: orders } = await supabase
  .from("orders")
  .select(`...`)
  .eq("status", "processing");  // ← NEW
```

**Find where it claims orders** (look for `.update({ status:`):

```typescript
// BEFORE:
await supabase
  .from("orders")
  .update({ status: "in_transit" })  // ← OLD
  .in("id", orderIds);

// AFTER:
await supabase
  .from("orders")
  .update({ status: "assigned" })  // ← NEW
  .in("id", orderIds)
  .eq("status", "processing");  // ← Guard clause
```

### Update gigStatusManager.ts

**Replace entire file** with code from **docs/IMPLEMENTATION_STEPS.md** → **Section 3.1**

This enforces the new state machine:
```
pending_payment → paid → processing → assigned → in_transit → delivered
```

---

## Action 5: Test End-to-End (30 min)

### Guest Checkout Test

1. **Go to home page** → Add item to cart
2. **Open checkout drawer** → Fill form → Submit as guest
3. **Verify redirect**: Should go to `/track-order/123?token=...`
4. **Check localStorage**: 
   ```javascript
   // In browser console:
   JSON.parse(localStorage.getItem("hive_guest_order_session"))
   // Should show: { order_id: 123, tracking_token: "uuid-..." }
   ```
5. **Refresh page**: Order should still load (guest session restored)
6. **View order**: Should see customer name, address, status

### State Machine Test

1. **Create order** → Verify status is `pending_payment` (in Supabase)
2. **Webhook transition** (manual SQL for testing):
   ```sql
   UPDATE public.orders SET status = 'paid' WHERE id = [order_id];
   UPDATE public.orders SET status = 'processing' WHERE id = [order_id];
   ```
3. **Go to `/gig-radar`** → Should see order now (wasn't visible before)
4. **Claim order** → Status should change to `assigned`

### OTP Test

1. **Get OTP code** from database:
   ```sql
   SELECT otp_code FROM public.orders WHERE id = [order_id];
   ```
2. **Open OTP dialog** → Try entering 5 digits
   - **Should stop at 4** (can't enter more)
3. **Enter correct 4-digit OTP** → Status should change to `delivered`

### RLS Policy Test

```javascript
// In browser console, try direct query as anon user:
await supabase
  .from("orders")
  .select("*")
  .limit(1);
// Should FAIL with "new row violates row-level security policy"

// But RPC should work:
await supabase.rpc("get_secure_guest_order", {
  p_order_id: 123,
  p_tracking_token: "uuid-..."
});
// Should succeed and return order data
```

---

## Rollback (If Needed)

### Keep backups of these files BEFORE making changes:
1. `src/components/CheckoutDrawer.tsx`
2. `src/components/CartDrawer.tsx`
3. `src/pages/OrderTracking.tsx`
4. `src/utils/gigStatusManager.ts`
5. `src/pages/GigRadar.tsx`

### If something breaks:
```bash
# Revert code:
git checkout [filename]

# Revert database (in Supabase SQL Editor):
DROP FUNCTION IF EXISTS public.get_secure_guest_order;
DROP COLUMN IF EXISTS tracking_token FROM public.orders;
-- Then re-apply old RLS policies manually
```

---

## Key Files to Review

1. **docs/migrations/2026-05-20_checkout_security_upgrade.sql**
   - ✅ Run this first

2. **docs/CHECKOUT_SECURITY_ARCHITECTURE.md**
   - Complete architecture overview
   - All policy code + RPC details

3. **docs/IMPLEMENTATION_STEPS.md**
   - Step-by-step code changes
   - Line numbers and context

4. **docs/VULNERABILITY_ANALYSIS.md**
   - Why each gap is critical
   - Risk assessment

---

## Success Criteria

✅ All checks should pass:

- [ ] SQL migration runs without errors
- [ ] `tracking_token` column exists in Supabase
- [ ] `get_secure_guest_order` RPC exists
- [ ] 9 new RLS policies visible in dashboard
- [ ] Guest checkout redirects to `/track-order/:id?token=...`
- [ ] Guest session persists in localStorage
- [ ] Guest can view their order via RPC
- [ ] Guest cannot SELECT orders directly (RLS blocks)
- [ ] Order starts in `pending_payment` status
- [ ] Rider sees only `processing` orders on /gig-radar
- [ ] Rider claims order → status becomes `assigned`
- [ ] OTP input locks at 4 digits
- [ ] OTP verification transitions to `delivered`

---

## Next Steps

**After testing, update:**
1. **Admin dashboard** to accept `pending_payment` → `paid` transitions
2. **SME dashboard** to accept `paid` → `processing` transitions
3. **Escrow webhook** to automatically transition `pending_payment` → `paid`
4. **Rider UI** to use new state machine for status updates

---

## Support

If migrations fail:
1. Check Supabase logs: **Project Settings** → **Logs**
2. Verify RLS is enabled: `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`
3. Check foreign keys: `REFERENCES hive_stores(id)`, etc.
4. Re-run migration with `IF NOT EXISTS` clauses (already included)

