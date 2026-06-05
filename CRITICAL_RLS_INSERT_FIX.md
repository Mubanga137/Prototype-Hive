# 🚨 Critical Fix: RLS INSERT Policy Blocking All Conversations

## Problem
```
new row violates row-level security policy for table "conversations"
```

The INSERT policy on the conversations table is **blocking even the RPC function** from creating conversations.

## Root Cause
The INSERT policy either:
1. Doesn't exist
2. Is too restrictive
3. Has conflicting policies

When `secure_place_order()` RPC tries to INSERT, RLS denies it even though it runs with SECURITY DEFINER.

---

## Immediate Fix (Run These in Supabase)

### Step 1: Drop ALL Existing Policies on Conversations

```sql
DROP POLICY IF EXISTS "system_create_conversations" ON public.conversations;
DROP POLICY IF EXISTS "system_create_conversations" ON public.conversations;
DROP POLICY IF EXISTS "authenticated_users_read_conversations" ON public.conversations;
DROP POLICY IF EXISTS "participants_update_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "allow_all_insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "allow_conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;
```

Click Run → Should complete

---

### Step 2: Create PERMISSIVE INSERT Policy

```sql
-- Allow service_role (backend/RPC) to insert conversations
CREATE POLICY "allow_service_role_insert_conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

Click Run → Should complete

---

### Step 3: Create SELECT Policy for Authenticated Users

```sql
-- Authenticated users can only see their own conversations
CREATE POLICY "allow_authenticated_select_conversations"
ON public.conversations
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR auth.uid() = participant_a
  OR auth.uid() = participant_b
);
```

Click Run → Should complete

---

### Step 4: Create SELECT Policy for Messages

```sql
-- First drop any existing policies
DROP POLICY IF EXISTS "authenticated_users_read_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "allow_all_select_messages" ON public.messages;

-- Create new SELECT policy
CREATE POLICY "allow_authenticated_select_messages"
ON public.messages
FOR SELECT
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

Click Run → Should complete

---

### Step 5: Create INSERT Policy for Messages

```sql
-- Drop existing
DROP POLICY IF EXISTS "system_create_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "allow_all_insert_messages" ON public.messages;

-- Create new
CREATE POLICY "allow_service_role_insert_messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
```

Click Run → Should complete

---

### Step 6: Verify Policies Are In Place

```sql
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, cmd, policyname;
```

Click Run

**Expected output:**
```
conversations | allow_authenticated_select_conversations | SELECT | t
conversations | allow_service_role_insert_conversations | INSERT | t
messages      | allow_authenticated_select_messages      | SELECT | t
messages      | allow_service_role_insert_messages       | INSERT | t
```

---

## Why This Fixes It

- **Before:** INSERT policy was missing or wrong → RPC couldn't insert
- **After:** `auth.role() = 'service_role'` allows the RPC to insert → Conversations created

When `secure_place_order()` RPC (SECURITY DEFINER) runs:
1. `auth.role()` = `'service_role'`
2. INSERT policy checks: `auth.role() = 'service_role'` ✅ TRUE
3. Conversation inserted successfully ✅

---

## Test It

1. **Place a guest order** → Should create conversation + messages
2. **Check Messages page** → Conversation should appear
3. **Check notifications** → Should get order notification

---

## If Still Not Working

**Check 1: Verify RLS is actually enabled**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('conversations', 'messages');
```
Both should have `rowsecurity = t`

**Check 2: Verify INSERT policy allows service_role**
```sql
SELECT policyname, with_check
FROM pg_policies
WHERE tablename = 'conversations' AND cmd = 'INSERT';
```
Should show: `allow_service_role_insert_conversations | auth.role() = 'service_role'`

**Check 3: Try inserting manually to test policy**
```sql
-- This should succeed (simulating RPC execution context)
INSERT INTO public.conversations (
  participant_a,
  participant_b,
  context_order_id,
  last_message,
  last_message_at
) VALUES (
  NULL,
  'vendor-uuid-here'::UUID,
  999999,
  'Test',
  NOW()
) RETURNING id;
```

If this fails → Policy is wrong

---

## Complete Policy Fix Script

If you want to apply everything at once, run this entire script:

```sql
-- CLEANUP: Drop ALL policies
DROP POLICY IF EXISTS "system_create_conversations" ON public.conversations;
DROP POLICY IF EXISTS "authenticated_users_read_conversations" ON public.conversations;
DROP POLICY IF EXISTS "participants_update_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "allow_all_insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_policy" ON public.conversations;
DROP POLICY IF EXISTS "allow_conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_policy" ON public.conversations;

DROP POLICY IF EXISTS "authenticated_users_read_messages" ON public.messages;
DROP POLICY IF EXISTS "system_create_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "allow_all_select_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "allow_all_insert_messages" ON public.messages;

-- CREATE CLEAN POLICIES: Conversations
CREATE POLICY "allow_service_role_insert_conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "allow_authenticated_select_conversations"
ON public.conversations FOR SELECT
USING (
  auth.role() = 'service_role'
  OR auth.uid() = participant_a
  OR auth.uid() = participant_b
);

-- CREATE CLEAN POLICIES: Messages
CREATE POLICY "allow_service_role_insert_messages"
ON public.messages FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "allow_authenticated_select_messages"
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

-- VERIFY
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, cmd, policyname;
```

Paste this entire script into **one SQL Editor query** and click Run.

---

## Summary

The messaging system has **two separate issues**:

1. ✅ **Guest conversations:** Fixed by making `participant_b` nullable
2. ❌ **Vendor/authenticated conversations:** Blocked by missing/wrong INSERT policy

This fix addresses #2 by:
- Dropping conflicting policies
- Creating clean, simple policies
- Allowing service_role (RPC) to insert
- Restricting user SELECT to their own conversations

After applying these changes:
- Guest orders → Conversations created ✅
- Vendor orders → Conversations created ✅
- Messages → Loaded immediately ✅
- Notifications → Sent automatically ✅
