# Checkout Process Schema Audit & Fix

## Current Issue
```
Error: Could not find the 'customer_name' column of 'orders' in the schema cache
Status: 400 PGRST204
```

This error means Supabase's PostgreSQL schema cache is out of sync with the actual database. The columns physically exist, but the cache doesn't know about them.

---

## Required Columns for Checkout

The checkout process (both `CheckoutDrawer.tsx` and `CartDrawer.tsx`) requires these columns in the `orders` table:

### Core Order Fields
| Column | Type | Source | Required | Notes |
|--------|------|--------|----------|-------|
| `buyer_id` | uuid/text | auth.uid() | No | Null for guest checkouts |
| `sme_id` | bigint | item.sme_id | Yes | Store/vendor ID |
| `store_id` | bigint | item.store_id | Yes | Explicit store reference, FK to sme_stores |
| `item_id` | bigint | item.id | Yes | Product/service ID, FK to hive_catalogue |
| `status` | text | "pending" | Yes | Order status (pending, confirmed, etc.) |

### Pricing Fields
| Column | Type | Source | Required | Notes |
|--------|------|--------|----------|-------|
| `quantity` | integer | 1 (services) or user input (products) | Yes | Default 1 |
| `total_amount` | numeric(12,2) | price × quantity | Yes | Order total in ZMW |
| `total_price` | numeric(12,2) | price × quantity | Yes | Duplicate of total_amount (may be redundant) |

### Customer Info Fields (MISSING - CAUSING ERROR)
| Column | Type | Source | Required | Notes |
|--------|------|--------|----------|-------|
| `customer_name` | text | User input (name field) | Yes | ❌ MISSING FROM SCHEMA CACHE |
| `customer_phone` | text | Cleaned Zambian phone | Yes | ❌ MISSING FROM SCHEMA CACHE |
| `delivery_address` | text | User input or null | No | Required for products, null for services |

### Service-Specific Fields
| Column | Type | Source | Required | Notes |
|--------|------|--------|----------|-------|
| `scheduled_date` | date | User date picker | No | Only for services |
| `service_notes` | text | User textarea | No | Only for services |

### Internal Fields
| Column | Type | Source | Required | Notes |
|--------|------|--------|----------|-------|
| `otp_code` | text | Generated 6-digit code | Yes | For WhatsApp verification |
| `item_type` | text | item.item_type | No | "service", "physical", "digital" |
| `offer_id` | bigint | Related offer | No | FK to hive_catalogue |

---

## Root Cause

The migration `2026-04-17_orders_checkout_fields.sql` attempted to add these columns:
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name     text,
  ADD COLUMN IF NOT EXISTS customer_phone    text,
  ADD COLUMN IF NOT EXISTS delivery_address  text,
  -- ... and others
```

**The problem:** After adding columns to PostgreSQL, Supabase's schema cache must be refreshed. The standard fix is running `ANALYZE public.orders;` but sometimes Supabase needs 2-5 minutes to fully sync, or the cache needs a forced refresh.

---

## How to Fix

### Option 1: Quick Fix (Recommended)
1. **Run the migration SQL** in Supabase SQL Editor:
   ```
   docs/migrations/2026-04-29_orders_checkout_columns_audit_and_fix.sql
   ```
   This ensures all columns exist and forces cache refresh.

2. **Wait 2-5 minutes** for Supabase to refresh its schema cache

3. **Restart dev server** or clear browser cache

4. **Test checkout** again

### Option 2: Manual Supabase Fix
If Option 1 doesn't work:

1. Go to Supabase SQL Editor
2. Copy the full migration from `docs/migrations/2026-04-29_orders_checkout_columns_audit_and_fix.sql`
3. Paste and run in the SQL editor
4. Wait 5 minutes minimum
5. Try checkout again

### Option 3: Schema Regeneration
If columns still don't appear:
1. In Supabase, go to Database → Schema Editor
2. Find the `orders` table
3. Manually verify all columns listed in "Required Columns" section exist
4. If missing, add them via SQL:
   ```sql
   ALTER TABLE public.orders ADD COLUMN customer_name text;
   ALTER TABLE public.orders ADD COLUMN customer_phone text;
   ALTER TABLE public.orders ADD COLUMN delivery_address text;
   -- ... etc
   ```
5. Run `ANALYZE public.orders;`
6. Wait 5 minutes, restart dev server

---

## Code Changes Already Made

✅ `src/components/CheckoutDrawer.tsx`:
- Added `quantity` field to insert payload (line 182)
- Improved error logging with `status` field (line 203)

✅ `src/components/CartDrawer.tsx`:
- Added `quantity` field to insert payload (line 127)
- Improved error logging with `status` field (line 145)

---

## Testing the Fix

After running the migration, verify with this SQL:
```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN (
    'customer_name', 'customer_phone', 'delivery_address',
    'scheduled_date', 'service_notes', 'otp_code', 'quantity'
  )
ORDER BY column_name;
```

Should return 7 rows, all with the expected data types.

---

## Related Errors to Watch For

| Error | Cause | Fix |
|-------|-------|-----|
| `PGRST204: Could not find the 'X' column` | Schema cache out of sync | Run `ANALYZE`, wait 5 min, restart |
| `PGRST204: Could not find the 'Y' column of 'orders'` | Missing actual column | Create column via `ALTER TABLE` |
| `400 Bad Request` on insert | Multiple causes; see console | Check payload for invalid field names |
| `RLS policy violation` | Policy blocks insert | Check RLS policies allow "anyone can place an order" |

---

## Checkout Flow Reference

```
User fills form (CheckoutDrawer.tsx)
    ↓
handleSubmit() validates input
    ↓
Creates insertPayload with:
  - buyer_id, sme_id, store_id, item_id
  - total_amount, total_price, quantity
  - customer_name, customer_phone, delivery_address
  - scheduled_date, service_notes, otp_code
  - status = "pending"
    ↓
supabase.from("orders").insert(insertPayload).select("id")
    ↓
If successful → Show success toast → Redirect to WhatsApp
If error → Show error toast → Log full error details
```

The insert will fail if ANY of these columns don't exist:
- ❌ `customer_name`
- ❌ `customer_phone`
- ❌ `delivery_address`
- ❌ `scheduled_date`
- ❌ `service_notes`
- ❌ `otp_code`
- ❌ `quantity`
- ❌ `total_amount`
- ❌ `total_price`

---

## Timeline of Migrations

1. `2026-04-17_orders_checkout_fields.sql` - Initial column additions
2. `2026-04-28_orders_schema_cache_refresh.sql` - Attempted cache refresh
3. `2026-04-29_orders_checkout_columns_audit_and_fix.sql` - **← APPLY THIS NOW**

---

## Next Steps

1. **Apply migration** `2026-04-29_orders_checkout_columns_audit_and_fix.sql` in Supabase
2. **Wait 5 minutes** for schema cache refresh
3. **Restart dev server**
4. **Test checkout** with a test product
5. Monitor console for any remaining errors

If checkout still fails, share the full error message from the browser console for further debugging.
