# Code Snippets (Copy-Paste Ready)

## 1. CheckoutDrawer.tsx - Replace Insert Logic

**Find this section** (search for `await supabase.from("orders").insert`):

```typescript
// ❌ OLD CODE (DELETE THIS):
const { data, error } = await supabase
  .from("orders")
  .insert(insertPayload)
  .select("id")
  .single();

if (error) {
  logCheckoutError(error, insertPayload);
  const userMessage = getUserFriendlyErrorMessage(error);
  toast.error(`⚠️ ${userMessage}`);
  setState("idle");
  return;
}

// ✅ NEW CODE (REPLACE WITH THIS):
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

if (guestMode) {
  // ✅ Save guest session to localStorage
  const guestSession = {
    order_id: orderId,
    tracking_token: trackingToken,
  };
  localStorage.setItem(
    "hive_guest_order_session",
    JSON.stringify(guestSession)
  );
}

// ✅ Redirect to tracking page with token
setState("success");
setTimeout(() => {
  navigate(
    `/track-order/${orderId}?token=${trackingToken}`,
    { replace: true }
  );
  onOpenChange(false);
}, 500);
```

---

## 2. CheckoutDrawer.tsx - Change Initial Status

**Find this section** (search for `status: "pending"`):

```typescript
// ❌ OLD CODE:
const insertPayload: Record<string, any> = {
  buyer_id: guestMode ? null : (user?.id ?? null),
  sme_id: item.sme_id ?? null,
  store_id: item.store_id ?? item.sme_id ?? null,
  item_id: item.id,
  total_amount: totalAmount,
  total_price: totalAmount,
  quantity: isService ? 1 : quantity,
  otp_code: otp,
  status: "pending",  // ❌ OLD
  customer_phone: cleanedPhone,
  customer_name: name.trim(),
  delivery_address: address.trim(),
  scheduled_date: isService ? scheduledDate : null,
  service_notes: isService ? serviceNotes : null,
};

// ✅ NEW CODE:
const insertPayload: Record<string, any> = {
  buyer_id: guestMode ? null : (user?.id ?? null),
  sme_id: item.sme_id ?? null,
  store_id: item.store_id ?? item.sme_id ?? null,
  item_id: item.id,
  total_amount: totalAmount,
  total_price: totalAmount,
  quantity: isService ? 1 : quantity,
  otp_code: otp,
  status: "pending_payment",  // ✅ NEW
  customer_phone: cleanedPhone,
  customer_name: name.trim(),
  delivery_address: address.trim(),
  scheduled_date: isService ? scheduledDate : null,
  service_notes: isService ? serviceNotes : null,
};
```

---

## 3. CartDrawer.tsx - Replace Insert Logic

**Find this section** (search for `await (supabase.from("orders") as any).insert`):

```typescript
// ❌ OLD CODE (DELETE THIS):
const { data, error } = await (supabase.from("orders") as any)
  .insert(payload)
  .select("id");

if (error) {
  logCheckoutError(error, payload);
  const userMessage = getUserFriendlyErrorMessage(error);
  toast.error(`⚠️ ${userMessage}`);
  setState("idle");
  return;
}

const orderIds = ((data as any[]) || []).map((r) => r.id);
setState("success");

// ✅ NEW CODE (REPLACE WITH THIS):
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

// ✅ NEW: For guest mode, save session + redirect to first order
if (guestMode && orders.length > 0) {
  const guestSession = {
    order_id: orders[0].id,
    tracking_token: orders[0].tracking_token,
  };
  localStorage.setItem(
    "hive_guest_order_session",
    JSON.stringify(guestSession)
  );

  setState("success");
  setTimeout(() => {
    navigate(
      `/track-order/${orders[0].id}?token=${orders[0].tracking_token}`,
      { replace: true }
    );
    onOpenChange(false);
  }, 500);
  return;  // ← Exit early; don't continue to WhatsApp logic
}

// ✅ KEEP EXISTING: For authenticated users, continue with WhatsApp
setState("success");
// ... rest of WhatsApp code continues as before
```

