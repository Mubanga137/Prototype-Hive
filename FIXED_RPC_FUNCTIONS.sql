-- =====================================================================
-- FIXED RPC Functions - Run these in Supabase SQL Editor
-- =====================================================================

-- Step 1: Drop old functions
DROP FUNCTION IF EXISTS public.get_guest_conversations(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_conversation_messages(uuid) CASCADE;

-- Step 2: Create fixed get_guest_conversations function
-- This function was returning created_at which doesn't exist - fixed schema
CREATE OR REPLACE FUNCTION public.get_guest_conversations(p_guest_token TEXT)
RETURNS TABLE (
  id UUID,
  participant_a UUID,
  participant_b UUID,
  guest_tracking_token TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  context_order_id INTEGER
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
    c.context_order_id
  FROM public.conversations c
  WHERE c.guest_tracking_token = p_guest_token
  ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_guest_conversations(text) TO anon, authenticated, public;

-- Step 4: Create fixed get_conversation_messages function
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

-- Step 5: Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid) TO anon, authenticated, public;

-- Step 6: Verify both functions exist
SELECT proname, prosecdef FROM pg_proc 
WHERE proname IN ('get_guest_conversations', 'get_conversation_messages')
ORDER BY proname;
