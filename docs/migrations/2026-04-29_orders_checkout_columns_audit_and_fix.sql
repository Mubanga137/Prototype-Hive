-- =====================================================================
-- CRITICAL FIX: Orders Table Checkout Columns & Schema Cache
-- =====================================================================
-- Issue: Supabase schema cache doesn't recognize customer_name, customer_phone, 
--        delivery_address, etc. columns even though they exist in the table.
-- 
-- Solution: 
--   1. Verify all checkout columns exist
--   2. Add any missing columns
--   3. Force schema cache refresh via NOTIFY
-- =====================================================================

-- Step 1: Ensure all checkout-required columns exist
-- These are the columns CheckoutDrawer and CartDrawer insert into.

DO $$
BEGIN
  -- customer_name (text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='customer_name'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN customer_name text;
  END IF;

  -- customer_phone (text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='customer_phone'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN customer_phone text;
  END IF;

  -- delivery_address (text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='delivery_address'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN delivery_address text;
  END IF;

  -- scheduled_date (date, for services)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='scheduled_date'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN scheduled_date date;
  END IF;

  -- service_notes (text, for services)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='service_notes'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN service_notes text;
  END IF;

  -- otp_code (text, for OTP verification)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='otp_code'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN otp_code text;
  END IF;

  -- quantity (integer, for product quantities)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='quantity'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN quantity integer DEFAULT 1;
  END IF;

  -- total_amount (numeric, for order total)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='total_amount'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total_amount numeric(12,2);
  END IF;

  -- total_price (numeric, alternative/duplicate for total)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='total_price'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total_price numeric(12,2);
  END IF;

  -- item_type (text, service vs physical vs digital)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='item_type'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN item_type text;
  END IF;

  -- store_id (bigint, FK to sme_stores)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='store_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN store_id bigint;
  END IF;

  -- offer_id (bigint, FK to hive_catalogue)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='orders' AND column_name='offer_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN offer_id bigint;
  END IF;
END $$;

-- Step 2: Ensure foreign key constraints exist (idempotent)
DO $$
BEGIN
  -- FK: store_id -> sme_stores(id)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='sme_stores'
  ) THEN
    BEGIN
      ALTER TABLE public.orders
        ADD CONSTRAINT orders_store_id_fkey
        FOREIGN KEY (store_id) REFERENCES public.sme_stores(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- FK: offer_id -> hive_catalogue(id)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='hive_catalogue'
  ) THEN
    BEGIN
      ALTER TABLE public.orders
        ADD CONSTRAINT orders_offer_id_fkey
        FOREIGN KEY (offer_id) REFERENCES public.hive_catalogue(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Step 3: Create/refresh indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON public.orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_otp_code ON public.orders(otp_code);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_item_type ON public.orders(item_type);

-- Step 4: Force schema cache refresh via ANALYZE
ANALYZE public.orders;

-- Step 5: Verification - List all columns on orders table
-- Uncomment this if you want to verify the columns exist
/*
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
*/

-- =====================================================================
-- CRITICAL: After running this migration, you MUST:
-- 1. Run this SQL in your Supabase SQL editor
-- 2. Wait 2-5 minutes for Supabase to refresh its schema cache
-- 3. Restart your dev server or refresh the browser
-- 4. Try checkout again
-- =====================================================================
