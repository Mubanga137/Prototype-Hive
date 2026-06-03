# Testing Real-Time Message Notifications

## Prerequisites
- Navigate to `/customer-dash?section=Messages` in your browser
- Open browser Developer Console (F12)
- The Messaging Debug Panel should appear in the bottom-left corner

## Test Scenarios

### Scenario 1: Guest Customer Receipt Notification

**Setup:**
1. Set a guest tracking token in localStorage:
   ```javascript
   localStorage.setItem("hive_guest_active_cart", "test-cart-12345");
   ```

2. Expand the Messaging Debug Panel and click "Create Test Data"

3. Manually insert a test message into the database:
   ```sql
   INSERT INTO messages (conversation_id, sender_id, content, message_type)
   VALUES (
     '<conversation_id>',
     'system',
     '🐝 Hive System Receipt\nOrder #123\nTotal: K99.99\nEstimated Delivery: 2-3 hours\n[Token: test-cart-12345]',
     'system_receipt'
   );
   ```

**Expected Behavior:**
- ✅ Toast appears: "🐝 Order Confirmed! Check your receipt inbox details."
- ✅ Toast displays for 6 seconds
- ✅ Message appears in conversation feed on reload
- ✅ Debug panel logs confirmation message

**Verification in Console:**
```javascript
// Check localStorage
console.log(localStorage.getItem("hive_guest_active_cart"));

// Check auth context
// Should show isGuest: true, trackingToken present
```

---

### Scenario 2: Vendor Order Notification

**Setup:**
1. Log in as a vendor user (role: 'vendor')

2. Create a test vendor notification:
   ```sql
   INSERT INTO messages (conversation_id, sender_id, content, message_type)
   VALUES (
     '<vendor_conversation_id>',
     'system',
     '📦 Retailer Notification\nNew order from John Doe\nItems: 2x Bread, 1x Milk\nTotal: K250\nPickup: Downtown Store',
     'retailer_notification'
   );
   ```

**Expected Behavior:**
- ✅ Audio chime plays (if browser allows audio)
- ✅ Toast appears: "📦 New Hive Order Booked! Prepare item for fulfillment."
- ✅ Toast displays for 6 seconds
- ✅ Debug panel logs vendor notification

**Verification in Console:**
```javascript
// Check user role
console.log(useAuth().profile.role); // Should be 'vendor'

// Check toast system
console.log("[useGlobalMessageListener] Vendor order notification toast shown");
```

---

### Scenario 3: Rider Delivery Claimed Notification

**Setup:**
1. Log in as a gig_worker user (role: 'gig_worker')

2. Create a test delivery notification:
   ```sql
   INSERT INTO messages (conversation_id, sender_id, content, message_type)
   VALUES (
     '<rider_conversation_id>',
     'system',
     '🚀 Delivery Route Claimed Successfully!\nOrder #456 has been claimed for delivery.',
     'delivery_notification'
   );
   ```

**Expected Behavior:**
- ✅ Toast appears: "🚀 Delivery Route Claimed Successfully!"
- ✅ Toast displays for 6 seconds
- ✅ Debug panel logs rider notification
- ✅ Message appears in conversation feed

**Verification in Console:**
```javascript
// Check user role
console.log(useAuth().profile.role); // Should be 'gig_worker'

// Monitor real-time subscription
console.log("[useGlobalMessageListener] Rider delivery notification toast shown");
```

---

## Debug Panel Usage

### Verify Tables
- Click "Verify Tables" button
- Checks connectivity to `conversations` and `messages` tables
- Confirms real-time subscriptions are available

**Success Output:**
```
✅ Conversations table exists
✅ Messages table exists
✅ Real-time channel subscribed
```

### Load Conversations
- Click "Load Conversations" button
- Lists all conversations for current user/guest
- Shows participant IDs and order associations

**Expected Output:**
```
Found N conversations
  - [conversation_id]: user_a <-> user_b
  - [conversation_id]: NULL <-> [guest_token]
```

### Load Messages
- Click "Load Messages" button
- Lists all messages across all conversations
- Shows message previews

