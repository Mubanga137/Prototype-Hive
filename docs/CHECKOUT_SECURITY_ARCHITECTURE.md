# Checkout Security Architecture - Complete Implementation

## Overview
This document outlines the complete overhaul of the checkout process to address:
1. **Guest vulnerability** - secure guest tracking with tokens
2. **RLS policy gaps** - proper access control for all user roles
3. **State machine misalignment** - exact delivery state progression
4. **OTP validation** - 4-digit lock enforcement

---

## ARCHITECTURE DECISIONS

### 1. Guest Session Model
- **Problem**: Guest users checkout but can't track orders securely
- **Solution**: 
  - Generate `tracking_token` UUID on order insert
  - Store `{order_id, tracking_token}` in localStorage as `hive_guest_order_session`
  - Use secure RPC `get_secure_guest_order` that validates token server-side
  - **Why**: RLS policies cannot read tokens from browser; server-side validation is required

### 2. State Machine Progression
```
pending_payment
    ↓ (Escrow confirms payment)
paid
    ↓ (SME accepts order)
processing
    ↓ (Rider claims order on /gig-radar)
assigned
    ↓ (Rider initiates pickup)
in_transit
    ↓ (Rider confirms pickup OTP + navigates)
in_transit (pickup confirmed)
    ↓ (Rider completes delivery)
delivered
    ↓ (Escrow unlocks)
[completed]
```

Current codebase uses `pending` → `assigned` → `en_route_to_pickup` → `at_pickup` → `in_transit` → `delivered`, which conflicts with the escrow flow. **This must be rewritten.**

### 3. RLS Policy Hierarchy
- **anon (guest)**: Can INSERT + READ by token only (via RPC)
- **authenticated buyer**: Can read own orders
- **sme_owner**: Can read/update own store's orders, transition to `paid` + `processing`
- **rider**: Can read/claim orders in `processing` state, update status via RPC
- **runner**: Same as rider (logistics fleet)

---

## DATABASE CHANGES

### Migration: Add tracking_token + Fix RLS

```sql
-- 1. Add tracking_token column to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- 2. Add index for token lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);

-- 3. Enable RLS (should already be on)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Drop OLD insufficient policies
DROP POLICY IF EXISTS "anyone can place an order" ON public.orders;
DROP POLICY IF EXISTS "buyer can read own orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can read store orders" ON public.orders;
DROP POLICY IF EXISTS "sme owner can update store orders" ON public.orders;
DROP POLICY IF EXISTS "guest can read order by otp" ON public.orders;

-- =====================================================================
-- NEW RLS POLICIES
-- =====================================================================

-- POLICY 1: Anyone can INSERT (create orders)
CREATE POLICY "anyone_can_place_order"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- POLICY 2: Buyers can read own orders
CREATE POLICY "buyer_can_read_own_orders"
ON public.orders FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- POLICY 3: Buyers can update own orders (e.g., cancel)
CREATE POLICY "buyer_can_update_own_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- POLICY 4: SME owners can read store orders
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

-- POLICY 5: SME owners can update store orders (payment -> processing transition)
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

-- POLICY 6: Authenticated users (gig workers) can read processing orders
CREATE POLICY "gig_workers_can_read_processing_orders"
ON public.orders FOR SELECT
TO authenticated
USING (status = 'processing');

-- POLICY 7: Gig workers (riders/runners) can claim & update orders
CREATE POLICY "gig_workers_can_claim_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (status = 'processing' AND rider_id IS NULL AND runner_id IS NULL)
WITH CHECK (status IN ('assigned', 'in_transit', 'delivered'));

-- POLICY 8: Gig workers can update their assigned orders
CREATE POLICY "gig_workers_can_update_assigned_orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  (rider_id = auth.uid() OR runner_id = auth.uid())
  AND status != 'delivered'
)
WITH CHECK (
  (rider_id = auth.uid() OR runner_id = auth.uid())
);

-- POLICY 9: Read access for strict order tracking (token-based, anon)
-- NOTE: This is READ-ONLY and authenticated users use RPC instead
CREATE POLICY "strict_access_order_reading"
ON public.orders FOR SELECT
TO anon
USING (false);  -- Anon must use RPC, not direct query

-- Refresh schema cache
ANALYZE public.orders;
```

