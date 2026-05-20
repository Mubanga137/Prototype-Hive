# Implementation Steps - Checkout Security & State Machine

## Phase 1: Database Setup (Do First)

### 1.1 Apply SQL Migration
Run this in Supabase SQL Editor:

**File**: `docs/migrations/2026-05-20_checkout_security_upgrade.sql`

This migration:
- ✅ Adds `tracking_token` column to `orders`
- ✅ Creates `get_secure_guest_order()` RPC for guest access
- ✅ Drops old insufficient RLS policies
- ✅ Creates 9 new RLS policies with proper hierarchy
- ✅ Enables `tracking_token` index

**Expected output**: No errors, schema updated.

### 1.2 Verify in Supabase Dashboard
1. Go to **SQL Editor** → Run verification queries at bottom of migration
2. Go to **Authentication** → **Policies** → Verify 9 new policies exist
3. Go to **Database** → **Functions** → Verify `get_secure_guest_order` exists

---

## Phase 2: Frontend Code Changes

### 2.1 Update CheckoutDrawer.tsx

**File**: `src/components/CheckoutDrawer.tsx`

**Find this section** (around line 180-200 where `await supabase.from("orders").insert()` is):

```typescript
const { data, error } = await supabase
  .from("orders")
  .insert(insertPayload)
  .select("id")  // ← Change to include tracking_token
  .single();
```

**Replace with**:

```typescript
const { data, error } = await supabase
  .from("orders")
  .insert(insertPayload)
  .select("id, tracking_token")  // ← Added tracking_token
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

// ✅ NEW: Save to localStorage for guest session persistence
if (guestMode) {
  const guestSession = {
    order_id: orderId,
    tracking_token: trackingToken,
  };
  localStorage.setItem(
    "hive_guest_order_session",
    JSON.stringify(guestSession)
  );
}

// ✅ NEW: Redirect to tracking view with token
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

### 2.2 Update CartDrawer.tsx

**File**: `src/components/CartDrawer.tsx`

**Find this section** (around line 137-150 where batch insert happens):

```typescript
const { data, error } = await (supabase.from("orders") as any)
  .insert(payload)
  .select("id");  // ← Change this
```

**Replace with**:

```typescript
const { data, error } = await (supabase.from("orders") as any)
  .insert(payload)
  .select("id, tracking_token");  // ← Added tracking_token

if (error) {
  logCheckoutError(error, payload);
  const userMessage = getUserFriendlyErrorMessage(error);
  toast.error(`⚠️ ${userMessage}`);
  setState("idle");
  return;
}

const orders = ((data as any[]) || []);
const orderIds = orders.map((r) => r.id);

// ✅ NEW: For multi-order cart, save FIRST order + its token to localStorage
if (guestMode && orders.length > 0) {
  const guestSession = {
    order_id: orders[0].id,
    tracking_token: orders[0].tracking_token,
  };
  localStorage.setItem(
    "hive_guest_order_session",
    JSON.stringify(guestSession)
  );
  
  // ✅ NEW: Redirect to first order's tracking page
  setTimeout(() => {
    navigate(
      `/track-order/${orders[0].id}?token=${orders[0].tracking_token}`,
      { replace: true }
    );
    onOpenChange(false);
  }, 500);
  return;  // ← Exit early; don't proceed to WhatsApp
}

// ✅ KEEP EXISTING: For authenticated users, proceed with WhatsApp
setState("success");
```

---

### 2.3 Create New OrderTracking.tsx (Guest-aware)

**File**: `src/pages/OrderTracking.tsx`

**Replace entire file** with:

```typescript
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type Order = Database["public"]["Tables"]["orders"]["Row"];

interface OrderWithDetails extends Order {
  node?: any | null;
  runner?: any | null;
}

