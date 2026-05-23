# Checkout Hardening Implementation
## Principal Frontend Engineer Hardening - Backend-Driven Architecture

**Date**: 2026-05-24  
**Status**: ✅ Implementation Complete  
**Scope**: CheckoutDrawer.tsx + secure_place_order RPC

---

## Executive Summary

The checkout flow has been hardened to follow **zero-trust architecture** principles:
- **Client-side**: Acts as a sterile input terminal only
- **Backend**: Owns all business logic, pricing calculation, and inventory validation
- **Parameter Alignment**: Strict type-casting prevents UUID/BIGINT coercion errors
- **Guest Continuity**: Secure localStorage caching with unguessable UUID tokens

---

## Implementation Rules Applied

### 1. ✅ Eliminated Client-Side Business Logic

**Before**: CheckoutDrawer calculated `totalAmount = item.price * quantity` locally

**After**: 
- Client shows only an **estimate** based on item list price
- Final total is computed server-side in RPC
- Browser never calculates fees, discounts, or taxes

**Code**: Lines 136-139 remain as display-only estimates; actual pricing from RPC response (line 220)

---

### 2. ✅ Parameter Alignment with Type-Safety

**Before**: 
```javascript
p_item_id: Number(item.id)           // Could pass string "7"
p_sme_id: item.sme_id ? Number(item.sme_id) : null
```

**After**: 
```javascript
p_item_id: parseInt(String(item.id), 10)              // BIGINT: Explicit int cast
p_sme_id: item.sme_id ? parseInt(String(item.sme_id), 10) : null
p_store_id: item.store_id 
  ? parseInt(String(item.store_id), 10) 
  : (item.sme_id ? parseInt(String(item.sme_id), 10) : null)
p_quantity: isService ? 1 : parseInt(String(quantity), 10)  // INT: Explicit cast
```

**Prevents**: `invalid input syntax for type uuid: "7"` errors from String→UUID coercion in PostgreSQL

**Scope**: Lines 173-187 (CheckoutDrawer.tsx)

---

### 3. ✅ Response Routing & Payload Handoff

**Response Structure** (from RPC):
```json
{
  "order_id": 12345,
  "total_to_pay": 450.50,
  "otp_code": "7342",
  "tracking_token": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "message": "Order placed successfully"
}
```

**Error Handling** (Lines 189-215):
- Network errors → Display `error.message` via toast
- Business errors (insufficient_stock) → Server message via toast
- No client-side error fabrication

**Success Path** (Lines 217-277):
- Extract: `order_id`, `tracking_token`, `total_to_pay`, `otp_code`
- Services route to `/messages`
- Guest products route to `/ledger/{tracking_token}` (unguessable 36-char UUID)
- Authenticated products route to `/track-orders`

---

### 4. ✅ Safe Guest Continuity

**localStorage Key**: `hive_guest_active_cart` (standardized)

**Data Structure**:
```javascript
{
  "order_id": 12345,
  "tracking_token": "550e8400-e29b-41d4-a716-446655440000",  // 36-char UUID
  "customer_phone": "260977123456",
  "total_to_pay": 450.50,
  "otp_code": "7342",
  "timestamp": 1716561234567
}
```

**Purpose**: 
- Recovers guest session if network drops in in-app webviews
- Enables browser back-button recovery without data loss
- Phone number included for manual lookup fallback

**Code**: Lines 225-234 (CheckoutDrawer.tsx)

---

## Database Schema Alignment

### RPC Function Signature
```sql
CREATE FUNCTION secure_place_order(
  p_buyer_id UUID,                 -- NULL for guests
  p_item_id BIGINT,                -- From hive_catalogue.id
  p_sme_id BIGINT,                 -- From sme_stores.id
  p_store_id BIGINT,               -- From sme_stores.id
  p_quantity INT,                  -- 1 for services, N for products
  p_customer_name TEXT,            -- Sterile trim()
  p_customer_phone TEXT,           -- Sterile trim()
  p_delivery_address TEXT,         -- NULL for services
  p_scheduled_date DATE,           -- NULL for products
  p_service_notes TEXT,            -- NULL if empty
  p_item_type TEXT                 -- 'product' | 'service'
)
```

