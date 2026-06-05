# ✅ Complete Messaging System Fix

## Errors Found

1. **Conversation creation fails:** `null value in column "participant_b" violates not-null constraint`
   - Root cause: `participant_b` column has NOT NULL constraint but RPC tries to insert NULL for guests

2. **RPC function fails:** `column c.created_at does not exist`
   - Root cause: RPC function was selecting wrong columns (selected `created_at` but schema returns different structure)

---

## Fix Steps (In Order)

### Step 1: Fix Conversations Table Schema

**In Supabase SQL Editor → New Query:**

```sql
-- Make participant_b nullable to support guest conversations
ALTER TABLE public.conversations 
ALTER COLUMN participant_b DROP NOT NULL;
```

Click **Run** → Should complete with "success"

**Verify:**
```sql
-- Check constraint still exists
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'conversations';

-- Should still show CHECK constraint exists
```

---

### Step 2: Drop Old RPC Functions

**In Supabase SQL Editor → New Query:**

```sql
DROP FUNCTION IF EXISTS public.get_guest_conversations(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_conversation_messages(uuid) CASCADE;
```

Click **Run** → Should complete with "success"

---

### Step 3: Create Fixed RPC Function #1

**In Supabase SQL Editor → New Query:**

```sql
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
```

Click **Run** → Should complete with "success"

---

### Step 4: Grant Permissions for Function #1

**In Supabase SQL Editor → New Query:**

```sql
GRANT EXECUTE ON FUNCTION public.get_guest_conversations(text) TO anon, authenticated, public;
```

Click **Run** → Should complete with "success"

---

### Step 5: Create Fixed RPC Function #2

**In Supabase SQL Editor → New Query:**

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

Click **Run** → Should complete with "success"

---

### Step 6: Grant Permissions for Function #2

**In Supabase SQL Editor → New Query:**

```sql
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid) TO anon, authenticated, public;
```

Click **Run** → Should complete with "success"

---

### Step 7: Verify Functions Exist

**In Supabase SQL Editor → New Query:**

```sql
SELECT proname, prosecdef FROM pg_proc 
WHERE proname IN ('get_guest_conversations', 'get_conversation_messages')
ORDER BY proname;
```

Click **Run**

**Expected output:**
```
get_conversation_messages | t
get_guest_conversations   | t
```

Both functions should exist with `prosecdef = t` (SECURITY DEFINER)

---

### Step 8: Test Functions Work

**Get a guest token:**
```sql
SELECT guest_tracking_token 
FROM public.conversations 
WHERE guest_tracking_token IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;
```

Copy the token value.

**Test first function:**
```sql
SELECT * FROM public.get_guest_conversations('paste-your-token-here');
```

Should return your conversation(s).

**Test second function (get a conversation ID from above):**
```sql
SELECT * FROM public.get_conversation_messages('conversation-id-here'::uuid);
```

Should return messages.

---

## Frontend Already Updated

The frontend code has been updated to use these RPC functions:
- ✅ `src/hooks/useDualStateMessaging.ts`
- ✅ `src/pages/customer/Messages.tsx`

No additional frontend changes needed.

---

## Test in Browser

1. **Clear localStorage:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Place a guest order:**
   - Add item to cart
   - Checkout without logging in
   - Complete order

3. **Navigate to Messages:**
   - Go to Messages page
   - Should see conversation in left panel immediately
   - Click conversation
   - Should see system message: "🐝 Hive System Receipt: Your order has been received..."

4. **Test sending message:**
   - Type a message in input
   - Click send
   - Message should appear immediately

---

## What This Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Conversation creation fails | `participant_b` NOT NULL constraint | Made `participant_b` nullable |
| RPC function error | Incorrect column selection | Fixed SELECT to match schema |
| Guests can't see conversations | RPC functions didn't exist | Created working RPC functions |
| Messages don't load | RPC function error | Fixed function returns |

---

## Expected Results After Fix

✅ Guest places order → Conversation created successfully
✅ System message created automatically
✅ Guest navigates to Messages → Conversation appears
✅ Guest clicks conversation → Messages load
✅ System message visible in chat
✅ Guest can send messages
✅ Real-time updates work
✅ No errors in console

---

## Debugging If Still Not Working

**Check 1: Functions exist**
```sql
SELECT * FROM pg_proc WHERE proname IN ('get_guest_conversations', 'get_conversation_messages');
```
Should return 2 rows.

**Check 2: Conversations table allows NULL participant_b**
```sql
\d public.conversations
```
Should show `participant_b` is nullable (no NOT NULL constraint listed).

**Check 3: Call function directly**
```sql
SELECT * FROM public.get_guest_conversations('real-token-here');
```
Should return conversations or empty set (no error).

**Check 4: Check browser console**
Should NOT show:
- `column c.created_at does not exist`
- `column c.participant_b does not exist`
- RPC error messages

Should show:
- `[useDualStateMessaging.loadConversations] Loaded X conversations`
- `[useDualStateMessaging.loadMessages] Loaded X messages`

---

## If Error Persists

If you still see `column c.created_at does not exist` after applying this fix:

1. The RPC function wasn't properly updated
2. Supabase is using a cached version

**Solution: Force refresh**
```sql
-- In Supabase, reload the connection
SELECT 1;

-- Then reload browser and clear cache
localStorage.clear();
location.reload();
```

---

## Summary

1. ✅ Make `participant_b` nullable (Step 1)
2. ✅ Drop old functions (Step 2)
3. ✅ Create correct RPC functions (Steps 3-6)
4. ✅ Verify they exist (Step 7)
5. ✅ Test in browser (Step 8)
6. ✅ Done!

Once these steps are complete, messages should appear immediately.
