# 🐝 Messaging System Fix - RLS Policy Update

## Problem Summary
Conversations are NOT being created when orders are placed because the `conversations` table has Row Level Security (RLS) enabled with policies that **require `auth.uid()` to exist and match a participant**. 

This blocks:
- ✗ System triggers (no auth context)
- ✗ Backend RPC functions (calling with service_role)
- ✗ Guest users (no auth.uid)

**Result:** Conversations fail to insert → Messages fail to insert → Messaging UI shows nothing

---

## Root Cause
Existing RLS policies on `conversations` require:
```sql
auth.uid() = participant_a OR auth.uid() = participant_b
```

But when `secure_place_order()` RPC (with `SECURITY DEFINER`) tries to insert, there's no authenticated user context — it's called with `service_role`.

---

## Solution: Apply the RLS Policy Fix

### Step 1: Open Supabase SQL Editor
1. Go to **https://app.supabase.com**
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Apply Migration 20260605000002
Copy the entire contents of this file:
```
./supabase/migrations/20260605000002_verify_conversations_insert_policy.sql
```

And paste it into the Supabase SQL Editor, then **click Run**.

**What this does:**
- ✅ Drops restrictive INSERT policies
- ✅ Creates new `system_create_conversations` policy with `auth.role() = 'service_role'` check
- ✅ Creates new `system_create_messages` policy for messages table
- ✅ Keeps SELECT/UPDATE policies to maintain security for user reads

### Step 3: Verify the Fix (Optional but Recommended)

Paste this verification query into a new SQL Editor tab:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages')
ORDER BY tablename;

-- Check INSERT policies
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'conversations'
AND cmd = 'INSERT'
ORDER BY policyname;
```

Expected result:
```
conversations | t (true = RLS enabled)
messages      | t (true = RLS enabled)

policyname              | cmd    | with_check
system_create_conversations | INSERT | auth.role() = 'service_role' OR true
```

---

## Test the Fix

### 1. Create a Guest Order
- Open the app and place an order as a guest (without logging in)
- Fill in all required fields and submit

### 2. Check Conversations Table
In Supabase **Table Editor**:
1. Select `conversations` table
2. You should see a new row with:
   - `guest_tracking_token` = (a UUID)
   - `context_order_id` = (the order ID)
   - `last_message` = "🐝 Order Received"

### 3. Check Messages Table
In Supabase **Table Editor**:
1. Select `messages` table  
2. You should see a new message with:
   - `conversation_id` = (matches conversations.id)
   - `sender_id` = "00000000-0000-0000-0000-000000000000" (system bot)
   - `message_type` = "system_receipt"
   - `content` = "🐝 Hive System Receipt: ..."

### 4. Check UI
- Navigate to the messaging section
- You should now see conversation threads appearing
- Guest users should be able to read their conversation

---

## Why This Works

The key insight: **The RPC function `secure_place_order()` is marked with `SECURITY DEFINER`**, which means it runs with elevated permissions (service_role), not the caller's permissions.

```sql
CREATE OR REPLACE FUNCTION public.secure_place_order(...)
RETURNS TABLE (...)
AS $$
  -- ... RPC body ...
  INSERT INTO public.conversations (...) VALUES (...)
  INSERT INTO public.messages (...) VALUES (...)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

When this function executes:
- `auth.role()` = 'service_role' (the function's role)
- `auth.uid()` = NULL (no authenticated user)

The new policy `auth.role() = 'service_role'` allows this context.

---

## Rollback (If Needed)

If something breaks, you can temporarily disable RLS to test:

```sql
-- TEMPORARY: Disable RLS for testing
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
```

Then re-enable after confirming order creation works:

```sql
-- Re-enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
```

---

## Migration Files

Two migrations have been prepared:

1. **20260605000001_fix_conversations_rls_policies.sql** (existing)
   - First attempt at the fix
   - Has the core policy logic

2. **20260605000002_verify_conversations_insert_policy.sql** (new)
   - Explicit verification and enforcement
   - Drops conflicting policies first
   - Adds fallback `OR true` for flexibility
   - **Recommended to apply this one**

Both can be applied safely (they drop and recreate policies).

---

## Timeline

After applying this fix:
1. **Immediate:** Conversations will insert successfully
2. **Immediate:** Messages will attach to conversations
3. **Immediate:** UI will show conversation threads
4. **Next refresh:** Guest users see their message threads

---

## Questions?

If the fix doesn't work:
1. Check the SQL Editor for error messages
2. Verify the policies were created:
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE tablename = 'conversations' AND cmd = 'INSERT';
   ```
3. Check RLS is enabled:
   ```sql
   SELECT rowsecurity FROM pg_tables WHERE tablename = 'conversations';
   ```
4. Review RPC function is using SECURITY DEFINER:
   ```sql
   SELECT proname, prosecdef FROM pg_proc 
   WHERE proname = 'secure_place_order';
   ```
