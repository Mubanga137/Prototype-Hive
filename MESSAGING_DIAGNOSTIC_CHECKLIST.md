# 🐛 Messaging System Diagnostic Checklist

## Backend Status Check

### 1. Database Tables Exist
```sql
-- Run in Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages')
ORDER BY tablename;

-- Expected output:
-- conversations
-- messages
```

### 2. RLS Enabled on Both Tables
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages')
ORDER BY tablename;

-- Expected: rowsecurity = t (true) for both
```

### 3. RPC Functions Exist
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname IN ('secure_place_order', 'get_guest_conversations', 'get_conversation_messages')
ORDER BY proname;

-- Expected:
-- get_conversation_messages | t
-- get_guest_conversations   | t
-- secure_place_order        | t
```

### 4. INSERT Policies Allow service_role
```sql
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE tablename = 'conversations' AND cmd = 'INSERT'
ORDER BY policyname;

-- Expected: 
-- Policy should have "auth.role() = 'service_role'" in WITH CHECK
```

### 5. Verify Sample Data Exists
```sql
-- Check if any conversations exist
SELECT id, guest_tracking_token, context_order_id, created_at 
FROM public.conversations 
LIMIT 5;

-- Check if any messages exist
SELECT id, conversation_id, sender_id, content, message_type, created_at 
FROM public.messages 
LIMIT 5;
```

---

## Guest Order Flow Check

### 6. Verify Guest Token Storage
Open browser DevTools → Storage → Local Storage → Find `hive_guest_active_cart`

Expected format:
```json
["uuid-1", "uuid-2", "uuid-3"]
```

OR (legacy format):
```json
{
  "trackingTokens": ["uuid-1", "uuid-2"]
}
```

### 7. Verify Order Was Created
```sql
-- Find the most recent guest order
SELECT id, buyer_id, tracking_token, status, customer_name, created_at 
FROM public.orders 
WHERE buyer_id IS NULL
ORDER BY created_at DESC 
LIMIT 1;

-- Note: guest order should have buyer_id = NULL
```

### 8. Verify Conversation Exists for Order
```sql
-- Using the tracking_token from step 7
SELECT id, guest_tracking_token, context_order_id, last_message, created_at 
FROM public.conversations 
WHERE guest_tracking_token = 'YOUR-TRACKING-TOKEN-HERE';

-- Should return exactly 1 row
```

### 9. Verify System Message Was Created
```sql
-- Using conversation_id from step 8
SELECT id, sender_id, message_type, content, created_at 
FROM public.messages 
WHERE conversation_id = 'YOUR-CONVERSATION-ID-HERE'
ORDER BY created_at ASC;

-- Should show system message with sender_id = '00000000-0000-0000-0000-000000000000'
```

---

## Frontend Readiness Check

### 10. Check useGuestTracking Hook
Browser DevTools → Console:
```javascript
// Manually test the hook
const stored = localStorage.getItem("hive_guest_active_cart");
const parsed = JSON.parse(stored);
console.log("Guest tokens:", parsed);
// Should log: ["uuid-1", "uuid-2", ...]
```

### 11. Check RPC Function Availability
Browser DevTools → Console:
```javascript
// Test calling the RPC function directly
const { data, error } = await supabase.rpc(
  "get_guest_conversations",
  { p_guest_token: "YOUR-TRACKING-TOKEN-HERE" }
);
console.log("Conversations:", data);
console.log("Error:", error);
// Should return conversations array or null error
```

### 12. Check useDualStateMessaging Context
Open Messages page → Browser Console:
```
Look for logs like:
[useDualStateMessaging] Auth Context: {
  isAuthenticated: false,
  isGuestMode: true,
  guestToken: "abc12345...",
  hasValidToken: true
}
```

### 13. Check Conversation Loading
Messages page should log:
```
[useDualStateMessaging.loadConversations] Guest mode: abc12345...
[useDualStateMessaging.loadConversations] Loaded X conversations
```

### 14. Check Message Loading
Click on conversation → Console should show:
```
[useDualStateMessaging.loadMessages] Loading for conversation: xyz...
[useDualStateMessaging.loadMessages] Loaded X messages (Y system alerts)
```

---

## Real-Time Subscription Check

### 15. Verify Real-Time Channel Subscription
Messages page → Console should show:
```
[CustomerMessages] Real-time subscribed to messages:CONVERSATION-ID-HERE
[CustomerMessages] ✅ Real-time subscribed to messages:CONVERSATION-ID-HERE
```

### 16. Test Real-Time Message Insert
1. Open conversation on Messages page
2. In another tab/window, run:
```sql
INSERT INTO public.messages (
  conversation_id,
  sender_id,
  content,
  message_type
) VALUES (
  'YOUR-CONVERSATION-ID',
  'test-sender',
  'This is a test message',
  'text'
);
```
3. Watch Messages page - message should appear immediately

---

## UI Rendering Check

