# PostgreSQL Function Overload Error - PGRST203

## Problem

```
Could not choose the best candidate function between:
- public.secure_place_order(...p_item_id => uuid, p_sme_id => uuid, p_store_id => uuid, p_scheduled_date => text, ...)
- public.secure_place_order(...p_item_id => bigint, p_sme_id => bigint, p_store_id => bigint, p_scheduled_date => date, ...)
```

**Root Cause**: Two conflicting function signatures exist in your Supabase database:
- One with **incorrect types** (UUID for IDs, TEXT for dates) - likely from an earlier migration
- One with **correct types** (BIGINT for IDs, DATE for dates) - from the recent hardening work

PostgreSQL cannot automatically choose between them, so RPC calls fail.

---

## Solution: Drop & Recreate

### Step 1: Run Cleanup Migration in Supabase SQL Editor

Copy and paste **ALL** of this into your Supabase SQL Editor:

```sql
-- =====================================================================
-- CLEANUP: Drop All Duplicate/Incorrect secure_place_order Functions
-- =====================================================================

-- Drop all versions (all possible signatures)
DROP FUNCTION IF EXISTS public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS public.secure_place_order(
  UUID, UUID, UUID, UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) CASCADE;

DROP FUNCTION IF EXISTS public.secure_place_order(
  UUID, TEXT, TEXT, TEXT, UUID, TEXT, INTEGER, TEXT, TEXT, UUID, UUID
) CASCADE;

DROP FUNCTION IF EXISTS public.secure_place_order() CASCADE;

-- Recreate ONLY the correct function with proper types
CREATE FUNCTION public.secure_place_order(
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
) AS $$
DECLARE
  v_item_price NUMERIC;
  v_stock_count INT;
  v_otp_code TEXT;
  v_total_amount NUMERIC;
  v_order_id BIGINT;
  v_tracking_token UUID;
  v_item_type TEXT;
  v_buyer_id UUID;
  v_sme_id BIGINT;
  v_store_id BIGINT;
BEGIN
  v_buyer_id := NULLIF(p_buyer_id::TEXT, '')::UUID;
  v_sme_id := NULLIF(p_sme_id::TEXT, '')::BIGINT;
  v_store_id := NULLIF(p_store_id::TEXT, '')::BIGINT;
  v_item_type := COALESCE(p_item_type, 'product');
  
  v_otp_code := LPAD((RANDOM() * 9000 + 1000)::INT::TEXT, 4, '0');

  SELECT price, stock_count INTO v_item_price, v_stock_count
  FROM public.hive_catalogue
  WHERE id = p_item_id;

  IF v_item_price IS NULL THEN
    RETURN QUERY SELECT
      NULL::BIGINT,
      NULL::NUMERIC,
      v_otp_code,
      NULL::UUID,
      'error'::TEXT,
      'Item not found or has been removed'::TEXT;
    RETURN;
  END IF;

  IF v_item_type = 'service' THEN
    v_total_amount := v_item_price;
  ELSE
    IF v_item_type IN ('physical', 'product') AND v_stock_count IS NOT NULL THEN
      IF v_stock_count < p_quantity THEN
        RETURN QUERY SELECT
          NULL::BIGINT,
          NULL::NUMERIC,
          v_otp_code,
          NULL::UUID,
          'insufficient_stock'::TEXT,
          ('Only ' || v_stock_count || ' items available')::TEXT;
        RETURN;
      END IF;
    END IF;
    v_total_amount := v_item_price * p_quantity;
  END IF;

  v_tracking_token := gen_random_uuid();

  INSERT INTO public.orders (
    buyer_id,
    item_id,
    sme_id,
    store_id,
    total_amount,
    total_price,
    quantity,
    otp_code,
    tracking_token,
    status,
    customer_name,
    customer_phone,
    delivery_address,
    scheduled_date,
    service_notes,
    item_type
  ) VALUES (
    v_buyer_id,
    p_item_id,
    v_sme_id,
    v_store_id,
    v_total_amount,
    v_total_amount,
    CASE WHEN v_item_type = 'service' THEN 1 ELSE p_quantity END,
    v_otp_code,
    v_tracking_token,
    'pending_payment'::TEXT,
    p_customer_name,
    p_customer_phone,
    p_delivery_address,
    p_scheduled_date,
    p_service_notes,
    v_item_type
  )
  RETURNING id INTO v_order_id;

  RETURN QUERY SELECT
    v_order_id::BIGINT,
    v_total_amount::NUMERIC,
    v_otp_code::TEXT,
    v_tracking_token::UUID,
    'success'::TEXT,
    'Order placed successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    NULL::BIGINT,
    NULL::NUMERIC,
    v_otp_code,
    NULL::UUID,
    'error'::TEXT,
    ('Database error: ' || SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.secure_place_order(
  UUID, BIGINT, BIGINT, BIGINT, INT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT
) TO anon, authenticated, public;

ANALYZE public.orders;
ANALYZE public.hive_catalogue;
```

### Step 2: Verify Success

Run this verification query in the same SQL Editor:

```sql
SELECT 
  routine_name,
  string_agg(ordinal_position::text || ':' || data_type, ', ' ORDER BY ordinal_position)::text as parameters
FROM information_schema.parameters
WHERE routine_schema = 'public' 
  AND routine_name = 'secure_place_order'
GROUP BY routine_name;
```

**Expected Result**: Single row showing ONE function with parameters:
```
routine_name        | parameters
secure_place_order  | 1:uuid, 2:bigint, 3:bigint, 4:bigint, 5:integer, 6:text, 7:text, 8:text, 9:date, 10:text, 11:text
```

### Step 3: Test Checkout

The checkout should now work without the PGRST203 error. Try placing an order as a guest or authenticated user.

---

## Why This Happened

1. Previous migrations or manual Supabase dashboard actions created `secure_place_order` with incorrect parameter types
2. Recent hardening created a NEW function with correct types (BIGINT, DATE)
3. PostgreSQL couldn't disambiguate which to use → PGRST203 error

---

## Prevention

- Always DROP old function signatures before CREATE OR REPLACE when changing parameter types
- Use versioned migration naming (e.g., v1, v2) if upgrading function signatures
- Test RPC calls in Supabase's API editor before deploying frontend code

---

## Reference Files

- **Cleanup Migration**: `docs/migrations/2026-05-24_drop_duplicate_rpc_functions.sql`
- **Frontend Code**: `src/components/CheckoutDrawer.tsx` (already hardened with `parseInt()`)
- **Architecture**: `docs/CHECKOUT_HARDENING_IMPLEMENTATION.md`
