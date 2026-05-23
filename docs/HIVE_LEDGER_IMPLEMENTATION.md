# The Hive Ledger — Post-Purchase B2C Dashboard

## 🎯 Overview

**The Hive Ledger** (`/customer-dash/my-orders`) is an elite neobrutalist post-purchase dashboard designed for African B2C customers managing their active orders and history. It enforces a **security-first design** with visually prominent OTP PIN protection and instant status visibility.

---

## 🏗️ Architecture & Components

### 1. **Route Integration**
- **Path**: `/customer-dash/my-orders`
- **Auth**: Protected route (requires authenticated user)
- **File**: `src/pages/customer/MyOrders.tsx` (486 lines)
- **Added to**: `src/App.tsx` routing

### 2. **Page Structure**

```
┌─────────────────────────────────────────────────────────────────┐
│  LEDGER HEADER (Navy #0F1A35)                                   │
│  ┌─────────────────────────┬─────────────────────────────────┐ │
│  │ Avatar + Hello, [Name]  │  Active Orders: N  Tokens: N    │ │
│  └─────────────────────────┴─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│  FILTER TOGGLE (Segmented)                                      │
│  [📦 Active Orders] [📜 Order History]                          │
│  └─ Gold underline animates on active state                     │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  ORDER CARDS (White, shadow, 16px radius, mb-6)                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Order #10293  [📋] ............... Vendor: [SME Name]    │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ [60x60 thumb] Product Name          ZMW [Price]          │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  ① Locked ────── ② Processing ────── ③ Ready for Handoff │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  🔒 Secure PIN                                      │ │ │
│  │  │                                                      │ │ │
│  │  │     [BLURRED]  [👁️ Tap to Reveal]                  │ │ │
│  │  │                                                      │ │ │
│  │  │  ⚠️ Supply PIN to courier ONLY AFTER inspection     │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ [💬 Hive Digital Secretary] [❌ Request Cancellation]    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Design Tokens

| Element | Color | Purpose |
|---------|-------|---------|
| Background | `#FFFBF2` (Ivory) | Minimalist, low-bandwidth friendly |
| Headers | `#0F1A35` (Deep Navy) | High contrast, elite feel |
| Accents | `#B37C1C` (Rich Gold) | Action buttons, interactive states |
| Borders (OTP) | `2px dashed #B37C1C` | Draws attention to security vault |
| Status (Active) | `#B37C1C` | Processing / in-transit states |
| Status (Delivered) | `#22c55e` | Success confirmation |
| Status (Cancelled) | `#ef4444` | Destructive/warning state |

---

## 📋 Component Features

### A. **LedgerHeader**
- **Left**: Circular avatar (initials), greeting "Welcome back" + user name
- **Right**: Stacked stats in gold
  - `Active Orders: N`
  - `Delivery Tokens: N`
- **Sticky**: Top-mounted, z-40, shadow for depth

### B. **Filter Toggle**
- **Tabs**: `📦 Active Orders` | `📜 Order History`
- **Animation**: Gold underline slides (layout animation)
- **Logical split**:
  - **Active**: pending_payment, pending_vendor, locked, processing, ready_for_handoff
  - **History**: delivered, cancelled, refunded, etc.

### C. **Order Card**
- **Header Block**: Order #ID [copy icon] | Vendor name (right-aligned)
- **Product Row**: 60×60 thumbnail, product name (line-clamp-1), total price in gold
- **Status Stepper**: Horizontal animated progress
  - `① Locked` (gray/gold) → `② Processing` (gold) → `③ Ready` (gold) → `✓ Complete`
- **Current status label** (small italic text below)

### D. **Secure OTP Vault** (CRITICAL)
- **Bounding box**: Gold dashed border (2px), ivory background
- **PIN display**: 
  - Default: `• • • • • • • • • • • • • • • •` (blurred)
  - Revealed: `4 9 2 1` (spaced monospace)
  - Toggle: `[👁️ Tap to Reveal]` button