### Supabase RPC: Get secure guest order

```sql
-- Create RPC for guest order retrieval
CREATE OR REPLACE FUNCTION get_secure_guest_order(
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
      WHEN o.status IN ('pending_payment', 'paid') THEN NULL  -- Hide OTP from SME review
      WHEN o.status = 'pending' THEN NULL  -- Hide initially
      WHEN o.status IN ('in_transit', 'delivered') THEN o.otp_code  -- Reveal for final verification
      ELSE NULL
    END AS otp_code
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.tracking_token = p_tracking_token
    AND o.buyer_id IS NULL;  -- Only for guest orders
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon (guest) and authenticated
GRANT EXECUTE ON FUNCTION get_secure_guest_order(BIGINT, UUID) TO anon, authenticated;
```

---

## FRONTEND CHANGES

### 1. Update CheckoutDrawer.tsx - Add tracking_token capture + localStorage

```typescript
// In handleSubmit, after successful insert:

const { data, error } = await supabase
  .from("orders")
  .insert(insertPayload)
  .select("id, tracking_token")  // ADD tracking_token to select
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

// ✅ Save to localStorage for guest session persistence
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

// ✅ Redirect to tracking view with token
setState("success");
setTimeout(() => {
  navigate(
    `/track-order/${orderId}?token=${trackingToken}`,
    { replace: true }
  );
  onOpenChange(false);
}, 500);
```

### 2. Update CartDrawer.tsx - Same pattern, multi-order handling

```typescript
// After insert succeeds
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

// ✅ For multi-order cart, save FIRST order + its token to localStorage
if (guestMode && orders.length > 0) {
  const guestSession = {
    order_id: orders[0].id,
    tracking_token: orders[0].tracking_token,
  };
  localStorage.setItem(
    "hive_guest_order_session",
    JSON.stringify(guestSession)
  );
  
  // Redirect to first order's tracking page
  setTimeout(() => {
    navigate(
      `/track-order/${orders[0].id}?token=${orders[0].tracking_token}`,
      { replace: true }
    );
    onOpenChange(false);
  }, 500);
} else {
  // Authenticated path: existing WhatsApp logic
  setState("success");
  // ... existing code
}
```

### 3. Create/Update OrderTracking.tsx - Guest token validation

```typescript
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Order = Database["public"]["Tables"]["orders"]["Row"];

interface OrderWithDetails extends Order {
  node?: any | null;
  runner?: any | null;
}

const OrderTracking = () => {
  const { order_id } = useParams<{ order_id: string }>();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get("token");

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

        // Try authenticated fetch first (for logged-in buyers)
        const { data: authUser } = await supabase.auth.getUser();
        let orderData = null;

        if (authUser?.user) {
          // Authenticated buyer - use standard query
          const { data, error } = await supabase
            .from("orders")
            .select("id, status, total_price, created_at, runner_id, rider_id, otp_code, customer_name, customer_phone, delivery_address")
            .eq("id", orderId)
            .eq("buyer_id", authUser.user.id)
            .single();

          if (!error && data) {
            orderData = data;
          }
        }

        // If not authenticated or not found, try guest RPC
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
  }, [order_id, trackingToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <p className="text-lg text-foreground font-semibold mb-2">Unable to Track Order</p>
          <p className="text-muted-foreground mb-4">
            {authError
              ? "Your tracking link is invalid or has expired. Please check your confirmation email."
              : "Order not found."}
          </p>
          <a href="/" className="text-primary underline">
            Return to home
          </a>
        </div>
      </div>
    );
  }

  // Render order tracking UI
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg p-6 shadow">
          <h1 className="text-2xl font-bold mb-4">Order #{order.id}</h1>
          <p className="text-gray-600 mb-2">Status: <strong>{order.status}</strong></p>
          <p className="text-gray-600 mb-2">Total: ZMW {order.total_price}</p>
          <p className="text-gray-600">Delivery to: {order.delivery_address}</p>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
```

