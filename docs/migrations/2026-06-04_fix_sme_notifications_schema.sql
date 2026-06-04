-- =====================================================================
-- FIX: sme_notifications schema - add missing type column
-- Issue: "column 'type' of relation 'sme_notifications' does not exist"
-- Solution: Add the type column if it doesn't exist
-- =====================================================================

-- Add type column to sme_notifications if it doesn't exist
ALTER TABLE public.sme_notifications
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'notification';

-- Add index for efficient filtering by type
CREATE INDEX IF NOT EXISTS idx_sme_notifications_type 
ON public.sme_notifications(type);

-- Comment for clarity
COMMENT ON COLUMN public.sme_notifications.type IS 
'Notification type: order, booking, alert, system, etc. Defaults to notification.';

-- =====================================================================
-- VERIFICATION
-- =====================================================================
/*
-- Check that the type column now exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sme_notifications' AND column_name = 'type';
-- Should return: type | text | 'notification'::text

-- Check all columns in sme_notifications
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sme_notifications'
ORDER BY ordinal_position;
*/
