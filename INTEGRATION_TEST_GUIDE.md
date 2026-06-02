# Integration Test Guide: Messages UI Twin-Table Binding

## Pre-Flight Checklist

Before testing, ensure:
- [ ] Supabase project is active and connected
- [ ] `public.conversations` table exists with correct schema
- [ ] `public.messages` table exists with correct schema
- [ ] RLS policies allow authenticated and guest access
- [ ] Dev server is running (`npm run dev`)
- [ ] Real-time is enabled in Supabase settings

---

## Test Suite 1: Authenticated User Flow

### Test 1.1: Conversations Load for Registered User
**Precondition**: User is logged in
**Steps**:
1. Navigate to `/customer/messages`
2. Open browser DevTools → Console
3. Look for log: `[CustomerMessages] Real-time subscribed to conversations:user:${uid}`
4. Verify conversations list populates

**Expected Result**: 
- ✅ Conversations load within 2 seconds
- ✅ Only conversations where user is participant_a or participant_b show
- ✅ Console shows real-time subscription active
- ✅ Conversations sorted by `last_message_at` descending

**Verification Query** (Supabase):
```sql
SELECT id, participant_a, participant_b, last_message_at
FROM conversations
WHERE participant_a = '${user_id}' OR participant_b = '${user_id}'
ORDER BY last_message_at DESC
LIMIT 10;
```

---

### Test 1.2: Select Conversation and Load Messages
**Precondition**: User is logged in with existing conversations
**Steps**:
1. From conversation list, click on a conversation
2. Verify chat panel opens
3. Check console for: `[CustomerMessages] Real-time subscribed to messages:${conv_id}`
4. Wait for message history to load

**Expected Result**:
- ✅ Selected conversation highlights (light bronze background)
- ✅ Messages load in correct order (oldest → newest)
- ✅ Contact name and phone display in header
- ✅ Real-time subscription active for this conversation

**Verification Query** (Supabase):
```sql
SELECT id, sender_id, content, created_at
FROM messages
WHERE conversation_id = '${conversation_id}'
ORDER BY created_at ASC
LIMIT 50;
```

---

