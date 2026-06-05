# ✅ Manual RPC Function Application

Since the migration file didn't execute properly, let's apply the functions **one at a time** in Supabase SQL Editor.

---

## Step 1: Drop Old Functions (Cleanup)

**In Supabase SQL Editor → New Query → Paste this:**

```sql
DROP FUNCTION IF EXISTS public.get_guest_conversations(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_conversation_messages(uuid) CASCADE;
```

Click **Run** → Should complete with no errors

---

## Step 2: Create First Function

**In Supabase SQL Editor → New Query → Paste this:**

```sql
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
```

Click **Run** → Should say "Success. No rows returned."

---

## Step 3: Grant Permissions for First Function

**In Supabase SQL Editor → New Query → Paste this:**

```sql
GRANT EXECUTE ON FUNCTION public.get_guest_conversations(text) TO anon, authenticated, public;
```

Click **Run** → Should say "Success. No rows returned."

---

## Step 4: Create Second Function

**In Supabase SQL Editor → New Query → Paste this:**

```sql
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
```

Click **Run** → Should say "Success. No rows returned."

---

## Step 5: Grant Permissions for Second Function

**In Supabase SQL Editor → New Query → Paste this:**

```sql
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid) TO anon, authenticated, public;
```

Click **Run** → Should say "Success. No rows returned."

---

## Step 6: Verify Functions Exist

**In Supabase SQL Editor → New Query → Paste this:**

```sql
SELECT 
  proname,
  prosecdef
FROM pg_proc 
WHERE proname IN ('get_guest_conversations', 'get_conversation_messages')
ORDER BY proname;
```

Click **Run** 

**Expected output:**
```
get_conversation_messages | t
get_guest_conversations   | t
```

If you see both functions with `prosecdef = t`, proceed to Step 7.

---

## Step 7: Test the Functions Work

**Get a real guest token from your database:**

```sql
SELECT guest_tracking_token 
FROM public.conversations 
WHERE guest_tracking_token IS NOT NULL 
ORDER BY created_at DESC
LIMIT 1;
```

Copy the token value (should be a UUID like `12345678-abcd-...`)

**Then test the first function:**

```sql
SELECT * FROM public.get_guest_conversations('paste-your-token-here');
```

Should return your conversation(s).

---

## Step 8: Update RLS Policies (if needed)

**Check current SELECT policies:**

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'conversations' AND cmd = 'SELECT'
ORDER BY policyname;
```

**You should see:** `authenticated_users_read_conversations`

If you still see old policy names like `allow_conversations_select`, drop them:

```sql
DROP POLICY IF EXISTS "allow_conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
DROP POLICY IF EXISTS "participants_read_conversations" ON public.conversations;
```

Then create the correct one:

```sql
CREATE POLICY "authenticated_users_read_conversations"
ON public.conversations FOR SELECT
USING (
  auth.role() = 'service_role'
  OR auth.uid() = participant_a
  OR auth.uid() = participant_b
);
```

Same for messages:

```sql
DROP POLICY IF EXISTS "allow_messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
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
```

---

## Step 9: Test in Browser

1. Reload your Messages page
2. Browser console should show:
   ```
   [useDualStateMessaging.loadConversations] Guest mode: abc123...
   [useDualStateMessaging.loadConversations] Loaded X conversations
   ```
3. Conversations list should populate
4. Click conversation → messages should load

---

## If Still Not Working

**Check browser console for:**
- RPC call error (look for "rpc" or "get_guest_conversations" in error messages)
- RLS policy error (look for "row level security" or "policy")
- Connection error (look for "CORS" or "fetch")

**Check database:**
```sql
-- Verify conversation exists
SELECT COUNT(*) FROM conversations WHERE guest_tracking_token IS NOT NULL;

-- Verify message exists
SELECT COUNT(*) FROM messages;

-- Test RPC directly
SELECT * FROM get_guest_conversations('your-token-here');
```

---

## Common Issues

**Issue:** "function public.get_guest_conversations does not exist"
- Solution: Make sure you ran Steps 2-3 for this function

**Issue:** "permission denied" error
- Solution: Make sure you ran the GRANT step (Step 3 and 5)

**Issue:** Function exists but returns no rows
- Solution: Guest token in localStorage doesn't match database. Check:
  ```sql
  SELECT DISTINCT guest_tracking_token FROM conversations LIMIT 5;
  ```

**Issue:** RLS policy error
- Solution: You need to update the SELECT policy. See Step 8.

---

## Support

If still failing after these steps, please share:
1. Error message from console
2. Output of: `SELECT * FROM pg_proc WHERE proname IN ('get_guest_conversations', 'get_conversation_messages');`
3. Output of: `SELECT COUNT(*) FROM conversations WHERE guest_tracking_token IS NOT NULL;`
