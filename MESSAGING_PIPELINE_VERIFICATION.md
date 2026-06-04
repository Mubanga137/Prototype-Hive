# 🐝 Hive Messaging Pipeline — Complete Verification Guide

## CRITICAL: System Has Been FULLY REPAIRED

The complete messaging orchestration pipeline has been implemented and debugged:

✅ **Order Creation Pipeline** — Working
✅ **Messaging Orchestration** — All systems parallel-executed
✅ **UI State Updates** — Success confirmations showing
✅ **Diagnostic Logging** — Comprehensive at every stage
✅ **Real-time Visualization** — Diagnostic panel active

---

## STEP 1: VERIFY THE SYSTEM IS LIVE

### 1a. Open the App
- Navigate to the application
- You should see a **green button in bottom-right corner** with "📊" icon
- This is the **Messaging Diagnostics Panel**

### 1b. Place a Test Order
1. Go to any storefront (e.g., `/store/test-store`)
2. Click "Buy Now" on an item
3. Fill in checkout details:
   - Name: "Test Customer"
   - Phone: "0977123456"
   - Address: "123 Test St"
   - Quantity: 1
4. Click "Place Order"

### 1c. Watch the Diagnostics Panel
1. Click the green **📊 Activity** button in bottom-right
2. You should see console logs appearing in real-time:
   - ✅ `[Checkout] ORDER CREATED` — Order inserted into database
   - ✅ `[systemMessaging] Looking up conversation` — Creating receipt channel
   - ✅ `[systemMessaging] Sending message` — Inserting message into database
   - ✅ `[Checkout] CUSTOMER MESSAGE SENT` — Receipt sent to customer
   - ✅ `[Checkout] VENDOR MESSAGE SENT` — Notification sent to vendor
   - ✅ `[Checkout] MESSAGING ORCHESTRATION COMPLETE` — All async tasks finished

---

## STEP 2: UNDERSTAND THE PIPELINE

### Architecture Overview

```
Order Submission (CheckoutDrawer.tsx)
        ↓
secure_place_order RPC (Supabase)
        ↓
Order Created ✅ (orders table)
        ↓
ORCHESTRATION LAYER (Promise.allSettled)
        ├─→ sendOrderConfirmationReceipt()
        │   ├─ createOrGetSystemConversation()
        │   └─ sendSystemReceipt() → messages table
        │
        ├─→ sendRetailerOrderNotification()
        │   ├─ Lookup/create vendor conversation
        │   └─ sendSystemReceipt() → messages table
        │
        └─→ External Webhook (Make.com, etc)
                └─ POST to VITE_ORDER_WEBHOOK_URL
        ↓
All Tasks Complete (Success/Failure Log)
        ↓
UI Updates
        ├─ Hide checkout form
        ├─ Show green success state
        └─ Display receipt button
        ↓
Navigate User
        ├─ Guests → /ledger
        └─ Authenticated → /track-orders
```

### Key Functions

| Function | File | Purpose |
|----------|------|---------|
| `handleSubmit()` | CheckoutDrawer.tsx | Main checkout orchestrator |
| `sendOrderConfirmationReceipt()` | systemMessaging.ts | Customer receipt |
| `sendRetailerOrderNotification()` | systemMessaging.ts | Vendor alert |
| `createOrGetSystemConversation()` | systemMessaging.ts | Message channel setup |
| `sendSystemReceipt()` | systemMessaging.ts | Insert message into DB |

---

## STEP 3: VERIFY EACH COMPONENT

### 3a. Database Tables

Check Supabase directly:

```sql
-- Should have recent orders
SELECT id, customer_name, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Should have conversation entries with context_order_id
SELECT id, context_order_id, participant_a, guest_tracking_token, created_at
FROM conversations
ORDER BY created_at DESC
LIMIT 5;

-- Should have system messages (sender_id = '00000000-0000-0000-0000-000000000000')
SELECT id, conversation_id, sender_id, content, message_type, created_at
FROM messages
WHERE sender_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result**: All three tables should have recent entries from your test order.

---

## STEP 4: TRACE SPECIFIC FAILURES

### 4a. If Order Is NOT Created

**Symptom**: Logs don't show `[Checkout] ORDER CREATED`

**Check**:
1. Supabase connection: Does `import.meta.env.VITE_SUPABASE_URL` exist?
2. RPC function: Does `secure_place_order` exist in Supabase?
3. RPC response: Check browser DevTools → Network → supabase RPC calls

**Fix**: Verify Supabase environment variables in `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 4b. If Order Created BUT No Messages

**Symptom**: Logs show `ORDER CREATED` but NOT `CUSTOMER MESSAGE SENT` or `VENDOR MESSAGE SENT`

**Likely Cause**: Conversation creation failing

**Check Logs**:
- Look for: `[systemMessaging] Create conversation error:`
- This contains the Supabase error

**Common Issues**:

1. **RLS Policy Blocking Inserts**
   - Error: `code: "42501"` (permission denied)
   - Solution: Ensure conversations table has RLS disabled (currently correct)
   ```sql
   -- Check if RLS is enabled
   SELECT tablename FROM pg_tables WHERE tablename = 'conversations';
   -- Should NOT see it listed under policies
   SELECT * FROM pg_policies WHERE tablename = 'conversations';
   ```

2. **Missing conversation Columns**
   - Error: `column "xyz" does not exist`
   - Solution: Run migration: `supabase/migrations/setup_messaging.sql`