### Test 1.3: Send Text Message
**Precondition**: User is logged in, conversation selected
**Steps**:
1. Type message in input: `"Test message from authenticated user"`
2. Press Enter or click send button
3. Verify message appears in chat
4. Check timestamp displays correctly
5. Verify bubble color is Bronze (#B37C1C)
6. Check conversation list shows new last_message

**Expected Result**:
- ✅ Message sends within 500ms
- ✅ Message bubble appears on right (sent)
- ✅ Text is Ivory (#FFFBF2)
- ✅ Timestamp shows (e.g., "12:34 PM")
- ✅ Auto-scrolls to latest message
- ✅ Conversation list updates last_message
- ✅ No error toast appears

**Verification Queries** (Supabase):
```sql
-- Check message was inserted
SELECT id, sender_id, content, created_at
FROM messages
WHERE conversation_id = '${conversation_id}'
AND sender_id = '${user_id}'
ORDER BY created_at DESC
LIMIT 1;

-- Check conversation was updated
SELECT last_message, last_message_at
FROM conversations
WHERE id = '${conversation_id}';
```

---

### Test 1.4: Receive Message in Real-Time
**Precondition**: Two users in same conversation
**Steps**:
1. **User A**: Keep messages screen open
2. **User B**: Send message from another session/app
3. **User A**: Watch for message to appear
4. Check timestamp and content are correct

**Expected Result**:
- ✅ Message appears in User A's chat within 1 second
- ✅ No page refresh needed
- ✅ Message content matches what User B sent
- ✅ Sender's bubble is on left (received)
- ✅ Text color is Charcoal (#0F1A35)
- ✅ Auto-scrolls to show new message

**Verification**:
- Watch browser DevTools Network tab for real-time event
- Check subscription channel receives postgres_changes event

---

### Test 1.5: Search Conversations
**Precondition**: Multiple conversations exist
**Steps**:
1. Type contact name in search box: e.g., "Alice"
2. Verify conversation list filters
3. Clear search
4. Verify all conversations return

**Expected Result**:
- ✅ Filters by contact name
- ✅ Case-insensitive matching
- ✅ Partial name matches work
- ✅ Clearing search restores full list

---

### Test 1.6: WhatsApp Integration Button
**Precondition**: Contact has phone number in profile
**Steps**:
1. Select conversation with contact
2. Look for green button (💬) in chat header
3. Click the button
4. Verify WhatsApp opens (web or app)
5. Check phone number is correctly formatted

**Expected Result**:
- ✅ Button appears only if phone exists
- ✅ Button is green (#25D366)
- ✅ Clicking opens WhatsApp with correct number
- ✅ Phone formatted as international (+[country][number])

---

## Test Suite 2: Guest Buyer Flow

### Test 2.1: Conversations Load for Guest
**Precondition**: 
- User is NOT logged in
- localStorage has: `hive_guest_active_cart = "550e8400-e29b-41d4-a716-446655440000"`
**Steps**:
1. Logout if logged in
2. Set localStorage guest token (via DevTools or code)
3. Navigate to `/customer/messages`
4. Verify conversations list populates

**Expected Result**:
- ✅ Only conversations with matching `guest_tracking_token` show
- ✅ Console shows: `[CustomerMessages] Real-time subscribed to conversations:guest:${token}`
- ✅ Guest conversations load within 2 seconds

**JavaScript Setup** (DevTools Console):
```javascript
localStorage.setItem('hive_guest_active_cart', '550e8400-e29b-41d4-a716-446655440000');
// Reload page
location.reload();
```

**Verification Query** (Supabase):
```sql
SELECT id, guest_tracking_token, last_message_at
FROM conversations
WHERE guest_tracking_token = '550e8400-e29b-41d4-a716-446655440000';
```

---

### Test 2.2: Guest Sends Message
**Precondition**: Guest is active, conversation selected
**Steps**:
1. Type message: `"Guest buyer inquiry"`
2. Send message
3. Verify message appears on right (guest's sent)
4. Check database insertion

**Expected Result**:
- ✅ Message sends successfully
- ✅ Message bubble is Bronze (sent)
- ✅ sender_id is `guest_550e8400-e29b-41d4-a716-446655440000`
- ✅ No authentication error

**Verification Query** (Supabase):
```sql
SELECT id, sender_id, content, created_at
FROM messages
WHERE conversation_id = '${conversation_id}'
AND sender_id LIKE 'guest_%'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Test 2.3: Guest Receives Message in Real-Time
**Precondition**: 
- Guest is viewing conversation
- Merchant/staff sends reply
**Steps**:
1. Guest keeps browser open
2. Merchant sends message to guest conversation
3. Watch for message to appear in guest's chat
4. Verify content and timing

**Expected Result**:
- ✅ Message appears within 1 second
- ✅ No refresh needed
- ✅ Bubble on left (received)
- ✅ Can continue conversation

---

## Test Suite 3: Real-Time Features

### Test 3.1: Real-Time Message from Another Tab
**Precondition**: User logged in with conversation selected
**Steps**:
1. Open same conversation in Tab A
2. Open same conversation in Tab B
3. Send message from Tab A
4. Immediately check Tab B

**Expected Result**:
- ✅ Message appears in Tab B within 500ms
- ✅ Both tabs stay synchronized
- ✅ Both show identical timestamp
- ✅ No duplicate messages

---

### Test 3.2: Real-Time from External System
**Precondition**: Conversation open in browser
**Steps**:
1. Keep conversation open
2. Insert message via Supabase dashboard or API:
   ```sql
   INSERT INTO messages (conversation_id, sender_id, content, message_type)
   VALUES ('${conv_id}', '${other_user_id}', 'System message', 'text');
   ```
3. Watch browser for real-time update

**Expected Result**:
- ✅ Message appears immediately
- ✅ Bubble style correct (left for received)
- ✅ Auto-scroll works
- ✅ No console errors

---

### Test 3.3: Conversation List Updates in Real-Time
**Precondition**: Multiple conversations, one is selected
**Steps**:
1. Keep conversation list visible
2. Send message to another conversation (via other user or API)
3. Watch conversation list

**Expected Result**:
- ✅ New conversation appears at top of list
- ✅ `last_message` shows preview
- ✅ Timestamp updates
- ✅ No manual refresh needed

---

## Test Suite 4: Branding & UI

### Test 4.1: Color Scheme Verification
**Precondition**: Messages UI loaded
**Steps**:
1. Check background gradient (Ivory → Cream)
2. Send a message, check bubble color
3. Receive a message, check bubble color
4. Check input area background
5. Check button colors

**Expected Color Map**:
```
Background gradient:  #FFFBF2 → #F5F1ED (Ivory → Beige)
Sent bubble:          #B37C1C (Bronze)
Sent text:            #FFFBF2 (Ivory)
Received bubble:      #F0EDE6 (Light Ivory)
Received text:        #0F1A35 (Charcoal)
Input background:     #FFFBF2 (Ivory) with gradient
Send button:          #B37C1C (Bronze)
WhatsApp button:      #25D366 (Green)
```

---

### Test 4.2: Typography & Spacing
**Precondition**: Messages UI loaded
**Steps**:
1. Check message content is readable
2. Verify timestamps are small and right-aligned
3. Check contact name is bold
4. Verify bubble padding is consistent

**Expected Result**:
- ✅ Message text: 14px, readable line-height
- ✅ Timestamp: 10px, slightly transparent
- ✅ Contact name: bold, 14px
- ✅ Consistent 12px-16px padding in bubbles

---

### Test 4.3: Mobile Responsiveness
**Precondition**: Responsive design mode or mobile device
**Steps**:
1. Open `/customer/messages` on mobile width (< 768px)
2. Verify conversation list visible initially
3. Click conversation
4. Verify chat panel takes full width
5. Verify back button appears
6. Click back button
7. Verify conversation list returns

**Expected Result**:
- ✅ Smooth animated transitions
- ✅ No horizontal scroll
- ✅ Touch-friendly tap targets (min 44px)
- ✅ Input area visible above keyboard

---

## Test Suite 5: Edge Cases

### Test 5.1: Conversation with No Messages
**Precondition**: Conversation exists but has no messages
**Steps**:
1. Select empty conversation
2. Verify empty state message
3. Type and send first message

**Expected Result**:
- ✅ Shows: "No messages yet. Start the conversation!"
- ✅ Can send message without issue
- ✅ Message appears immediately

---

### Test 5.2: Contact Without Phone Number
**Precondition**: Conversation with contact who has no phone
**Steps**:
1. Select conversation
2. Check chat header

**Expected Result**:
- ✅ WhatsApp button does NOT appear
- ✅ No error in console
- ✅ Chat functions normally

---

### Test 5.3: Very Long Message
**Precondition**: Conversation selected
**Steps**:
1. Send message with 500+ characters
2. Verify message wraps correctly
3. Check timestamp placement

**Expected Result**:
- ✅ Text wraps to multiple lines
- ✅ Bubble expands with text
- ✅ No overflow
- ✅ Timestamp below all text

---

### Test 5.4: Rapid Message Sending
**Precondition**: Conversation selected
**Steps**:
1. Send 5 messages quickly (< 1 second apart)
2. Verify all messages appear
3. Check no duplicates

**Expected Result**:
- ✅ All 5 messages appear
- ✅ Correct order (top to bottom)
- ✅ No duplicates
- ✅ No loading/lag

---

### Test 5.5: Network Interruption
**Precondition**: Conversation selected with messages
**Steps**:
1. Open DevTools → Network → Throttle to Offline
2. Try to send message
3. Check error toast appears
4. Turn network back on
5. Try again

**Expected Result**:
- ✅ Error toast: "Failed to send message"
- ✅ Draft is preserved
- ✅ Can retry after network restored
- ✅ Message sends successfully on retry

---

## Test Suite 6: Performance

### Test 6.1: Load Time with 100 Messages
**Precondition**: Conversation with 100+ messages
**Steps**:
1. Select conversation
2. Open DevTools → Performance
3. Record load time
4. Scroll through messages

**Expected Result**:
- ✅ Load time < 2 seconds
- ✅ Smooth scrolling
- ✅ No jank or lag
- ✅ Memory usage < 20MB

---

### Test 6.2: Real-Time Latency
**Precondition**: Two users active
**Steps**:
1. User A sends message
2. Note send time in console
3. User B receives message
4. Note receive time
5. Calculate: receive_time - send_time

**Expected Result**:
- ✅ Latency < 500ms
- ✅ Typically 100-300ms (WebSocket)
- ✅ Consistent across multiple messages

---

## Test Suite 7: Compatibility

### Test 7.1: Browser Compatibility
**Test Browsers**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Verification**:
- [ ] Messages load
- [ ] Real-time works
- [ ] No console errors
- [ ] Branding colors accurate

---

### Test 7.2: Device Compatibility
**Test Devices**:
- [ ] Desktop (1920x1080)
- [ ] Tablet (iPad)
- [ ] Mobile (iPhone)
- [ ] Mobile (Android)

**Verification**:
- [ ] Layout responsive
- [ ] Touch interactions work
- [ ] Keyboard shows/hides
- [ ] No text cutoff

---

## Test Results Template

```markdown
## Test Results: [Date]

### Test Suite 1: Authenticated User Flow
- [ ] 1.1 Conversations Load - **PASS/FAIL**
- [ ] 1.2 Select & Load Messages - **PASS/FAIL**
- [ ] 1.3 Send Text Message - **PASS/FAIL**
- [ ] 1.4 Receive Real-Time - **PASS/FAIL**
- [ ] 1.5 Search Conversations - **PASS/FAIL**
- [ ] 1.6 WhatsApp Button - **PASS/FAIL**

### Test Suite 2: Guest Buyer Flow
- [ ] 2.1 Guest Conversations Load - **PASS/FAIL**
- [ ] 2.2 Guest Sends Message - **PASS/FAIL**
- [ ] 2.3 Guest Receives Real-Time - **PASS/FAIL**

### Test Suite 3: Real-Time Features
- [ ] 3.1 Cross-Tab Sync - **PASS/FAIL**
- [ ] 3.2 External System Insert - **PASS/FAIL**
- [ ] 3.3 Conversation List Updates - **PASS/FAIL**

### Test Suite 4: Branding & UI
- [ ] 4.1 Color Scheme - **PASS/FAIL**
- [ ] 4.2 Typography - **PASS/FAIL**
- [ ] 4.3 Mobile Responsive - **PASS/FAIL**

### Test Suite 5: Edge Cases
- [ ] 5.1 Empty Conversation - **PASS/FAIL**
- [ ] 5.2 No Phone Number - **PASS/FAIL**
- [ ] 5.3 Long Message - **PASS/FAIL**
- [ ] 5.4 Rapid Sending - **PASS/FAIL**
- [ ] 5.5 Network Error - **PASS/FAIL**

### Test Suite 6: Performance
- [ ] 6.1 Load 100 Messages - **PASS/FAIL**
- [ ] 6.2 Real-Time Latency - **PASS/FAIL**

### Test Suite 7: Compatibility
- [ ] 7.1 Browser Compatibility - **PASS/FAIL**
- [ ] 7.2 Device Compatibility - **PASS/FAIL**

## Summary
**Total Tests**: 21
**Passed**: X
**Failed**: X
**Success Rate**: X%

## Notes
[Add any issues found, quirks, or observations]

## Sign-off
- Tested by: [Name]
- Date: [Date]
- Approved: [Yes/No]
```

---

## Debugging Tips

### Check Real-Time Subscription
```javascript
// In console
console.log(supabase.getChannels());
// Should show active channels for messages and conversations
```

### Monitor Real-Time Events
```javascript
// In console
supabase
  .channel('messages:debug')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
    console.log('[Real-time Event]', payload);
  })
  .subscribe();
```

### Check Database State
```sql
-- Supabase SQL Editor
SELECT COUNT(*) as total_conversations FROM conversations;
SELECT COUNT(*) as total_messages FROM messages;
SELECT * FROM conversations WHERE last_message_at > NOW() - INTERVAL '1 hour';
```

### Verify Auth Mode
```javascript
// In console
const { user } = useAuth();
const { trackingToken } = useGuestTracking();
console.log('Auth mode:', user?.id ? 'User' : trackingToken ? 'Guest' : 'None');
```

---

## Deployment Verification

After deployment to production:

1. **Smoke Test**
   - [ ] Conversations load
   - [ ] Messages send
   - [ ] Real-time works
   - [ ] No console errors

2. **Regression Test**
   - [ ] Existing conversations still visible
   - [ ] Old messages still load
   - [ ] Auth still works
   - [ ] Guest mode still works

3. **Load Test**
   - [ ] Concurrent users work
   - [ ] No database locks
   - [ ] Real-time remains responsive
   - [ ] Memory stable over time

---

**Created**: 2026-06-02  
**Version**: 1.0  
**Status**: Ready for Testing
