-- =====================================================================
-- MIGRATION: Add Service-Role Function for Guest Conversation Fetching
-- =====================================================================
-- PROBLEM: RLS SELECT policies can't securely filter guest conversations
-- because guests have no authenticated identity (auth.uid() = NULL)
--
-- SOLUTION: Create a PUBLIC FUNCTION marked SECURITY DEFINER that:
--   1. Takes guest_tracking_token as input
--   2. Executes with service_role permissions
--   3. Returns conversations & messages for that token only
--   4. Frontend calls this function (bypasses restrictive RLS)
-- =====================================================================

-- Drop function if exists (allow recreation)
DROP FUNCTION IF EXISTS public.get_guest_conversations(text) CASCADE;

-- Create function: Fetch conversations for a specific guest token
CREATE OR REPLACE FUNCTION public.get_guest_conversations(p_guest_token TEXT)
RETURNS TABLE (
  id UUID,
  participant_a UUID,
  participant_b UUID,
  guest_tracking_token TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  context_order_id BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.participant_a,
    c.participant_b,
    c.guest_tracking_token,
    c.last_message,
    c.last_message_at,
    c.context_order_id,
    c.created_at
  FROM public.conversations c
  WHERE c.guest_tracking_token = p_guest_token
  ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to anonymous (guests) and authenticated users
GRANT EXECUTE ON FUNCTION public.get_guest_conversations(text) TO anon, authenticated, public;

-- Create function: Fetch messages for a specific conversation (guest-accessible)
DROP FUNCTION IF EXISTS public.get_conversation_messages(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_conversation_messages(p_conversation_id UUID)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id TEXT,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.created_at,
    m.updated_at
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to all roles
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid) TO anon, authenticated, public;

-- =====================================================================
-- UPDATED RLS POLICIES: SELECT Now Requires Direct Function Call
-- =====================================================================

-- Keep the restrictive SELECT policy for authenticated users only
-- Guests will use the function instead
DROP POLICY IF EXISTS "participants_read_conversations" ON public.conversations;

CREATE POLICY "authenticated_users_read_conversations"
ON public.conversations FOR SELECT
USING (
  -- Service role can see all (for backend operations)
  auth.role() = 'service_role'
  -- Authenticated user is one of the participants
  OR auth.uid() = participant_a
  OR auth.uid() = participant_b
);

-- Messages: Same pattern - authenticated only via RLS
DROP POLICY IF EXISTS "participants_read_messages" ON public.messages;

CREATE POLICY "authenticated_users_read_messages"
ON public.messages FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = messages.conversation_id
    AND (
      auth.uid() = participant_a
      OR auth.uid() = participant_b
    )
  )
);

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
/*
-- Test: Fetch conversations for a guest token
SELECT public.get_guest_conversations('your-tracking-token-here');

-- Test: Fetch messages from a conversation (guest-accessible)
SELECT public.get_conversation_messages('conversation-id-here'::uuid);

-- Check function exists:
SELECT
  proname,
  proargtypes,
  prosecdef
FROM pg_proc
WHERE proname IN ('get_guest_conversations', 'get_conversation_messages')
ORDER BY proname;
*/
