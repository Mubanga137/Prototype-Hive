-- =====================================================================
-- MIGRATION: Fix RLS Policies for Conversations & Messages
-- =====================================================================
-- Issue: Code 42501 - "new row violates row-level security policy"
-- Root Cause: RLS is enabled but no INSERT policies exist
-- Solution: Create permissive but controlled policies for:
--   1. System/Backend inserts (RPC via service_role)
--   2. Authenticated users
--   3. Guest users with tracking token
-- =====================================================================

-- STEP 1: Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop any existing policies (cleanup)
DROP POLICY IF EXISTS "allow_all_insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "allow_all_select_conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;

-- STEP 3: CREATE INSERT POLICY
-- Allow inserts when:
--   A) Called via service_role (backend/RPC context)
--   B) User is authenticated (auth.uid() is not null)
--   C) Guest with tracking token is provided
-- This is the PRIMARY path for order checkout flow
CREATE POLICY "allow_conversations_insert"
ON public.conversations FOR INSERT
TO anon, authenticated, public
WITH CHECK (
  auth.role() = 'service_role'  -- Backend/RPC calls
  OR auth.uid() IS NOT NULL     -- Authenticated users
  OR guest_tracking_token IS NOT NULL  -- Guests with token
);

-- STEP 4: CREATE SELECT POLICY
-- Allow users to select conversations they participate in, or system messages
CREATE POLICY "allow_conversations_select"
ON public.conversations FOR SELECT
TO anon, authenticated, public
USING (
  auth.role() = 'service_role'  -- Backend can see all
  OR auth.uid() = participant_a  -- User is participant_a
  OR auth.uid() = participant_b  -- User is participant_b
  OR guest_tracking_token IS NOT NULL  -- Guest conversations visible
);

-- STEP 5: CREATE UPDATE POLICY
-- Allow participants to update their conversations
CREATE POLICY "allow_conversations_update"
ON public.conversations FOR UPDATE
TO anon, authenticated, public
USING (
  auth.role() = 'service_role'
  OR auth.uid() = participant_a
  OR auth.uid() = participant_b
)
WITH CHECK (
  auth.role() = 'service_role'
  OR auth.uid() = participant_a
  OR auth.uid() = participant_b
);

-- STEP 6: Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- STEP 7: Drop any existing policies on messages
DROP POLICY IF EXISTS "allow_all_insert_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "allow_all_select_messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;

-- STEP 8: CREATE INSERT POLICY for messages
-- Allow inserts when:
--   A) Called via service_role (system messages, backend)
--   B) User is authenticated and sender_id matches their UUID
--   C) Guest user (sender_id can be tracking token or order id)
CREATE POLICY "allow_messages_insert"
ON public.messages FOR INSERT
TO anon, authenticated, public
WITH CHECK (
  auth.role() = 'service_role'  -- Backend/RPC calls (system messages)
  OR CAST(sender_id AS UUID) = auth.uid()  -- Authenticated user sending message
  OR auth.uid() IS NULL  -- Guest sending message
);

-- STEP 9: CREATE SELECT POLICY for messages
-- Allow users to see messages in conversations they participate in
CREATE POLICY "allow_messages_select"
ON public.messages FOR SELECT
TO anon, authenticated, public
USING (
  auth.role() = 'service_role'  -- Backend can see all
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = messages.conversation_id
    AND (
      auth.uid() = participant_a
      OR auth.uid() = participant_b
      OR guest_tracking_token IS NOT NULL
    )
  )
);

-- STEP 10: CREATE UPDATE POLICY for messages
-- Only system can update messages (no user edits after send)
CREATE POLICY "allow_messages_update"
ON public.messages FOR UPDATE
TO anon, authenticated, public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- STEP 11: Refresh schema cache
ANALYZE public.conversations;
ANALYZE public.messages;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
/*
-- Check RLS is enabled:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages');

-- Check policies exist:
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('conversations', 'messages')
ORDER BY tablename, policyname;
*/