- **Warning**: Red italic text
  - "⚠️ **Crucial**: Supply this 4-Digit Secure Handoff PIN to the courier **ONLY AFTER** physically inspecting your items."

### E. **Action Buttons**
- **Hive Digital Secretary**: Border navy, ghost style
  - Links to: `https://wa.me/?text=Order%20%23{id}`
- **Request Cancellation**: Border red
  - **Disabled** (opacity-50) if status beyond `locked`
  - Enabled only for: pending_payment, pending_vendor, locked

---

## 🔐 Backend Integration

### New RPC Function: `secure_place_order`

**Location**: `docs/migrations/2026-05-22_secure_place_order_rpc.sql`

**Signature**:
```sql
CREATE FUNCTION secure_place_order(
  p_buyer_id UUID,
  p_item_id BIGINT,
  p_sme_id BIGINT,
  p_store_id BIGINT,
  p_quantity INT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_address TEXT,
  p_scheduled_date DATE,
  p_service_notes TEXT,
  p_item_type TEXT
)
RETURNS TABLE (
  order_id BIGINT,
  total_to_pay NUMERIC,
  otp_code TEXT,
  tracking_token UUID,
  status TEXT,
  message TEXT
)
```

**Behavior**:
1. Validates item exists and fetches price
2. Checks stock count for physical products
3. Calculates `total_to_pay` (price × quantity)
4. Generates random 4-digit OTP
5. Generates tracking UUID
6. Atomically inserts order row
7. Returns order metadata + OTP
8. Handles all errors gracefully (returns status='error' with message)

**Benefits**:
- ✅ Prevents race conditions (atomic insert)
- ✅ Real-time stock validation
- ✅ Dynamic price calculation
- ✅ Works for guests (SECURITY DEFINER)
- ✅ Returns OTP immediately (no SELECT needed)

### Updated CheckoutDrawer

**File**: `src/components/CheckoutDrawer.tsx`

**Old Flow**:
```javascript
await supabase.from("orders").insert({...}).select("id, tracking_token")
```

**New Flow**:
```javascript
const { data, error } = await supabase.rpc("secure_place_order", {
  p_buyer_id: user?.id ?? null,
  p_item_id: item.id,
  p_sme_id: item.sme_id,
  // ... other params
});

const result = data?.[0];
if (result.status === "success") {
  const orderId = result.order_id;
  const otp = result.otp_code;
  const total = result.total_to_pay;
  // Proceed with payment flow
}
```

**Benefits**:
- ✅ Real-time price validation
- ✅ Stock check before commitment
- ✅ Atomic transaction
- ✅ Clear error messaging (insufficient_stock, item_not_found)
- ✅ Toast notifications before MoMo SDK prompt

---

## 🔄 Data Flow

### 1. **Order Placement** (Checkout → RPC)
```
User clicks "Place Order" in CheckoutDrawer
    ↓
Validate form (name, phone, address/date)
    ↓
Call secure_place_order RPC
    ├─ Validate item exists
    ├─ Fetch current price
    ├─ Check stock (if physical)
    ├─ Calculate total
    ├─ Generate OTP & tracking token
    ├─ INSERT orders row (SECURITY DEFINER privilege)
    └─ Return: order_id, otp_code, tracking_token, total_to_pay
    ↓
Handle response:
  - success → Show toast "Secured in Escrow" → WhatsApp handoff
  - insufficient_stock → Show error, allow re-qty
  - error → Show user-friendly message
```

### 2. **Order Viewing** (Ledger Dashboard)
```
User navigates to /customer-dash/my-orders
    ↓
useEffect fetches orders:
  SELECT * FROM orders
    LEFT JOIN hive_catalogue (product name, image)
    LEFT JOIN sme_stores (vendor name)
  WHERE buyer_id = user.id
    ↓
Split into:
  - Active: pending_payment, locked, processing, ready_for_handoff
  - History: delivered, cancelled, etc.
    ↓
Render OrderCard for each
  - Map status to step (0-3)
  - Show OTP (blurred)
  - Enable/disable cancellation button based on status
```