### 4. Create/Update TrackOrders.tsx - Multi-order guest view

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

const TrackOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestOrder, setGuestOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);

      // If authenticated, fetch user's orders
      if (user?.id) {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("buyer_id", user.id)
          .neq("status", "delivered")
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(20);

        if (!error && data) {
          setOrders(data);
        }
      } else {
        // If guest, try to load from localStorage
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Track Orders</h1>

        {guestOrder && !user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              📍 Guest order restored from your browser. Order #{guestOrder.id}
            </p>
          </div>
        )}

        {orders.length === 0 && !guestOrder && (
          <p className="text-gray-600">No active orders found.</p>
        )}

        {[...orders, ...(guestOrder ? [guestOrder] : [])].map((order) => (
          <div key={order.id} className="bg-white rounded-lg p-4 mb-4 shadow">
            <h2 className="font-bold">Order #{order.id}</h2>
            <p className="text-sm text-gray-600">Status: {order.status}</p>
            <p className="text-sm text-gray-600">Total: ZMW {order.total_price}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackOrders;
```

### 5. OTP Verification - Lock to 4 digits

**In OtpVerifyDrawer.tsx:**
```typescript
const handleVerify = async () => {
  // ✅ Enforce 4-digit hard limit
  if (code.length !== 4) {
    toast.error("Enter the full 4-digit code.");
    return;
  }
  // ... rest of logic
};

// In InputOTP, ensure maxLength={4}
<InputOTP maxLength={4} value={code} onChange={setCode}>
```

**In OtpVerificationKeypad.tsx:**
```typescript
const handleOtpInput = (digit: string) => {
  // ✅ Hard limit at 4 digits
  if (otp.length < 4) {
    setOtp(otp + digit);
    setError("");
  }
};

const handleVerify = async () => {
  // ✅ Strict 4-digit validation
  if (otp.length !== 4) {
    setError("OTP must be exactly 4 digits");
    return;
  }
  // ... rest
};

// In UI, disable keypad after 4 digits:
disabled={isVerifying || otp.length >= 4}  // ✅ Added >= 4
```

---

## STATE MACHINE REWRITE

### Old Flow (Incomplete)
```
pending → assigned → en_route_to_pickup → at_pickup → in_transit → delivered
```

### New Flow (Escrow + Logistics)
```
pending_payment   ← Buyer creates order (cart/checkout)
    ↓
paid              ← Escrow confirms payment (webhook)
    ↓
processing        ← SME accepts & releases order to riders
    ↓
assigned          ← Rider claims order on /gig-radar
    ↓
in_transit        ← Rider starts delivery
    ↓
delivered         ← Rider verifies OTP at destination
    ↓
[completed]       ← Escrow unlocks funds
```

### Implementation: Update gigStatusManager.ts

```typescript
// src/utils/gigStatusManager.ts

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

export const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
  return statusTransitions[currentStatus];
};

// Update order status with validation
export const updateOrderStatus = async (
  supabase: any,
  orderId: number,
  targetStatus: OrderStatus,
  agentId: string  // rider_id or runner_id
): Promise<boolean> => {
  // First, fetch current status
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("status, rider_id, runner_id")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) return false;

  // Validate ownership
  const isOwner = order.rider_id === agentId || order.runner_id === agentId;
  if (!isOwner) return false;

  // Validate transition
  if (!canTransition(order.status, targetStatus)) return false;

  // Apply update
  const { error: updateErr } = await supabase
    .from("orders")
    .update({ status: targetStatus })
    .eq("id", orderId);

  return !updateErr;
};
```

### Implementation: Update useBatchRoutingStateMachine.ts

```typescript
// Replace status progression with new state machine

const handlePickupConfirmation = async (orderId: number, otp: string) => {
  // Verify OTP
  const { data: order } = await supabase
    .from("orders")
    .select("otp_code, status")
    .eq("id", orderId)
    .single();

  if (order.otp_code !== otp) {
    return false;  // Invalid OTP
  }

  // Transition: assigned → in_transit
  const { error } = await supabase
    .from("orders")
    .update({ status: "in_transit" })
    .eq("id", orderId)
    .eq("rider_id", riderId);

  return !error;
};

const handleDeliveryConfirmation = async (orderId: number, otp: string) => {
  // Verify OTP
  const { data: order } = await supabase
    .from("orders")
    .select("otp_code, status")
    .eq("id", orderId)
    .single();

  if (order.otp_code !== otp) {
    return false;
  }

  // Transition: in_transit → delivered
  const { error } = await supabase
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", orderId)
    .eq("rider_id", riderId);

  return !error;
};
```

---

## GIG RADAR COMPLIANCE

### Update GigRadar.tsx to ONLY show `processing` orders

```typescript
// src/pages/GigRadar.tsx

const fetchOrders = async () => {
  // ✅ Only fetch orders with status = "processing"
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`id, sme_id, total_price, status, created_at`)
    .eq("status", "processing");  // ← Strict filter

  if (!error && orders) {
    // Cluster by SME
    const clustered = groupBy(orders, "sme_id");
    setClusters(clustered);
  }
};