---

## 4. CartDrawer.tsx - Change Initial Status

**Find this section** (search for `const payload = lines.map`):

```typescript
// ❌ OLD CODE:
const payload = lines.map((l) => ({
  buyer_id: guestMode ? null : user.id,
  sme_id: smeId,
  store_id: smeId,
  item_id: l.offer_id,
  total_amount: l.unit_price * l.quantity,
  total_price: l.unit_price * l.quantity,
  quantity: l.quantity,
  otp_code: otp,
  status: "pending",  // ❌ OLD
  customer_phone: cleanedPhone,
  customer_name: name.trim(),
  delivery_address: address.trim(),
}));

// ✅ NEW CODE:
const payload = lines.map((l) => ({
  buyer_id: guestMode ? null : user.id,
  sme_id: smeId,
  store_id: smeId,
  item_id: l.offer_id,
  total_amount: l.unit_price * l.quantity,
  total_price: l.unit_price * l.quantity,
  quantity: l.quantity,
  otp_code: otp,
  status: "pending_payment",  // ✅ NEW
  customer_phone: cleanedPhone,
  customer_name: name.trim(),
  delivery_address: address.trim(),
}));
```

---

## 5. GigRadar.tsx - Update Order Fetch

**Find this section** (search for `.eq("status", "pending")` or similar):

```typescript
// ❌ OLD CODE:
const { data: orders, error } = await supabase
  .from("orders")
  .select(`id, sme_id, total_price, status, created_at`)
  .eq("status", "pending");

// ✅ NEW CODE:
const { data: orders, error } = await supabase
  .from("orders")
  .select(`id, sme_id, total_price, status, created_at`)
  .eq("status", "processing");
```

---

## 6. GigRadar.tsx - Update Claim Logic

**Find this section** (search for `.update({ status:`):

```typescript
// ❌ OLD CODE:
const { error } = await supabase
  .from("orders")
  .update({
    status: "in_transit",  // ❌ OLD
    rider_id: user.id,
  })
  .in("id", batch.orderIds);

// ✅ NEW CODE:
const { error } = await supabase
  .from("orders")
  .update({
    status: "assigned",  // ✅ NEW
    rider_id: user.id,
  })
  .in("id", batch.orderIds)
  .eq("status", "processing");  // ✅ Guard clause
```

---

## 7. useNearbyGigs.ts - Update Query

**Find this section**:

```typescript
// ❌ OLD CODE:
const { data } = await supabase
  .from("orders")
  .select(`id, total_price as payout, status, created_at`)
  .is("runner_id", null)
  .eq("status", "pending");

// ✅ NEW CODE:
const { data } = await supabase
  .from("orders")
  .select(`id, total_price as payout, status, created_at`)
  .is("runner_id", null)
  .is("rider_id", null)
  .eq("status", "processing");
```

---

## 8. gigStatusManager.ts - Full Replacement

**Replace entire file with this**:

```typescript
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "assigned"
  | "in_transit"
  | "delivered";

export const statusTransitions: Record<OrderStatus, OrderStatus | null> = {
  pending_payment: "paid",
  paid: "processing",
  processing: "assigned",
  assigned: "in_transit",
  in_transit: "delivered",
  delivered: null,
};

export const canTransition = (
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean => {
  const nextStatus = statusTransitions[currentStatus];
  return nextStatus === targetStatus;
};

export const getNextStatus = (
  currentStatus: OrderStatus
): OrderStatus | null => {
  return statusTransitions[currentStatus];
};

export const updateOrderStatus = async (
  orderId: number,
  targetStatus: OrderStatus,
  agentId: string
): Promise<boolean> => {
  try {
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("status, rider_id, runner_id")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      console.error("[updateOrderStatus] Failed to fetch order:", fetchErr);
      return false;
    }

    const isOwner =
      order.rider_id === agentId || order.runner_id === agentId;
    if (!isOwner) {
      console.error(
        "[updateOrderStatus] Agent is not assigned to this order"
      );
      return false;
    }

    if (!canTransition(order.status, targetStatus)) {
      console.error(
        `[updateOrderStatus] Invalid transition from ${order.status} to ${targetStatus}`
      );
      return false;
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: targetStatus })
      .eq("id", orderId);

    if (updateErr) {
      console.error("[updateOrderStatus] Failed to update order:", updateErr);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[updateOrderStatus] Unexpected error:", err);
    return false;
  }
};
```