### 3. **OTP Reveal** (Security Toggle)
```
User taps "👁️ Tap to Reveal"
    ↓
Toggle revealedOtps Set (client-side, no backend call)
    ↓
PIN transitions from blur to visible (4 9 2 1 formatted)
    ↓
User taps icon → Copy PIN to clipboard
    ↓
Toast: "PIN copied!"
```

---

## 🛠️ File Structure

```
src/
├── pages/
│   └── customer/
│       └── MyOrders.tsx (NEW - 486 lines)
│           ├── Ledger Header (Navy stats bar)
│           ├── Filter Toggle (Active/History)
│           ├── Order Card Loop
│           │   ├── Header (Order #, Copy, Vendor)
│           │   ├── Product Row (Thumb, Name, Price)
│           │   ├── Status Stepper (Animated)
│           │   ├── Secure OTP Vault (Dashed Gold box)
│           │   └── Action Buttons (WhatsApp, Cancel)
│           └── Empty States
│
├── components/
│   └── CheckoutDrawer.tsx (UPDATED)
│       └── handleSubmit now calls secure_place_order RPC
│
├── App.tsx (UPDATED)
│   └── Added route: /customer-dash/my-orders → MyOrders
│
└── docs/
    └── migrations/
        └── 2026-05-22_secure_place_order_rpc.sql (NEW)
            └── Creates secure_place_order function
```

---

## 🚀 Deployment Checklist

- [ ] **Database**: Run migration `2026-05-22_secure_place_order_rpc.sql`
  ```bash
  # Via Supabase UI → SQL Editor, or CLI
  supabase db push
  ```
  
- [ ] **Frontend**: Build & deploy
  ```bash
  npm run build
  # Upload dist/ to your hosting
  ```

- [ ] **Testing**:
  - [ ] Navigate to `/customer-dash/my-orders` (must be logged in)
  - [ ] Verify header shows active order count + tokens
  - [ ] Switch between "Active Orders" and "Order History" tabs
  - [ ] Place a new order via CheckoutDrawer
    - [ ] Should call RPC (check network tab)
    - [ ] Should show total_to_pay in success toast
  - [ ] View new order in ledger
    - [ ] PIN is blurred initially
    - [ ] Tap to reveal works
    - [ ] Copy button works
  - [ ] Verify status stepper shows correct step
  - [ ] Test cancellation button (disabled after locked)

---

## 📱 Responsiveness

- **Desktop (lg)**: 2-column (sidebar + content), cards 100% width
- **Tablet (md)**: Full-width cards, buttons side-by-side
- **Mobile (sm)**: Full-width everything, stacked buttons, font adjustments
- **3G Connection**: Minimalist CSS, no JS animations on scroll, images lazy-loaded

---

## 🎯 Security Considerations

1. **OTP PIN Protection**:
   - Blurred by default (prevents shoulder-surfing in screenshots)
   - One-tap reveal (client-side toggle)
   - Copy-to-clipboard (never exposed in URL/logs)
   - Warning label emphasizes inspection-first protocol

2. **Backend**:
   - RPC runs as SECURITY DEFINER (elevated privileges)
   - Allows guests & authenticated users to insert orders
   - Stock validation prevents overselling
   - Price calculated server-side (cannot be manipulated by client)

3. **Data Access**:
   - MyOrders page requires authentication (ProtectedRoute)
   - RLS ensures users see only their own orders

---

## 🔮 Future Enhancements

1. **Order Tracking Integration**: Live GPS updates for in-transit orders
2. **OTP Verification Workflow**: Courier scans order + OTP to confirm
3. **Cancellation Fees**: Smart fee calculation based on order stage
4. **Auto-Refund**: Immediate escrow return if order times out
5. **Ratings/Reviews**: Post-delivery customer feedback
6. **Bulk Orders**: Dashboard for wholesale/bulk purchase tracking

---

## 📞 Support

For issues, file an issue with:
- Browser/device info
- Order ID (if visible)
- Steps to reproduce
- Screenshots (if safe)

---

**Built with ❤️ for The Hive.** Minimalist. Secure. African-first. 🚀
