-- =====================================================================
-- FIX: Remove title column from orders table
-- Issue: Column "title" does not exist in orders table schema
-- But somehow it's being referenced, so ensure it doesn't exist
-- =====================================================================

-- STEP 1: Drop title column if it exists (safe operation)
ALTER TABLE public.orders
DROP COLUMN IF EXISTS title;

-- STEP 2: Force schema cache refresh
ANALYZE public.orders;

-- =====================================================================
-- VERIFICATION: Confirm title column is gone
-- =====================================================================
/*
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'title';
-- Should return no rows
*/