const handleClaimBatch = async (batch: OrderBatch) => {
  // ✅ Transition: processing → assigned (single rider)
  const { error } = await supabase
    .from("orders")
    .update({
      status: "assigned",
      rider_id: currentUserId,
    })
    .in("id", batch.orderIds)
    .eq("status", "processing");  // Guard: only claim processing orders

  return !error;
};
```

### Update useOrderClustering.ts

```typescript
const { data: orders } = await supabase
  .from("orders")
  .select(`id, sme_id, total_price, status, created_at`)
  .eq("status", "processing")  // ← Only processing, not pending
  .order("created_at", { ascending: false });
```

---

## ROUTE UPDATES

### Ensure route structure matches

```typescript
// src/App.tsx

const routes = [
  // Single order tracking (guest or authenticated)
  <Route 
    path="/track-order/:order_id" 
    element={<OrderTracking />} 
  />,
  
  // Multi-order view (authenticated users)
  <Route 
    path="/track-orders" 
    element={<ProtectedRoute allowGuests><TrackOrders /></ProtectedRoute>} 
  />,
  
  // Gig radar (authenticated riders/runners)
  <Route 
    path="/gig-radar" 
    element={<ProtectedRoute roles={['rider', 'runner']}><GigRadar /></ProtectedRoute>} 
  />,
];
```

---

## TESTING CHECKLIST

### Guest Checkout Flow
- [ ] Checkout drawer submits
- [ ] Order inserted with `tracking_token` generated
- [ ] `hive_guest_order_session` saved to localStorage
- [ ] Redirect to `/track-order/:id?token=...` succeeds
- [ ] Guest can view order without login
- [ ] Refresh page: localStorage restores session

### State Machine
- [ ] Order starts in `pending_payment` (change from "pending")
- [ ] Escrow webhook transitions to `paid`
- [ ] SME accepts → transitions to `processing`
- [ ] Rider sees only `processing` orders on /gig-radar
- [ ] Rider claims → transitions to `assigned`
- [ ] Rider initiates pickup → transitions to `in_transit`
- [ ] Rider verifies OTP → transitions to `delivered`

### OTP Validation
- [ ] Dial pad locks at 4 digits (can't enter 5th)
- [ ] OTP input accepts only 4 characters
- [ ] Cannot submit with < 4 digits
- [ ] 4-digit OTP verification works

### RLS Policies
- [ ] Guest can INSERT order (anon)
- [ ] Guest cannot SELECT order (must use RPC)
- [ ] Buyer can SELECT own orders (authenticated)
- [ ] Rider cannot see orders in `pending_payment` or `paid`
- [ ] Rider CAN see orders in `processing`
- [ ] Rider can UPDATE only their assigned order

---

## ROLLBACK PLAN

If issues arise:
1. Keep old `gigStatusManager.ts` as backup
2. Add feature flag: `USE_NEW_STATE_MACHINE=false`
3. Revert migration: `DROP COLUMN tracking_token` if needed
4. RLS policies are additive; old policies still work