**Expected Output:**
```
Found N messages
  - user_id: "Hello from customer!"
  - user_id: "Hello from support!"
  - system: "🐝 Hive System Receipt..."
```

### Create Test Data
- Click "Create Test Data" button
- Creates a sample conversation between logged-in user and a test user
- Sends 2 test messages
- Useful for basic connectivity testing

**Expected Output:**
```
Creating test conversation with test-user-abc123...
Conversation created: [uuid]
Sending test messages...
Message 1 sent ✓
Message 2 sent ✓
```

---

## Manual Testing Workflow

### End-to-End Test

1. **Setup Phase:**
   ```
   a) Open /customer-dash?section=Messages
   b) Expand debug panel
   c) Click "Create Test Data"
   d) Wait for success messages
   ```

2. **Conversation Phase:**
   ```
   a) Conversation should appear in left sidebar
   b) Click conversation to view messages
   c) You should see 2 test messages
   ```

3. **Real-Time Phase:**
   ```
   a) In another browser tab, open database admin
   b) Insert a new message with proper prefix:
      - '🐝 Hive System Receipt' (guest)
      - '📦 Retailer Notification' (vendor)
      - '🚀 Delivery Route Claimed' (rider)
   c) Return to Messages page
   d) Toast should appear immediately in top-right
   e) Message should appear in conversation feed
   ```

4. **Verification Phase:**
   ```
   a) Check browser console for debug logs
   b) Verify message appears in conversation thread
   c) Confirm toast dismisses after 6 seconds
   d) Try creating another test message
   e) Verify no duplicate toasts appear
   ```

---

## Console Debug Logging

Enable all messaging debug logs:

```javascript
// In browser console
const originalLog = console.log;
console.log = function(...args) {
  if (String(args[0]).includes('[useGlobal') || 
      String(args[0]).includes('[CustomerMessages')) {
    originalLog.style = 'color: #B37C1C; font-weight: bold';
    originalLog(...args);
  }
  originalLog(...args);
};
```

Monitor real-time subscriptions:

```javascript
// Check active Supabase channels
console.log(supabase._realtime.channels);

// Should see:
// - global_message_alerts
// - messages:[conversation_id]
// - conversations:[auth_mode]:[identifier]
```

---

## Troubleshooting Test Failures

| Issue | Check | Solution |
|-------|-------|----------|
| Toast not appearing | 1. Check message prefix<br>2. Check user role<br>3. Check localStorage token | Verify exact message format in database |
| Duplicate toasts | Check Set deduplication | Refresh page and wait 10s between inserts |
| Conversation not loading | Check user auth context | Verify participant_a or guest_tracking_token matches |
| Audio not playing | Check browser permissions | Reload page to grant audio permission |
| Messages not real-time | Check RLS policies<br>Check Supabase connection | Verify `ALTER PUBLICATION` enable replication |
| Debug panel missing | Check URL | Must navigate to `/customer-dash` first |

---

## Advanced Testing

### Load Testing
Create multiple messages rapidly to verify deduplication:

```javascript
// In console
for (let i = 0; i < 5; i++) {
  // Insert same message multiple times
  // Should see toast only once
}
```

### Role Switching Test
Test notifications across different user roles:

1. Login as customer → verify guest/customer toasts only
2. Logout and refresh as guest → verify guest toasts only
3. Login as vendor → verify vendor toasts only
4. Login as rider → verify rider toasts only

### Network Resilience
Test behavior when real-time connection drops:

```javascript
// Disconnect from real-time
supabase._realtime.disconnect();

// Try to send message
// Should eventually reconnect and show toast
```

---

## Expected Console Output

When everything is working:

```
[useGlobalMessageListener] Global message listener active for customer
[useGlobalMessageListener] Guest order receipt toast shown
[CustomerMessages] Real-time subscribed to messages:uuid
[CustomerMessages] Received new message from real-time: abc123...
[CustomerMessages] Message appended to state
```

Check that logs appear when:
- Page loads: "Global message listener active"
- Message inserted: "Received new message"
- Toast triggered: "toast shown"
- State updated: "Message appended"
