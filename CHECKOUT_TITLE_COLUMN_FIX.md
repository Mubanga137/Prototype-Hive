# Fix: "[Checkout] Order creation failed" - Column "title" Does Not Exist

## Problem
When attempting to create an order via checkout, users were getting this error:
```
⚠️ Database error: column "title" does not exist
```

## Root Cause
The `orders` table in the database had a `title` column that shouldn't be there. This column is only meant for the `sme_notifications` table (for notification titles), not for orders.

### Why This Happened
Multiple schema migrations were applied over time, and at some point a `title` column was accidentally added to the `orders` table, while the RPC function and frontend code were never designed to use it.

## Solution

### 1. Apply the Cleanup Migrations
Two new migrations have been created to fix this:

**`docs/migrations/2026-05-26_remove_title_column_from_orders.sql`**
- Safely drops the `title` column from `orders` table if it exists
- Refreshes the schema cache

**`docs/migrations/2026-05-26_final_orders_schema_validation.sql`**
- Comprehensive validation of the complete `orders` table schema
- Ensures all required columns exist with correct types
- Drops and recreates minimal, correct RLS policies
- Ensures no "title" column exists
- Recreates all necessary indexes

### 2. Also Fixed in Code
**`src/components/CartDrawer.tsx` line 121**
- Changed: `store_id: smeId` → `store_id: storeId`
- This was using the wrong variable, causing incorrect store assignments in cart checkouts

## What the Orders Table Should Look Like

The `orders` table should have these columns (and ONLY these):

### Core
- `id` (bigserial, primary key)
- `created_at` (timestamp with time zone)

### User Info
- `buyer_id` (uuid, nullable - for guests)
- `customer_name` (text)
- `customer_phone` (text)

### Vendor Info
- `sme_id` (bigint)
- `store_id` (bigint)

### Product Info
- `item_id` (bigint)
- `offer_id` (bigint)
- `item_type` (text: "service", "physical", "digital")

### Order Details
- `quantity` (integer, default 1)
- `total_amount` (numeric)
- `total_price` (numeric)

### Delivery/Service
- `delivery_address` (text)
- `scheduled_date` (date)
- `service_notes` (text)

### Status & Verification
- `status` (text: "pending_payment", "processing", "assigned", etc.)
- `otp_code` (text)
- `tracking_token` (UUID, auto-generated)

### Logistics (Gig Workers)
- `node_id` (bigint)
- `rider_id` (bigint)
- `runner_id` (bigint)

### Pricing
- `hive_skim_amount` (numeric)
- `system_fee` (numeric)

### Flags
- `is_resold_item` (boolean)

**NO `title` COLUMN** ← This is the fix

## Why "title" Only Goes in sme_notifications

When an order is created, an edge function runs that inserts a notification for the store owner:

```sql
-- This is CORRECT - title goes into sme_notifications
INSERT INTO sme_notifications (sme_id, store_id, order_id, title, body, metadata)
VALUES (...);
```

The `sme_notifications` table has:
- `title` (text not null) ← notifications have titles
- `body` (text) ← notification body
- `metadata` (jsonb) ← the full order object

The `orders` table has NO title column - just order data.

## How to Apply the Fix

### Option 1: Automatic (Recommended)
1. The migrations in `docs/migrations/2026-05-26_*.sql` will be applied automatically when you deploy
2. Wait for the migrations to run
3. Restart your dev server or refresh the browser
4. Try checkout again - it should now work

### Option 2: Manual via Supabase Dashboard
1. Go to https://app.supabase.com → Your Project → SQL Editor
2. Copy the SQL from `docs/migrations/2026-05-26_final_orders_schema_validation.sql`
3. Run it
4. Wait 30 seconds for schema cache refresh
5. Restart dev server

### Option 3: Via Supabase CLI
```bash
# If you have supabase CLI installed
supabase db push
```

## Verification

After applying the migrations, verify the fix:

### Check Column Schema
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
-- Should NOT include a "title" row
```

### Verify No Title Column
```sql
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'title';
-- Should return: 0
```

### Test Checkout
1. Go to storefront
2. Add item to cart (or click BUY)
3. Click "Proceed to Checkout"
4. Fill in details and submit
5. Should succeed without "title" error

## Timeline

- **Checkout RPC** (`secure_place_order`): ✅ Never uses title
- **CartDrawer Insert**: ✅ Never uses title
- **CheckoutDrawer RPC**: ✅ Never uses title
- **Edge Function Notification**: ✅ Correctly puts title in `sme_notifications`, not `orders`
- **Database Schema**: ❌ Had title column in orders table (FIXED)

## Related Files

- Migration 1: `docs/migrations/2026-05-26_remove_title_column_from_orders.sql`
- Migration 2: `docs/migrations/2026-05-26_final_orders_schema_validation.sql`
- Code fix: `src/components/CartDrawer.tsx` (line 121)
- Edge function (correct): `docs/edge-functions/notify-new-order/index.ts` (uses title for sme_notifications)
- RPC function (correct): `docs/migrations/2026-05-24_drop_duplicate_rpc_functions.sql`