const OrderTracking = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get("token");
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (!order_id) return;

    const fetchOrder = async () => {
      setLoading(true);
      setAuthError(false);

      try {
        const orderId = parseInt(order_id);
        let orderData = null;

        // Authenticated buyer: use standard query (RLS enforces buyer_id = auth.uid())
        if (user?.id) {
          const { data, error } = await supabase
            .from("orders")
            .select(
              "id, status, total_price, created_at, runner_id, rider_id, otp_code, " +
              "customer_name, customer_phone, delivery_address, tracking_token"
            )
            .eq("id", orderId)
            .single();

          if (!error && data) {
            orderData = data;
          }
        }

        // Guest or not found: use secure RPC
        if (!orderData && trackingToken) {
          const { data, error } = await supabase.rpc(
            "get_secure_guest_order",
            {
              p_order_id: orderId,
              p_tracking_token: trackingToken,
            }
          );

          if (error) {
            console.error("[OrderTracking] Guest RPC error:", error);
            setAuthError(true);
            setLoading(false);
            toast.error("❌ Invalid tracking link or token expired");
            return;
          }

          if (data && data.length > 0) {
            orderData = data[0];
          }
        }

        if (!orderData) {
          setAuthError(true);
          toast.error("❌ Order not found. Check your tracking link.");
          setLoading(false);
          return;
        }

        setOrder(orderData);
        setLoading(false);
      } catch (err) {
        console.error("[OrderTracking] Error:", err);
        setAuthError(true);
        toast.error("Failed to load order details");
        setLoading(false);
      }
    };

    fetchOrder();
  }, [order_id, trackingToken, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <p className="text-lg text-foreground font-semibold mb-2">Unable to Track Order</p>
          <p className="text-muted-foreground mb-4">
            {authError
              ? "Your tracking link is invalid or has expired."
              : "Order not found."}
          </p>
          <a href="/" className="text-primary underline">
            Return to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-6 shadow-lg"
        >
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Order #{order.id}</h1>
            <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold" 
              style={{
                backgroundColor: order.status === 'delivered' ? '#dcfce7' : '#fef3c7',
                color: order.status === 'delivered' ? '#166534' : '#92400e',
              }}>
              {order.status.toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold">ZMW {order.total_price}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="text-sm font-semibold">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="font-bold mb-3">Delivery Details</h2>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-gray-600">Name:</span> {order.customer_name}
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Phone:</span> {order.customer_phone}
              </p>
              <p className="text-sm">
                <span className="text-gray-600">Address:</span> {order.delivery_address}
              </p>
            </div>
          </div>

          {order.status === 'delivered' && order.otp_code && (
            <div className="border-t mt-6 pt-6 bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-green-800">✅ Delivery Verified</p>
              <p className="text-xs text-green-700 mt-1">Your order has been successfully delivered.</p>
            </div>
          )}

          {order.runner_id || order.rider_id ? (
            <div className="border-t mt-6 pt-6">
              <p className="text-sm text-gray-600 mb-2">Assigned Rider</p>
              <p className="text-sm font-semibold">Rider ID: {order.runner_id || order.rider_id}</p>
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
};

export default OrderTracking;
```

---

### 2.4 Update TrackOrders.tsx (Multi-order + guest support)

**File**: `src/pages/customer/TrackOrders.tsx`

**Add this hook at the top** (after imports):

```typescript
// ✅ Add this near the top of component, after other useState declarations
const [guestOrder, setGuestOrder] = useState<Order | null>(null);
```

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
      // ✅ NEW: Guest - try to restore from localStorage
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
          console.error("[TrackOrders] Failed to restore guest session:", e);
        }
      }
    }

    setLoading(false);
  };

  fetchOrders();
}, [user?.id]);
```

**In the JSX render section**, add guest order display:

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

{/* Then display guest order in the list */}
{[...orders, ...(guestOrder ? [guestOrder] : [])].map((order) => (
  // Render each order card
))}
```

---

### 2.5 Update OtpVerifyDrawer.tsx (4-digit lock)

**File**: `src/components/gig/OtpVerifyDrawer.tsx`

**Find handleVerify function** (around line 25):

```typescript
const handleVerify = async () => {
  if (code.length !== 4) {  // ← Already correct
    toast.error("Enter the full 4-digit code.");
    return;
  }
  // ... rest
};
```

**Verify InputOTP maxLength is set to 4** (around line 65):

```tsx
<InputOTP maxLength={4} value={code} onChange={setCode}>
  <InputOTPGroup>
    <InputOTPSlot index={0} className="w-14 h-14 text-xl font-bold" />
    <InputOTPSlot index={1} className="w-14 h-14 text-xl font-bold" />
    <InputOTPSlot index={2} className="w-14 h-14 text-xl font-bold" />
    <InputOTPSlot index={3} className="w-14 h-14 text-xl font-bold" />
  </InputOTPGroup>
</InputOTP>
```

✅ **Already correct in your codebase**

---

### 2.6 Update OtpVerificationKeypad.tsx (4-digit lock)

**File**: `src/components/gig-radar/OtpVerificationKeypad.tsx`

**Find handleOtpInput** (around line 25):

```typescript
const handleOtpInput = (digit: string) => {
  if (otp.length < 4) {  // ← Change from < 4 to check only
    setOtp(otp + digit);
    setError("");
  }
};
```

**Already correct.** But ensure button is disabled at 4 digits:

**Find the digit buttons** (around line 80):

```tsx
{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
  <motion.button
    onClick={() => handleOtpInput(digit.toString())}
    disabled={isVerifying || otp.length >= 4}  // ← Ensure >= 4
    // ...
  />
))}

{/* Zero button */}
<motion.button
  onClick={() => handleOtpInput("0")}
  disabled={isVerifying || otp.length >= 4}  // ← Ensure >= 4
  // ...
/>
```

---

## Phase 3: State Machine Updates

### 3.1 Update gigStatusManager.ts

**File**: `src/utils/gigStatusManager.ts`

**Replace the entire file** with:

```typescript
import { supabase } from "@/integrations/supabase/client";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "assigned"
  | "in_transit"
  | "delivered";

// Define valid transitions
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
  const nextStatus = statusTransitions[currentStatus as OrderStatus];
  return nextStatus === targetStatus;
};

