# Order Creation Failure - Diagnostic Guide

## Problem
User sees: **"Order creation failed. Please try again."**

This occurs when the `secure_place_order` RPC returns a response with `status !== "success"`.

---

## Step 1: Verify Function Was Deployed Correctly

Run this in **Supabase SQL Editor**:

```sql
-- Check if function exists with correct signature
SELECT 
  routine_name,
  string_agg(ordinal_position::text || ':' || data_type, ', ' ORDER BY ordinal_position)::text as parameter_types
FROM information_schema.parameters
WHERE routine_schema = 'public' 
  AND routine_name = 'secure_place_order'
GROUP BY routine_name;
```

**Expected Result**:
```
routine_name        | parameter_types
secure_place_order  | 1:uuid, 2:bigint, 3:bigint, 4:bigint, 5:integer, 6:text, 7:text, 8:text, 9:date, 10:text, 11:text
```

**If this fails or shows multiple rows**: Run the cleanup migration
```
docs/migrations/2026-05-24_drop_duplicate_rpc_functions.sql
```

---

## Step 2: Test RPC Function Directly

In Supabase Dashboard → **Functions** → Click `secure_place_order` → **Invoke** tab

Use this test payload (replace with real IDs from your hive_catalogue):

```json
{
  "p_buyer_id": null,
  "p_item_id": 1,
  "p_sme_id": 1,
  "p_store_id": 1,
  "p_quantity": 1,
  "p_customer_name": "Test User",
  "p_customer_phone": "0977123456",
  "p_delivery_address": "Test Address",
  "p_scheduled_date": null,
  "p_service_notes": null,
  "p_item_type": "product"
}
```

**Expected Response**:
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

**If you get an error**: Note the error code and message, then proceed to Step 3.

---

## Step 3: Check Browser Console Logs

Open your browser's **Developer Console** (F12 → Console tab) while attempting checkout.

Look for messages like:
```
[Checkout] Empty RPC response
[Checkout] Order creation failed
[Checkout Error] ...
```

These will show:
- `result`: The actual response object
- `status`: What status was returned
- `message`: Server error message
- `rawResponse`: The raw data from Supabase

**Common Issues**:
- `status: "error"` with `message: "Item not found"` → Item ID doesn't exist
- `status: "error"` with `message: "Database error: ..."` → SQL error in RPC
- `result: null` → RPC returned empty result (function signature mismatch)
- No message field → Check if hive_catalogue table exists

---

## Step 4: Verify Required Tables & Columns

Run these checks in **Supabase SQL Editor**:

### Check hive_catalogue exists
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hive_catalogue'
ORDER BY ordinal_position;
```

**Required columns**:
- `id` (BIGINT) - PRIMARY KEY
- `price` (NUMERIC)
- `stock_count` (INT, nullable)

### Check orders table exists
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;
```

**Required columns**:
- `id` (BIGSERIAL) - PRIMARY KEY
- `buyer_id` (UUID, nullable)
- `item_id` (BIGINT)
- `sme_id` (BIGINT)
- `store_id` (BIGINT)
- `quantity` (INT)
- `total_amount` (NUMERIC)
- `total_price` (NUMERIC)
- `otp_code` (TEXT)
- `tracking_token` (UUID)
- `status` (TEXT)
- `customer_name` (TEXT)
- `customer_phone` (TEXT)
- `delivery_address` (TEXT, nullable)
- `scheduled_date` (DATE, nullable)
- `service_notes` (TEXT, nullable)
- `item_type` (TEXT, nullable)

If any are missing, you need to run the schema creation migration.

---

## Step 5: Check RLS Policies

Run this to verify INSERT policy exists:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'orders' 
AND cmd = 'INSERT';
```

**Required policy**:
```
policyname: allow_insert_orders
cmd: INSERT
with_check: true
```

If missing, run:
```sql
DROP POLICY IF EXISTS "allow_insert_orders" ON public.orders;
CREATE POLICY "allow_insert_orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);
```

---

## Step 6: Check Supabase Logs

In Supabase Dashboard → **Logs** → **Postgres**:

Filter for the approximate timestamp when you tried checkout. Look for:
- `DETAIL: Key (id)=...` errors (duplicate key)
- `ERROR: null value in column` errors
- `ERROR: foreign key violation` errors

These will show exactly what failed in the RPC.

---

## Common Solutions

### Solution A: Item Doesn't Exist
**Error**: `status: "error", message: "Item not found"`

**Fix**: Verify item ID exists in hive_catalogue:
```sql
SELECT id, product_name, price FROM hive_catalogue WHERE id = YOUR_ITEM_ID;
```

### Solution B: Schema Mismatch
**Error**: `Database error: column ... does not exist`

**Fix**: Run the orders table creation migration:
```
docs/migrations/2026-04-30_create_orders_table_from_scratch.sql
```

### Solution C: Function Signature Error
**Error**: `Could not choose the best candidate function` (PGRST203)

**Fix**: Run the cleanup migration:
```
docs/migrations/2026-05-24_drop_duplicate_rpc_functions.sql
```

### Solution D: Empty Result
**Error**: `result: null` or `result: undefined`

**Fix**: 
1. Verify function returns TABLE with correct columns
2. Check RLS policy allows INSERT
3. Check function has SECURITY DEFINER

---

## Debug Checklist

- [ ] Ran cleanup migration (`2026-05-24_drop_duplicate_rpc_functions.sql`)
- [ ] Function signature shows 11 parameters (uuid, bigint, bigint, bigint, int, text, text, text, date, text, text)
- [ ] RPC test invocation returns success response
- [ ] Browser console shows no "[Checkout]" errors
- [ ] hive_catalogue table has test item with price > 0
- [ ] orders table exists with all required columns
- [ ] INSERT policy exists on orders table
- [ ] Supabase Postgres logs show no errors

---

## Still Not Working?

If you've verified all the above and checkout still fails:

1. **Screenshot the RPC test response** (from Step 2)
2. **Screenshot the browser console errors** (from Step 3)
3. **Copy the Postgres error logs** (from Step 6)
4. Share these with your development team

This will pinpoint whether it's a schema, permissions, or RPC logic issue.
