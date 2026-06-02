# Supabase SQL Setup - Copy & Paste Ready

## Quick Instructions

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query** (top right)
4. **Copy the entire SQL block below**
5. **Paste it** into the query editor
6. Click **Run** (top right or Cmd/Ctrl + Enter)
7. Wait for success confirmation

---

## SQL Code to Run

```sql
-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL,
  participant_b UUID NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  context_order_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_participants CHECK (participant_a != participant_b)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
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

-- Enable RLS (Row Level Security)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversations (allow users to see their own conversations)
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    auth.uid() = participant_a OR auth.uid() = participant_b
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant_a OR auth.uid() = participant_b
  );

CREATE POLICY "Users can update their conversations" ON public.conversations
  FOR UPDATE USING (
    auth.uid() = participant_a OR auth.uid() = participant_b
  );

-- Create RLS policies for messages (allow users to see messages in their conversations)
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
      AND (participant_a = auth.uid() OR participant_b = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id
      AND (participant_a = auth.uid() OR participant_b = auth.uid())
    )
  );

-- Enable real-time notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

---

## What This SQL Does

### Tables Created:
1. **conversations** — Stores conversation threads between two users
2. **messages** — Stores individual messages within conversations

### Security (RLS Policies):
- Users can **only view** conversations they're participants in
- Users can **only create/update** their own conversations
- Users can **only view/send** messages in their own conversations
- **Enforced at database level** (even if frontend is compromised)

### Performance (Indexes):
- Fast lookups on user IDs
- Fast lookups on conversation and message IDs
- Fast sorting by created_at

### Real-Time:
- Enables real-time subscriptions for both tables
- Frontend can instantly receive new messages

---

## After Running SQL

1. ✅ Go to **Data Studio** (left sidebar)
2. ✅ Verify `conversations` table appears in the list
3. ✅ Verify `messages` table appears in the list
4. ✅ Return to app and test with debug panel

---

## If You Get Errors

### Error: "Policy already exists"
→ Safe to ignore. Policies already created in a previous run.

### Error: "Cannot grant permissions"
→ Run this in a separate query:
```sql
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.messages TO authenticated;
```

### Error: "Cannot add table to publication"
→ The table might already be added. Verify in **Database** → **Publications** → **supabase_realtime**

### Error: "RLS is already enabled"
→ Safe to ignore. You can skip the ALTER TABLE ENABLE RLS lines if they conflict.

---

## Verify It Worked

Run this query to check:

```sql
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'messages');
```

Should return 2 rows.

---

## Alternative: Step-by-Step (If Copy-Paste Fails)

Run these 3 queries separately:

**Query 1: Create Tables**
```sql
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a UUID NOT NULL,
  participant_b UUID NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  context_order_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Query 2: Create Indexes**
```sql
CREATE INDEX IF NOT EXISTS conversations_participant_a_idx ON public.conversations(participant_a);
CREATE INDEX IF NOT EXISTS conversations_participant_b_idx ON public.conversations(participant_b);
CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
```

**Query 3: Enable RLS & Policies**
```sql
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users can update their conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.conversations
    WHERE id = messages.conversation_id
    AND (participant_a = auth.uid() OR participant_b = auth.uid()))
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = conversation_id
    AND (participant_a = auth.uid() OR participant_b = auth.uid())
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

---

## Done! 

Next: Test with the debug panel on `/customer-dash?section=Messages`
