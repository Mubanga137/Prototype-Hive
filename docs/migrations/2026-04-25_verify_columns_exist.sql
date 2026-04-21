-- =====================================================================
-- Verification Query: Check if sme_stores columns exist
-- 
-- Run this query to verify the columns were created successfully.
-- You should see three rows: logo_url, draft_data, and store_slug
-- =====================================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sme_stores'
  AND column_name IN ('logo_url', 'draft_data', 'store_slug')
ORDER BY column_name;