**Type Casting in RPC** (v2026-05-24):
```sql
-- Explicit casting prevents JavaScript string-to-UUID coercion errors
v_buyer_id := NULLIF(p_buyer_id::TEXT, '')::UUID;
v_sme_id := NULLIF(p_sme_id::TEXT, '')::BIGINT;
v_store_id := NULLIF(p_store_id::TEXT, '')::BIGINT;
```

**Migration**: `docs/migrations/2026-05-24_fix_secure_place_order_uuid_mismatch.sql`

---

## Routing Architecture

```
CheckoutDrawer.tsx
  ├─ Input validation (client-side only)
  ├─ Call RPC secure_place_order()
  │   └─ Backend validates inventory, calculates price, creates order
  ├─ Parse response
  └─ Route based on type + auth
      ├─ SERVICE + authenticated → /messages
      ├─ SERVICE + guest → /messages
      ├─ PRODUCT + guest → /ledger/{tracking_token}
      └─ PRODUCT + authenticated → /track-orders
```

---

## Security Improvements

| Issue | Before | After |
|-------|--------|-------|
| **Type Safety** | String→UUID coercion errors | Explicit `parseInt()` casting |
| **Price Calculation** | Client-side (manipulable) | Server-side RPC only |
| **Inventory Validation** | Client estimates | Server authoritative check |
| **Guest Tracking** | OTP-only fallback | Unguessable 36-char UUID token |
| **State Management** | localStorage key inconsistent | Standardized `hive_guest_active_cart` |
| **Error Messages** | Generic client errors | Server-computed error details |

---

## Testing Checklist

- [ ] **Happy Path (Guest Product)**
  - Fill form → Submit → See success toast → Redirected to `/ledger/{token}`
  - localStorage contains `hive_guest_active_cart` with valid data

- [ ] **Happy Path (Authenticated Product)**
  - Fill form → Submit → See success toast → Redirected to `/track-orders`
  
- [ ] **Happy Path (Service Booking)**
  - Select service date + notes → Submit → Redirected to `/messages`

- [ ] **Error: Insufficient Stock**
  - Set quantity higher than available → Submit → See "Not enough stock" toast

- [ ] **Error: Item Not Found**
  - (Manually test if catalog deleted) → See "Item not found" toast

- [ ] **Network Drop Recovery (Guest)**
  - Start checkout → Network fails mid-request → localStorage has fallback data

- [ ] **Type Safety**
  - No console errors about uuid parsing
  - RPC logs show correct BIGINT values in PostgreSQL

- [ ] **Quantity Edge Cases**
  - Quantity 1 → OK
  - Quantity 99 → OK
  - Quantity 0 → Validation error (client-side)
  - Quantity -1 → Validation error (client-side)

---

## Deployment Notes

### Required SQL Migration
Run in Supabase SQL Editor:
```
docs/migrations/2026-05-24_fix_secure_place_order_uuid_mismatch.sql
```

### Frontend Changes
- `src/components/CheckoutDrawer.tsx` (already deployed)
- Uses `parseInt(String(x), 10)` for all BIGINT/INT parameters
- localStorage key standardized to `hive_guest_active_cart`
- Guest routing updated to `/ledger/{tracking_token}`

### Backward Compatibility
- ✅ Old `hive_guest_orders` localStorage entries will not interfere
- ✅ Old `/track-order` URLs still work (no routing changes needed elsewhere)
- ✅ New `/ledger` route should be added to router (if not already present)

---

## Monitoring & Logging

### RPC Error Codes to Watch
- `22P02`: Invalid input syntax for type → Type casting issue (should be fixed)
- `23502`: Not null violation → Missing required field
- `23503`: Foreign key violation → Invalid item_id/sme_id
- `42P01`: Undefined table → Schema mismatch

### Client-Side Metrics
- Track localStorage `hive_guest_active_cart` hit rate
- Monitor `/ledger/{token}` page views vs. guest order success rate
- Alert if RPC response time > 5 seconds

---

## Reference Documentation

- **RPC Function**: `docs/migrations/2026-05-24_fix_secure_place_order_uuid_mismatch.sql`
- **Component**: `src/components/CheckoutDrawer.tsx`
- **Architecture**: This file (CHECKOUT_HARDENING_IMPLEMENTATION.md)
- **Security Policy**: `docs/CHECKOUT_SECURITY_ARCHITECTURE.md`