---

## 9. OtpVerificationKeypad.tsx - Enforce 4-Digit Lock

**Find the handleOtpInput function**:

```typescript
// ✅ VERIFY IT LOOKS LIKE THIS:
const handleOtpInput = (digit: string) => {
  if (otp.length < 4) {  // ← Strict limit
    setOtp(otp + digit);
    setError("");
  }
};

// Also verify the verify button is disabled properly:
const handleVerify = async () => {
  if (otp.length !== 4) {  // ← Strict validation
    setError("OTP must be 4 digits");
    return;
  }
  // ... rest of logic
};
```

**Verify digit buttons are disabled at 4 digits**:

```tsx
{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
  <motion.button
    // ... other props
    disabled={isVerifying || otp.length >= 4}  // ← Ensure >= 4
    // ... rest of button
  />
))}

<motion.button
  onClick={() => handleOtpInput("0")}
  disabled={isVerifying || otp.length >= 4}  // ← Ensure >= 4
  // ... rest
/>
```

---

## 10. OtpVerifyDrawer.tsx - Strict Validation

**Verify handleVerify looks like this**:

```typescript
const handleVerify = async () => {
  if (code.length !== 4) {  // ← Strict 4-digit check
    toast.error("Enter the full 4-digit code.");
    return;
  }
  
  setVerifying(true);

  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("otp_code")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr || !order) {
    toast.error("Could not fetch order details.");
    setVerifying(false);
    return;
  }

  if ((order as any).otp_code !== code) {
    toast.error("❌ Incorrect code. Ask the customer for the correct delivery code.");
    setVerifying(false);
    return;
  }

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: "delivered" } as any)
    .eq("id", orderId);

  if (updateErr) {
    toast.error(updateErr.message);
  } else {
    toast.success("✅ Handoff verified! Order delivered & payout initiated.");
    onVerified();
    onClose();
  }
  setVerifying(false);
};
```

---

## 11. TrackOrders.tsx - Add Guest Support

**Find the useEffect that fetches orders** and add guest session restoration:

```typescript
useEffect(() => {
  const fetchOrders = async () => {
    setLoading(true);

    if (user?.id) {
      // Authenticated: fetch user's orders
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total_price, status, created_at, runner_id, otp_code, " +
          "customer_name, delivery_address"
        )
        .eq("buyer_id", user.id)
        .neq("status", "delivered")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setOrders(data);
      }
    } else {
      // ✅ NEW: Guest - restore from localStorage
      const session = localStorage.getItem("hive_guest_order_session");
      if (session) {
        try {
          const { order_id, tracking_token } = JSON.parse(session);
          const { data, error } = await supabase.rpc(
            "get_secure_guest_order",
            {
              p_order_id: order_id,
              p_tracking_token: tracking_token,
            }
          );

          if (!error && data && data.length > 0) {
            setGuestOrder(data[0]);
          }
        } catch (e) {
          console.error("[TrackOrders] Guest session restore failed:", e);
        }
      }
    }

    setLoading(false);
  };

  fetchOrders();
}, [user?.id]);
```

**Add guest state** near top of component:

```typescript
const [guestOrder, setGuestOrder] = useState<Order | null>(null);
```

**In JSX, display guest order**:

