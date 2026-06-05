-- =====================================================================
-- FIX: Conversation insertion for guests
-- =====================================================================
-- The problem: conversations table has constraints that prevent 
-- inserting guest conversations properly
--
-- Solution: Update the conversation table to allow NULL participant_b
-- when guest_tracking_token is provided
-- =====================================================================

-- First, check the current table definition:
-- Run this to see what constraints exist:
\d public.conversations

-- The issue is likely that participant_b has NOT NULL constraint
-- We need to make it nullable ONLY when guest_tracking_token is present

-- Step 1: Alter table to make participant_b nullable
ALTER TABLE public.conversations 
ALTER COLUMN participant_b DROP NOT NULL;

-- Step 2: Verify constraint still exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'conversations' AND constraint_type = 'CHECK';

-- Step 3: Test creating guest conversation
-- Replace token-here with a real order tracking token
INSERT INTO public.conversations (
  guest_tracking_token,
  context_order_id,
  last_message,
  last_message_at
) VALUES (
  'test-token-' || gen_random_uuid()::TEXT,
  99999,
  '🐝 Order Received',
  NOW()
) RETURNING id, guest_tracking_token, participant_a, participant_b;

-- Expected output: Should insert successfully with:
-- - id = UUID
-- - guest_tracking_token = your-token
-- - participant_a = NULL
-- - participant_b = NULL (this should now be allowed)

-- Step 4: Verify guest conversations can now be created for orders
SELECT COUNT(*) as guest_conversation_count
FROM public.conversations 
WHERE guest_tracking_token IS NOT NULL;
