# How to Load and Test System Messages

## The Issue

The Messages page shows "No conversations yet" because there are no actual system messages in your database. The real-time listener is working, but there's nothing to display until messages exist.

## Quick Solution (3 steps)

### Step 1: Navigate to Messages Page
Go to `/customer-dash?section=Messages`

You should see:
- Empty conversation list on the left (No conversations yet)
- "Select a conversation" prompt on the right
- Debug panel at the bottom-left: "🐛 Messaging Debug"

### Step 2: Expand the Debug Panel
Click the "🐛 Messaging Debug" button to expand it.

You'll see:
- A log area (will show activity)
- Multiple action buttons
- New buttons for creating system messages

### Step 3: Create Test Messages

Click **one of these buttons** based on your user role:

#### If you're a Customer:
**Click: "Create Receipt 🐝"**
- Creates a test order confirmation
- You'll see a system receipt message in the Messages feed
- Toast should appear: "🐝 Order Confirmed!"

#### If you're a Vendor:
**Click: "Create Order 📦"**
- Creates a test order notification
- You'll see a vendor order alert in the Messages feed
- Toast should appear: "📦 New Hive Order Booked!"
- Audio chime should play

#### If you're a Rider:
**Click: "Create Delivery 🚀"**
- Creates a test delivery claim notification
- You'll see a delivery message in the Messages feed
- Toast should appear: "🚀 Delivery Route Claimed!"

## What Happens Automatically

When you click one of these buttons:

1. ✅ A **conversation** is created in the database
2. ✅ A **system message** is inserted with the right emoji prefix
3. ✅ Real-time listener detects the INSERT event
4. ✅ **Toast notification** appears in top-right (if everything works)
5. ✅ **Conversation reloads** in the sidebar
6. ✅ **Message appears** in the conversation feed
7. ✅ **Debug panel logs** all the steps

## Verify It's Working

After clicking a system message button, you should see:

### In the Debug Panel Log:
```
[HH:MM:SS] Creating system receipt for customer...
[HH:MM:SS] ✅ Test conversation and system receipt created successfully!
[HH:MM:SS] Conversation: [uuid]
[HH:MM:SS] Check Messages page - you should see the receipt!
```

### On the Page:
- [ ] Conversation appears in the left sidebar
- [ ] When clicked, messages load on the right
- [ ] System message displays with emoji (🐝/📦/🚀)
- [ ] Toast appears in top-right corner
- [ ] Toast disappears after 6 seconds

### In Browser Console (F12):
```
[useGlobalMessageListener] Global message listener active for customer
[useGlobalMessageListener] Guest order receipt toast shown
[CustomerMessages] Loaded 1 conversations
[CustomerMessages] Loaded 1 messages for conversation
```

## Full Testing Workflow

### Test 1: View System Receipt

1. Click "Create Receipt 🐝"
2. Wait for log message
3. Conversation should appear in left panel
4. Click conversation
5. See the system receipt message
6. ✅ Toast appeared during step 2

### Test 2: Load More Conversations

1. Click "Create Receipt 🐝" again (creates another one)
2. Left panel now shows 2 conversations
3. Each can be opened to view its message
4. ✅ Verify both are loadable

### Test 3: Real-Time Updates

1. Keep Messages page open
2. In another browser tab, go to database admin
3. Manually INSERT a message with prefix "🐝 Hive System Receipt"
4. Return to Messages tab WITHOUT refreshing
5. Toast should pop up
6. Reload page
7. Message should be in conversation feed
8. ✅ Real-time is working!

### Test 4: Check Different Roles

If you have multiple user accounts with different roles:

```
1. Login as Customer → Click "Create Receipt 🐝"
   Should see: 🐝 toast

2. Logout, Login as Vendor → Click "Create Order 📦"
   Should see: 📦 toast + audio

3. Logout, Login as Rider → Click "Create Delivery 🚀"
   Should see: 🚀 toast
```

## Troubleshooting

### "No user logged in" error
- Sign in first before clicking system message buttons
- Must be authenticated user

### Log shows "Error" message
- Check Supabase connection
- Click "Verify Tables" button first
- See the error details in the log

### Toast doesn't appear but message created
- Check browser console for errors
- Message was created but real-time listener didn't detect it
- Try refreshing page
- Verify user role matches in database profile

### Conversation doesn't load
- Click "Load Conversations" button
- If nothing appears, check if you're the participant_a
- For guests, verify guest_tracking_token matches

### Audio doesn't play (vendor only)
- Browser may require user interaction before playing audio
- Try clicking something else first, then refresh
- Check browser audio permissions

## What Gets Created

Each system message button creates:

### 🐝 Receipt:
```
Conversation:
  - participant_a: [your user id]
  - context_order_id: 1001
  
Message:
  - sender_id: "system"
  - content: "🐝 Hive System Receipt\n..."
  - message_type: "system_receipt"
```

### 📦 Vendor Order:
```
Conversation:
  - participant_a: [your user id]
  - context_order_id: 2001
  
Message:
  - sender_id: "system"
  - content: "📦 Retailer Notification\n..."
  - message_type: "retailer_notification"
```

### 🚀 Delivery:
```
Conversation:
  - participant_a: [your user id]
  - context_order_id: 3001
  
Message:
  - sender_id: "system"
  - content: "🚀 Delivery Route Claimed...\n..."
  - message_type: "delivery_notification"
```

## Console Logs to Look For

Success indicators in browser console:

```javascript
// Page loaded and listener started
"[useGlobalMessageListener] Global message listener active for customer"

// Message created in database
"[testSystemMessages] Conversation created: [uuid]"
"[testSystemMessages] Message created: [uuid]"

// Conversation loaded
"[CustomerMessages] Loaded 1 conversations"

// Message received by real-time
"[CustomerMessages] Received new message from real-time: abc123..."
"[useGlobalMessageListener] Guest order receipt toast shown"
```

## Next: Production Setup

Once you verify this works:

1. ✅ Frontend system is working
2. ⏳ Set up database triggers for order events
3. ⏳ Remove debug panel before going live
4. ⏳ Deploy to production

The system is now ready—you just need real data from your order processing backend.

---

## Debug Panel Buttons Reference

| Button | Creates | Toast | For |
|--------|---------|-------|-----|
| Verify Tables | N/A | N/A | Check connectivity |
| Load Conversations | N/A | N/A | View all convs |
| Load Messages | N/A | N/A | View all msgs |
| Create Test Data | Random conversation | N/A | Basic testing |
| Create Receipt 🐝 | Order receipt | 🐝 | Customers |
| Create Order 📦 | Vendor notification | 📦 | Vendors |
| Create Delivery 🚀 | Rider notification | 🚀 | Riders |
| Clear Logs | N/A | N/A | Clean panel |

**TL;DR**: Click "Create Receipt 🐝" (or your role's button), watch the log, see the message appear, confirm the toast worked. Done!