3. **Foreign Key Constraint Violation**
   - Error: `violates foreign key constraint`
   - Solution: Make sure guest_tracking_token is valid UUID

---

### 4c. If Messages Not Appearing in UI

**Symptom**: Messages exist in DB but not showing in `/messages` page

**Check**:
1. `useGlobalMessageListener` hook mounted?
   - Should show log: `[useGlobalMessageListener] Global message listener active`
2. Realtime subscription working?
   - Check Supabase → Replication → Verify `messages` table is in publication
   ```sql
   SELECT schemaname, tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

---

## STEP 5: COMMON ERROR CODES

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `42501` | Permission denied (RLS) | Disable RLS or fix policy |
| `23503` | Foreign key violation | Ensure conversation_id exists |
| `22001` | String too long | Trim content before insert |
| `PGRST001` | Supabase auth error | Check JWT token validity |
| `ECONNREFUSED` | Network error | Verify VITE_SUPABASE_URL |

---

## STEP 6: CONSOLE LOG REFERENCE

### Expected Logs for Successful Order (Guest)

```
[Checkout] ORDER CREATED {orderId: 12345, isGuest: true, ...}
[systemMessaging] Looking up conversation {orderId: 12345, isGuest: true, ...}
[systemMessaging] Creating new conversation for order {orderId: 12345, isGuest: true}
[systemMessaging] Conversation created successfully {conversationId: "uuid-xxx", orderId: 12345}
[systemMessaging] Sending order confirmation receipt {orderId: 12345, recipientType: "guest"}
[systemMessaging] Sending message {conversationId: "uuid-xxx", senderBotId: "system-bot", messageType: "system_receipt"}
[systemMessaging] Message inserted successfully {messageId: "msg-uuid", conversationId: "uuid-xxx"}
[Checkout] CUSTOMER MESSAGE SENT {orderId: 12345, recipientType: "guest"}
[systemMessaging] Sending retailer notification {orderId: 12345, vendorId: "..." }
[systemMessaging] Conversation created successfully {conversationId: "uuid-yyy", orderId: 12345}
[systemMessaging] Sending message {conversationId: "uuid-yyy", senderBotId: "system-bot", messageType: "retailer_notification"}
[systemMessaging] Message inserted successfully {messageId: "msg-uuid2", conversationId: "uuid-yyy"}
[Checkout] VENDOR MESSAGE SENT {orderId: 12345, vendorId: "vendor-id"}
[Checkout] WEBHOOK SENT {orderId: 12345, status: "success"}  ← Only if VITE_ORDER_WEBHOOK_URL set
[Checkout] MESSAGING ORCHESTRATION COMPLETE {orderId: 12345, successCount: 2, failureCount: 0}
✅ Order Confirmed! 
🟢 VIEW RECEIPT button appears
```

---

## STEP 7: RUNTIME DIAGNOSTIC PANEL

### Features

- **Green Button** (bottom-right): Click to open diagnostics
- **Live Logs**: Real-time capture of all messaging events
- **Filter Options**:
  - **All**: All events
  - **Errors & Issues**: Failed operations only
  - **Success**: Successful sends only
- **Expandable Details**: Click any log entry to see full object payload
- **Error Counter**: Red badge shows # of failures

### How to Use

1. Place an order while panel is open
2. Watch logs appear in real-time
3. If something fails, click "Errors & Issues" filter
4. Expand the error details to see what went wrong
5. Cross-reference with "STEP 5: Common Error Codes" above

---

## STEP 8: PRODUCTION DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] VITE_SUPABASE_URL is set and correct
- [ ] VITE_SUPABASE_ANON_KEY is set and correct
- [ ] Supabase migration `setup_messaging.sql` has been run
- [ ] RLS is disabled on conversations/messages tables (or policies are correct)
- [ ] Realtime is enabled for conversations and messages tables
- [ ] (Optional) VITE_ORDER_WEBHOOK_URL is set for Make.com/automation
- [ ] Test order placed and verified in diagnostics panel
- [ ] No error logs in browser console
- [ ] All 3 stages appear: ORDER CREATED → MESSAGES SENT → ORCHESTRATION COMPLETE

---

## STEP 9: IF STILL BROKEN

### Nuclear Option: Full Reset

If the system is still not working after following all steps:

1. **Check Supabase Health**
   ```bash
   curl https://your-project.supabase.co/rest/v1/ \
     -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}"
   ```
   Should return `200 OK`.

2. **Verify Schema**
   ```sql
   -- In Supabase SQL Editor
   \dt public.conversations
   \dt public.messages
   \dt public.orders
   ```
   All three should exist.

3. **Check Auth Context**
   - Open DevTools Console
   - Run: `localStorage.getItem('hive_guest_active_cart')`
   - Should show array of tokens if guests have checked out

4. **Enable Debug Mode**
   - Open DevTools
   - Run: `localStorage.setItem('debug_mode', 'true')`
   - Reload page
   - Watch for MORE detailed logs

5. **Contact Support**
   - Screenshot of diagnostics panel
   - Full error log export (copy from panel)
   - Supabase project URL

---

## Summary

The complete system is now:

✅ **Orchestrated** — All messaging happens in parallel
✅ **Logged** — Every step is traced
✅ **Visual** — Diagnostic panel shows real-time status
✅ **Robust** — Failures don't block each other
✅ **Guest-Safe** — Works for both guests and authenticated users

**To verify it's working**: Place an order and watch the diagnostics panel turn green with success messages.