### 17. Conversations List Visible
Messages page left panel should show:
- ✅ Search bar
- ✅ Conversation card(s) with avatar, name, last message, timestamp
- ❌ OR "No conversations yet" if no data

### 18. Chat Panel Shows Messages
Click on conversation, right panel should show:
- ✅ Chat header with participant name and phone
- ✅ WhatsApp button (if phone available)
- ✅ Message list with system message and any user messages
- ✅ System message formatted as centered italic banner
- ✅ User messages aligned left/right based on sender
- ✅ Input field for typing new message
- ✅ Send button (enabled when text exists)

### 19. Message Input Works
1. Type text in message input
2. Click send or press Enter
3. Console should show:
```
[CustomerMessages] Sending message to conversation ...
[CustomerMessages] Message sent successfully
```
4. New message should appear in chat

---

## Error Diagnostics

### If No Conversations Appear

**Check 1: localStorage has guest token?**
```javascript
localStorage.getItem("hive_guest_active_cart")
// Should be non-null
```

**Check 2: useDualStateMessaging detects guest mode?**
Console should show `authMode: "guest"` and `authIdentifier: "uuid..."`

**Check 3: RPC function callable?**
```javascript
const { data, error } = await supabase.rpc("get_guest_conversations", {
  p_guest_token: "YOUR-TOKEN"
});
console.log(error); // Should be null
```

**Check 4: Conversation exists in database?**
```sql
SELECT * FROM conversations WHERE guest_tracking_token = 'YOUR-TOKEN';
-- Should return 1+ rows
```

---

### If Messages Don't Load

**Check 1: Conversation selected?**
`activeConv` should be non-null (shown in header)

**Check 2: RPC function callable?**
```javascript
const { data, error } = await supabase.rpc("get_conversation_messages", {
  p_conversation_id: "CONVERSATION-UUID"
});
console.log(error);
```

**Check 3: Messages exist in database?**
```sql
SELECT COUNT(*) FROM messages 
WHERE conversation_id = 'CONVERSATION-UUID';
-- Should return > 0
```

---

### If Real-Time Messages Don't Appear

**Check 1: Channel subscribed?**
Console should show "SUBSCRIBED" status

**Check 2: Test insert works?**
Try manual INSERT (see check 16)

**Check 3: RLS blocks messages for guests?**
Messages SELECT policy might be too restrictive
- Check if policy includes service_role OR statement

---

## Complete Test Scenario

### Scenario: Guest Orders, Sees Message

1. **Place guest order:**
   - Open app as guest (no login)
   - Add item to cart
   - Checkout with name, phone, address
   - Click "Place Order"
   - See success state with OTP

2. **Verify backend created data:**
   ```sql
   SELECT tracking_token FROM orders 
   WHERE buyer_id IS NULL ORDER BY created_at DESC LIMIT 1;
   -- Copy tracking_token
   
   SELECT * FROM conversations 
   WHERE guest_tracking_token = '[copied-token]';
   -- Should find 1 conversation
   
   SELECT * FROM messages 
   WHERE conversation_id = '[conversation-id]';
   -- Should find system message
   ```

3. **Navigate to Messages:**
   - Click "Messages" in navigation
   - Should see conversation in left panel
   - Shows "🐝 Order Received" as last_message

4. **Open Conversation:**
   - Click conversation card
   - Right panel shows chat
   - System message visible: "🐝 Hive System Receipt: Your order has been received..."

5. **Send Test Message:**
   - Type "Hello!" in input
   - Click send or press Enter
   - Message appears immediately
   - Message shows with correct timestamp

6. **Verify Real-Time:**
   - In another browser tab, insert message:
     ```sql
     INSERT INTO messages (...) VALUES (...);
     ```
   - Message appears in first tab instantly

---

## Success Indicators

✅ All of these should be true:
- [ ] `get_guest_conversations` function exists and is callable
- [ ] `get_conversation_messages` function exists and is callable
- [ ] Guest orders create conversations with guest_tracking_token
- [ ] System message is created automatically
- [ ] Conversations appear in Messages UI immediately
- [ ] Messages load when conversation selected
- [ ] System message displays as centered italic banner
- [ ] User can type and send messages
- [ ] Messages appear instantly
- [ ] Real-time updates work (new messages show without refresh)
- [ ] No RLS policy errors in console

---

## Quick Copy-Paste Commands

### Check all RLS policies at once:
```sql
SELECT schemaname, tablename, policyname, cmd, permissive, qual, with_check
FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, cmd, policyname;
```

### Grant RPC execution (if needed):
```sql
GRANT EXECUTE ON FUNCTION public.get_guest_conversations(text) TO anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(uuid) TO anon, authenticated, public;
```

### Test RPC with sample data:
```sql
-- Test get_guest_conversations
SELECT * FROM public.get_guest_conversations('sample-token-here');

-- Test get_conversation_messages
SELECT * FROM public.get_conversation_messages('conversation-uuid-here'::uuid);
```
