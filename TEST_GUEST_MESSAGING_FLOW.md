# Test Scenario: Guest Order → Instant Messaging (CRITICAL PATH)

## Test Objective
Verify that a guest user can place an order and immediately see the confirmation message in the messaging UI.

## Prerequisites
- Fresh browser (incognito/private mode recommended)
- Dev server running
- Supabase project deployed with migrations
- Sample items in `hive_catalogue`

---

## TEST EXECUTION

### Phase 1: Checkout (Guest Order Creation)

1. **Navigate to storefront** (anonymous, no login)
   - URL: `http://localhost:5173/` (or live preview)
   - Expected: See marketplace with items
   - Action: DO NOT LOGIN

2. **Select an item and open checkout**
   - Click "Buy Now" on any product
   - Drawer opens with "Quick Checkout" title
   - Form shows: Name, Phone, Address, Quantity

3. **Fill checkout form**
   - Full Name: `Test Guest`
   - Phone: `0977123456` (valid Zambian)
   - Address: `123 Main St, Lusaka`
   - Quantity: `1` (or pick different)
   - Click "Place Order"

4. **Verify RPC Success**
   - Expected: Green checkmark animation + "Order Confirmed!" modal
   - Modal shows: Order ID, Item name, Total amount, OTP code
   - Console logs:
     ```
     [Checkout] ORDER CREATED {orderId, trackingToken, ...}
     [Checkout] CUSTOMER MESSAGE SENT
     [Checkout] MESSAGING ORCHESTRATION COMPLETE
     ```

5. **Verify localStorage**
   - Open Browser Dev Tools → Application → LocalStorage
   - Key: `hive_guest_active_cart`
   - Value: JSON array `["uuid-1-most-recent", "uuid-2", ...]`
   - **Should be ARRAY format, not object**

### Phase 2: Database Verification

6. **Check Supabase: Conversations Table**
   - Navigate to Supabase dashboard
   - Table: `public.conversations`
   - Filter: Find row where `context_order_id = [your-order-id]`
   - Expected columns populated:
     - `id`: UUID (auto-generated)
     - `participant_a`: NULL (guest mode)
     - `guest_tracking_token`: should match localStorage value
     - `context_order_id`: your order ID
     - `last_message`: "🐝 Order Received" or user message
     - `created_at`: timestamp of order

7. **Check Supabase: Messages Table**
   - Filter: `conversation_id = [conversation-id-from-step-6]`
   - Expected: At least 1 message row
     - `sender_id`: `"00000000-0000-0000-0000-000000000000"` (SYSTEM BOT)
     - `content`: starts with "🐝 Hive System Receipt:"
     - `message_type`: `"system_receipt"`
     - `created_at`: same as order time
   - **This is the automatic system message from the RPC**

### Phase 3: Frontend Messaging UI

8. **Navigate to Messages page**
   - URL: `http://localhost:5173/messages` (or `/customer/messages` if embedded in dashboard)
   - Expected: Page loads, no login redirect
   - Left panel: "Messages" header + search box

9. **Check Guest Token Detection**
   - Console logs:
     ```
     [useDualStateMessaging] Auth Context: {
       isAuthenticated: false,
       isGuestMode: true,
       guestToken: "uuid-1-most..."
     }
     [useGuestTracking] Guest token extracted: "uuid..."
     ```
   - **If you see `isGuestMode: false`, the guest token format is wrong**

10. **Load Conversation List**
    - Expected: Left panel shows 1 conversation
    - Conversation displays:
      - Avatar with initials "TG" (for "Test Guest")
      - Name: "Unknown" or bot name
      - Last message preview: "🐝 Hive System Receipt..."
      - Badge: "📦 Order #[order-id]"
    - Console logs:
      ```
      [Messages] Loaded 1 conversations
      [useDualStateMessaging.loadConversations] Loaded 1 conversations (Guest mode)
      ```

11. **Click Conversation to Load Messages**
    - Expected: Right panel populates
    - Message area shows:
      - System message centered, italic, on neutral background (NOT a user bubble)
      - Full text: "🐝 Hive System Receipt: Your order has been received and confirmed. A vendor/provider will contact you shortly."
      - Timestamp below message
    - Console logs:
      ```
      [Messages] Loaded 3 messages
      [useDualStateMessaging.loadMessages] Loaded 1 messages (1 system alerts)
      [useDualStateMessaging.subscribeToMessages] Subscribing to: [conversation-id]
      [useDualStateMessaging.subscribeToMessages] Status: SUBSCRIBED
      ```

