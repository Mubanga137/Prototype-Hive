-- =====================================================================
-- FIX: sme_notifications schema - add all missing columns
-- Issue: Multiple errors like "column 'message' does not exist", "column 'type' does not exist"
-- Root Cause: Backend code (trigger/RPC) expecting columns not in original schema
-- Solution: Add all missing columns with sensible defaults
-- =====================================================================

-- STEP 1: Add missing columns to sme_notifications if they don't exist
ALTER TABLE public.sme_notifications
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'notification',
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread',
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- STEP 2: Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sme_notifications_type 
ON public.sme_notifications(type);

CREATE INDEX IF NOT EXISTS idx_sme_notifications_status 
ON public.sme_notifications(status);

CREATE INDEX IF NOT EXISTS idx_sme_notifications_priority 
ON public.sme_notifications(priority);

-- STEP 3: Add comments for clarity
COMMENT ON COLUMN public.sme_notifications.type IS 
'Notification type: order, booking, alert, system, etc.';

COMMENT ON COLUMN public.sme_notifications.message IS 
'Extended message content (complementary to body).';

COMMENT ON COLUMN public.sme_notifications.status IS 
'Notification status: unread, read, archived, etc.';

COMMENT ON COLUMN public.sme_notifications.action_url IS 
'URL to navigate to when notification is clicked.';

COMMENT ON COLUMN public.sme_notifications.icon IS 
'Icon identifier or emoji for UI display.';

COMMENT ON COLUMN public.sme_notifications.priority IS 
'Notification priority: low, normal, high, critical.';

-- =====================================================================
-- VERIFICATION
-- =====================================================================
/*
-- Check all columns now exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'sme_notifications'
ORDER BY ordinal_position;

-- Should show: id, created_at, sme_id, store_id, order_id, title, body, 
--              metadata, is_read, type, message, status, action_url, icon, priority
*/
