-- Create conversations table (supports both auth users and guest buyers)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID,
  participant_b UUID,
  guest_tracking_token TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  context_order_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_participants CHECK (
    (participant_a IS NOT NULL OR guest_tracking_token IS NOT NULL) AND
    (participant_b IS NOT NULL OR guest_tracking_token IS NOT NULL OR participant_a IS NOT NULL)
  )
);

-- Create messages table (sender_id can be UUID for users/system or string for guests)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS conversations_participant_a_idx ON public.conversations(participant_a);
CREATE INDEX IF NOT EXISTS conversations_participant_b_idx ON public.conversations(participant_b);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- RLS is disabled for now to allow guest+authenticated access in development
-- TODO: Implement proper guest authentication with Supabase RLS
-- For production, enable RLS and use Supabase anonymous auth or JWT tokens for guests

-- Uncomment to enable RLS (requires proper guest auth implementation):
-- ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- FUTURE RLS POLICIES (when guest auth is implemented):
-- CREATE POLICY "Users can view their conversations" ON public.conversations
--   FOR SELECT USING (
--     auth.uid() = participant_a OR auth.uid() = participant_b
--   );
-- CREATE POLICY "Users can create conversations" ON public.conversations
--   FOR INSERT WITH CHECK (
--     auth.uid() = participant_a OR auth.uid() = participant_b
--   );
-- CREATE POLICY "Users can update their conversations" ON public.conversations
--   FOR UPDATE USING (
--     auth.uid() = participant_a OR auth.uid() = participant_b
--   );
-- CREATE POLICY "Users can view messages" ON public.messages
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM public.conversations
--       WHERE id = messages.conversation_id
--       AND (participant_a = auth.uid() OR participant_b = auth.uid())
--     )
--   );
-- CREATE POLICY "Users can send messages" ON public.messages
--   FOR INSERT WITH CHECK (
--     CAST(sender_id AS UUID) = auth.uid() AND
--     EXISTS (
--       SELECT 1 FROM public.conversations
--       WHERE id = conversation_id
--       AND (participant_a = auth.uid() OR participant_b = auth.uid())
--     )
--   );

-- Enable real-time notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
