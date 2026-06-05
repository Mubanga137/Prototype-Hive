# 🔍 Verify Migrations Applied

Run these queries **in Supabase SQL Editor** to check if the migrations actually worked:

## Query 1: Check RPC Functions Exist

```sql
SELECT 
  proname,
  prosecdef,
  proacl
FROM pg_proc 
WHERE proname IN ('get_guest_conversations', 'get_conversation_messages', 'secure_place_order')
ORDER BY proname;
```

**Expected output:**
```
get_conversation_messages | t | [execution permissions]
get_guest_conversations   | t | [execution permissions]
secure_place_order        | t | [execution permissions]
```

**If you don't see the first two:** Migrations didn't apply properly

---

## Query 2: Check RLS Policies

```sql
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, cmd, policyname;
```

**Check for:**
- `system_create_conversations` (INSERT policy)
- `authenticated_users_read_conversations` (SELECT policy)
- `system_create_messages` (INSERT policy)
- `authenticated_users_read_messages` (SELECT policy)

**If you see old policy names** like `allow_conversations_select` or `conversations_insert_policy`: Old policies weren't dropped before creating new ones

---

## Query 3: Test RPC Function Directly

Replace `your-guest-token-here` with an actual token from a recent guest order:

```sql
-- First, get a real guest token
SELECT guest_tracking_token 
FROM public.conversations 
WHERE guest_tracking_token IS NOT NULL 
LIMIT 1;

-- Copy that token, then test the function
SELECT * FROM public.get_guest_conversations('paste-token-here');
```

**Expected:** Should return 1+ conversations, or empty array if no conversations exist

**If you see an error:** Function doesn't exist or has the wrong signature

---

## Query 4: Check Data Actually Exists

```sql
-- Check if any guest conversations exist
SELECT COUNT(*) as conversation_count FROM public.conversations 
WHERE guest_tracking_token IS NOT NULL;

-- Check if any messages exist
SELECT COUNT(*) as message_count FROM public.messages;

-- Show latest guest conversation
SELECT id, guest_tracking_token, context_order_id, last_message, created_at
FROM public.conversations
WHERE guest_tracking_token IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
```

**If conversation_count = 0:** No guest orders were created in database (problem is earlier in the flow)

---

## Query 5: Check Message Table Structure

```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- conversation_id (uuid)
- sender_id (text)
- content (text)
- message_type (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

---

## Query 6: Check RLS Is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('conversations', 'messages')
AND schemaname = 'public';
```

**Expected:** `rowsecurity = t` for both tables

---

## What to Do Based on Results

### If RPC functions don't exist
→ Migrations didn't apply. Try again in SQL Editor:
1. Create new query
2. Paste the migration SQL
3. Click **Run**
4. Check for error messages

### If conversation_count = 0
→ No guest orders created. Problem is in checkout flow, not messaging

### If conversation_count > 0 but guest can't see them
→ RLS policy or RPC function issue. Check queries 1-2 above.

### If RPC function errors when called
→ Function signature wrong or SELECT policy blocks it. Check policy in Query 2.

---

## Share These Results

Run all 6 queries and share:
1. Do RPC functions exist? (Query 1)
2. What policies are present? (Query 2)
3. Can you call get_guest_conversations? (Query 3)
4. Are there conversations in database? (Query 4)
5. Message table structure correct? (Query 5)
6. RLS enabled? (Query 6)