### Phase 4: Realtime Updates (Bonus Test)

12. **Simulate vendor reply** (requires 2 browsers/tabs)
    - Open Supabase SQL editor
    - Insert a message into the conversation:
      ```sql
      INSERT INTO public.messages (
        conversation_id,
        sender_id,
        content,
        message_type
      ) VALUES (
        '[conversation-id-from-step-6]'::uuid,
        'vendor-user-id-or-string'::text,
        'Hi! We received your order and will prepare it.',
        'text'
      );
      ```

13. **Check Guest Messages Page in Real-Time**
    - Without refresh, the new message should appear instantly
    - Should slide in at bottom of chat with smooth animation
    - If NOT appearing:
      - Check Supabase realtime is enabled: `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`
      - Check browser console for subscription status

---

## Expected Results Summary

| Phase | Component | Expected Status |
|-------|-----------|-----------------|
| 1 | Checkout form submission | ✅ Success modal with order ID |
| 1 | localStorage | ✅ Array format `["uuid", ...]` |
| 2 | Conversations table | ✅ 1 row with `guest_tracking_token` |
| 2 | Messages table | ✅ 1+ rows, system bot as sender |
| 3 | Auth context | ✅ `isGuestMode: true` |
| 3 | Conversation list | ✅ 1 conversation visible |
| 3 | System message render | ✅ Centered, italic, with bot ID sender |
| 4 | Realtime subscription | ✅ SUBSCRIBED status, new messages appear |

---

## Failure Scenarios & Diagnostics

### ❌ "No conversations yet" on messages page
**Diagnosis:**
1. Check guest token: `console.log(localStorage.hive_guest_active_cart)`
   - If `null` or format is wrong → guest tracking broke
2. Check Supabase:
   - `SELECT * FROM conversations WHERE context_order_id = [order-id]`
   - If empty → RPC didn't create conversation
   - If has rows → frontend loading bug
3. Check browser console:
   - `[useDualStateMessaging] Auth Context` should show `isGuestMode: true`
   - If `false` → useGuestTracking format parsing failed

**Fix:** Re-run migration, clear localStorage, try again

### ❌ System message not rendering
**Diagnosis:**
1. Check `messages` table:
   - `SELECT * FROM messages WHERE conversation_id = '...'`
   - If `sender_id != '00000000-0000-0000-0000-000000000000'` → not system message
2. Check component logic in `Messages.tsx`:
   - Search for `SYSTEM_BOT_ID` constant
   - Verify system message rendering block is not hidden

**Fix:** Ensure migrations ran; check sender_id in database

### ❌ Realtime updates not working
**Diagnosis:**
1. Check Supabase realtime enabled:
   - Dashboard → Database → Publications → supabase_realtime
   - Table `messages` should be listed
2. Check browser subscription:
   - Dev Tools Console → filter by "subscribeToMessages"
   - Should see "Status: SUBSCRIBED"
3. Insert test message:
   ```sql
   INSERT INTO messages (...) VALUES (...)
   RETURNING *;
   ```
   - UI should update within 1 second

**Fix:** Run `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`

---

## Success Criteria

A **successful test** means:

✅ Guest order placed (see RPC success modal)  
✅ localStorage has array-formatted tokens  
✅ Supabase conversations table has row with guest_tracking_token  
✅ Supabase messages table has system receipt with bot sender  
✅ Messages page shows conversation WITHOUT login  
✅ System message renders as centered italic badge  
✅ (Bonus) New messages appear realtime without refresh  

If all ✅, **the messaging pipeline is repaired and ready for production.**

---

## Performance Expectations

| Operation | Expected Time |
|-----------|----------------|
| Checkout submit → success | < 2 seconds |
| localStorage write | < 100ms |
| Navigate to /messages | < 1 second (if cached) |
| Conversation list load | < 500ms (1 network request) |
| Messages load | < 500ms (1 network request) |
| Realtime message appear | < 1 second (after insert) |
| Total guest flow | < 5 seconds |

---

## Cleanup

After testing, you can:
- Delete guest orders: `DELETE FROM orders WHERE buyer_id IS NULL AND tracking_token = '...'`
- Clear localStorage: `localStorage.removeItem('hive_guest_active_cart')`
- Test fresh flow again with new order

---

## Sign-Off

Once this test passes, the system is **launch-ready for guest messaging.**

Next steps:
1. Test with real vendors (add vendor reply)
2. Test on mobile (Messages page responsive)
3. Monitor production errors in first 24 hours
