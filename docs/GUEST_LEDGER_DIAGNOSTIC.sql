-- =====================================================================
-- DIAGNOSTIC: Check Orders Table and Guest Ledger Accessibility
-- Run this to debug [GuestOrderLedger] Fetch error issues
-- =====================================================================

-- STEP 1: Check if orders table exists and has data
SELECT 
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status != 'pending' THEN 1 END) as non_pending_orders,
  COUNT(CASE WHEN tracking_token IS NOT NULL THEN 1 END) as orders_with_token
FROM public.orders;

-- STEP 2: Show sample orders (for testing)
SELECT 
  id,
  tracking_token,
  status,
  customer_name,
  customer_phone,
  total_to_pay,
  otp_code,
  created_at,
  item_type
FROM public.orders
WHERE status != 'pending'
ORDER BY created_at DESC
LIMIT 5;

-- STEP 3: Check RLS policies on orders table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- STEP 4: Test SELECT access directly (as if guest)
-- This simulates what the RLS policy allows
SELECT 
  id,
  tracking_token,
  status,
  customer_name,
  created_at
FROM public.orders
WHERE status != 'pending' 
  AND created_at > now() - interval '30 days'
LIMIT 5;

-- STEP 5: Check orders table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- STEP 6: Check for any missing columns that GuestOrderLedger expects
SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_token') as has_tracking_token,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='otp_code') as has_otp_code,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='item_type') as has_item_type,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total_to_pay') as has_total_to_pay;

-- STEP 7: Check foreign key to hive_catalogue
SELECT 
  constraint_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM information_schema.referential_constraints
WHERE constraint_schema = 'public' 
  AND table_name = 'orders' 
  AND referenced_table_name = 'hive_catalogue';

-- STEP 8: Test with a specific tracking token (replace with real token)
-- SELECT * FROM public.orders WHERE tracking_token = '550e8400-e29b-41d4-a716-446655440000';

-- =====================================================================
-- INTERPRETATION GUIDE
-- =====================================================================
-- If STEP 1 shows 0 orders: No orders exist. Complete a checkout first.
-- If STEP 2 shows no rows: All orders have status='pending'. 
--   Fix: Orders should have status='pending_payment' or similar (not 'pending')
-- If STEP 3 shows no policies: RLS policies missing. Run the FIX SQL.
-- If STEP 3 shows broken policy: Replace with correct policy from FIX SQL.
-- If STEP 4 shows rows: RLS is working. Issue is elsewhere.
-- If STEP 5 shows missing columns: Run schema migration to create them.
-- If STEP 6 shows false values: Some critical columns are missing!
-- If STEP 7 shows no rows: Foreign key to hive_catalogue doesn't exist.

-- =====================================================================
-- ONCE DIAGNOSED, IF NEEDED, RUN THIS:
-- =====================================================================
-- From: docs/migrations/2026-05-24_fix_orders_guest_read_policy.sql
-- or  : GUEST_LEDGER_FIX.txt