```tsx
{guestOrder && !user && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
  >
    <p className="text-sm text-blue-900 font-semibold">
      📍 Guest Order Restored
    </p>
    <p className="text-xs text-blue-800 mt-1">
      Order #{guestOrder.id} loaded from your browser storage.
    </p>
  </motion.div>
)}

{/* In the order list mapping: */}
{[...orders, ...(guestOrder ? [guestOrder] : [])].map((order) => (
  // Render order card
))}
```

---

## 12. SQL Migration

Run this in Supabase SQL Editor:

```sql
-- Add tracking_token column
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop OLD policies
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "buyer can read own orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can read store orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can update store orders" ON public.orders;
DROP POLICY IF EXISTS "guest can read order by otp" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Enable users to view their own data only" ON public.orders;
DROP POLICY IF EXISTS "Gig workers can claim and update orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_claim_orders" ON public.orders;
DROP POLICY IF EXISTS "gig_workers_can_read_processing_orders" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Reading" ON public.orders;
DROP POLICY IF EXISTS "Strict Access for Order Updates" ON public.orders;

-- NEW POLICIES (9 total)

CREATE POLICY "anyone_can_place_order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "buyer_can_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

CREATE POLICY "buyer_can_update_own_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "sme_owner_can_read_store_orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

CREATE POLICY "sme_owner_can_update_store_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sme_stores s
    WHERE s.id = orders.store_id
      AND s.owner_user_id = auth.uid()
  )
);

CREATE POLICY "gig_workers_can_read_processing_orders"
ON public.orders FOR SELECT
TO authenticated
USING (status = 'processing');

CREATE POLICY "gig_workers_can_claim_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  status = 'processing'
  AND rider_id IS NULL
  AND runner_id IS NULL
)
WITH CHECK (
  status = 'assigned'
  AND (rider_id = auth.uid() OR runner_id = auth.uid())
);

CREATE POLICY "gig_workers_can_update_assigned_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  (rider_id = auth.uid() OR runner_id = auth.uid())
  AND status IN ('assigned', 'in_transit')
)
WITH CHECK (
  (rider_id = auth.uid() OR runner_id = auth.uid())
  AND status IN ('in_transit', 'delivered')
);

CREATE POLICY "guest_no_direct_select"
ON public.orders FOR SELECT
TO anon
USING (false);

-- RPC Function
CREATE OR REPLACE FUNCTION public.get_secure_guest_order(
  p_order_id BIGINT,
  p_tracking_token UUID
)
RETURNS TABLE (
  id BIGINT,
  status TEXT,
  tracking_token UUID,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  total_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  runner_id BIGINT,
  rider_id BIGINT,
  otp_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.status,
    o.tracking_token,
    o.customer_name,
    o.customer_phone,
    o.delivery_address,
    o.total_price,
    o.created_at,
    o.runner_id,
    o.rider_id,
    CASE 
      WHEN o.status IN ('pending_payment', 'paid', 'processing') THEN NULL
      WHEN o.status IN ('assigned', 'in_transit') THEN NULL
      WHEN o.status = 'delivered' THEN o.otp_code
      ELSE NULL
    END AS otp_code
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.tracking_token = p_tracking_token
    AND o.buyer_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_secure_guest_order(BIGINT, UUID) 
  TO anon, authenticated;

ANALYZE public.orders;
```

---

## Quick Verification Checklist

```javascript
// In browser console:

// 1. Check localStorage saved
JSON.parse(localStorage.getItem("hive_guest_order_session"))
// Should show: { order_id: 123, tracking_token: "uuid-..." }

// 2. Test RPC (guest access)
await supabase.rpc("get_secure_guest_order", {
  p_order_id: 123,
  p_tracking_token: "uuid-..."
})
// Should succeed and return order data

// 3. Try direct SELECT (should fail)
await supabase.from("orders").select("*").limit(1)
// Should fail with "violates row-level security policy"
```