export const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
  return statusTransitions[currentStatus as OrderStatus];
};

export const updateOrderStatus = async (
  orderId: number,
  targetStatus: OrderStatus,
  agentId: string
): Promise<boolean> => {
  try {
    // Fetch current status
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("status, rider_id, runner_id")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      console.error("Failed to fetch order:", fetchErr);
      return false;
    }

    // Validate ownership
    const isOwner = order.rider_id === agentId || order.runner_id === agentId;
    if (!isOwner) {
      console.error("Agent is not assigned to this order");
      return false;
    }

    // Validate transition
    if (!canTransition(order.status, targetStatus)) {
      console.error(
        `Invalid transition from ${order.status} to ${targetStatus}`
      );
      return false;
    }

    // Apply update
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: targetStatus })
      .eq("id", orderId);

    if (updateErr) {
      console.error("Failed to update order status:", updateErr);
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

### 3.2 Update useNearbyGigs.ts

**File**: `src/hooks/useNearbyGigs.ts`

**Find the query** that fetches pending orders, change to `processing`:

```typescript
// OLD:
const { data } = await supabase
  .from("orders")
  .select(`id, total_price as payout, status, created_at`)
  .is("runner_id", null)
  .eq("status", "pending")  // ← Change from "pending"
  .limit(100);

// NEW:
const { data } = await supabase
  .from("orders")
  .select(`id, total_price as payout, status, created_at`)
  .is("runner_id", null)
  .is("rider_id", null)
  .eq("status", "processing")  // ← Change to "processing"
  .limit(100);
```

---

### 3.3 Update GigRadar.tsx

**File**: `src/pages/GigRadar.tsx`

**Find the fetchOrders function**:

```typescript
// OLD:
const { data: orders } = await supabase
  .from("orders")
  .select(`id, sme_id, total_price, status`)
  .eq("status", "pending");  // ← Change this

// NEW:
const { data: orders } = await supabase
  .from("orders")
  .select(`id, sme_id, total_price, status`)
  .eq("status", "processing");  // ← Only "processing"
```

**Find the handleClaimBatch function**:

```typescript
// OLD:
const { error } = await supabase
  .from("orders")
  .update({
    status: "in_transit",  // ← Change this
    rider_id: user.id,
  })
  .in("id", batch.orderIds);

// NEW:
const { error } = await supabase
  .from("orders")
  .update({
    status: "assigned",  // ← Change to "assigned"
    rider_id: user.id,
  })
  .in("id", batch.orderIds)
  .eq("status", "processing");  // ← Guard clause
```

---

### 3.4 Update useOrderClustering.ts

**File**: `src/hooks/gig-radar/useOrderClustering.ts`

```typescript
// OLD:
const { data: orders } = await supabase
  .from("orders")
  .select(`id, sme_id, total_price, status`)
  .eq("status", "processing");

// NEW (should already be "processing", verify):
const { data: orders } = await supabase
  .from("orders")
  .select(`id, sme_id, total_price, status`)
  .eq("status", "processing");  // ✅ Correct
```

---

### 3.5 Update useBatchRoutingStateMachine.ts

**File**: `src/hooks/gig-radar/useBatchRoutingStateMachine.ts`

**Find handlePickupConfirmation** and rewrite:

```typescript
const handlePickupConfirmation = async (orderId: number, otp: string) => {
  try {
    // Fetch order details
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("otp_code, status")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      toast.error("Could not fetch order details");
      return false;
    }

    // Validate OTP
    if (order.otp_code !== otp) {
      toast.error("Invalid OTP");
      return false;
    }

    // ✅ NEW: Transition assigned → in_transit (pickup confirmed)
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: "in_transit" })
      .eq("id", orderId)
      .eq("rider_id", state.riderId);

    if (updateErr) {
      toast.error("Failed to confirm pickup");
      return false;
    }

    toast.success("✅ Pickup confirmed. Heading to delivery...");
    return true;
  } catch (err) {
    console.error("[handlePickupConfirmation]", err);
    return false;
  }
};
```

**Find handleDeliveryConfirmation** and rewrite:

```typescript
const handleDeliveryConfirmation = async (orderId: number, otp: string) => {
  try {
    // Fetch order details
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("otp_code, status")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      toast.error("Could not fetch order details");
      return false;
    }

    // Validate OTP
    if (order.otp_code !== otp) {
      toast.error("Invalid OTP");
      return false;
    }

    // ✅ NEW: Transition in_transit → delivered
    const { error: updateErr } = await supabase
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId)
      .eq("rider_id", state.riderId);

    if (updateErr) {
      toast.error("Failed to confirm delivery");
      return false;
    }

    toast.success("✅ Delivery confirmed! Order completed.");
    return true;
  } catch (err) {
    console.error("[handleDeliveryConfirmation]", err);
    return false;
  }
};
```

---

## Phase 4: Testing

### Test Checklist

**Guest Checkout Flow:**
- [ ] Fill checkout form, submit
- [ ] See success toast + redirect to `/track-order/:id?token=...`
- [ ] Verify `hive_guest_order_session` in browser localStorage
- [ ] Refresh page → order still loads
- [ ] Close browser, reopen → localStorage persists guest session

**State Machine:**
- [ ] Create test order (starts as `pending_payment` if you change initial status)
- [ ] Webhook/admin transitions to `paid`
- [ ] SME accepts → order becomes `processing`
- [ ] Rider sees order on `/gig-radar`
- [ ] Rider claims → status becomes `assigned`
- [ ] Rider starts delivery → status becomes `in_transit`
- [ ] Rider enters 4-digit OTP → status becomes `delivered`

**OTP Validation:**
- [ ] Dial pad locks at 4 digits (can't enter 5th)
- [ ] Can't submit with 3 digits
- [ ] Requires exactly 4 digits

**RLS Policies:**
- [ ] Guest cannot SELECT orders directly (use RPC)
- [ ] Rider cannot see orders in `pending_payment` or `paid`
- [ ] Rider CAN see `processing` orders
- [ ] Buyer can read own orders

---

## Rollback / Safety

If you need to revert:

1. **Keep backup** of current `gigStatusManager.ts`
2. **Revert migration** in Supabase:
   ```sql
   DROP FUNCTION IF EXISTS public.get_secure_guest_order;
   DROP COLUMN IF EXISTS tracking_token FROM public.orders;
   DROP INDEX IF EXISTS idx_orders_tracking_token;
   -- Re-apply old policies
   ```
3. **Revert code** to previous commits using git

---

## Key Points

- **tracking_token** is UUID, auto-generated, unique, indexed
- **Guest session** persists via localStorage under key `hive_guest_order_session`
- **RPC** validates token server-side; guests can't bypass it
- **State machine** is now: `pending_payment` → `paid` → `processing` → `assigned` → `in_transit` → `delivered`
- **OTP** is strictly 4 digits; keypad locks after 4 inputs
- **9 RLS policies** enforce strict hierarchy without shortcuts

