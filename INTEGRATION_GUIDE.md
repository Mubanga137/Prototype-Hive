# Real-Time Message Notifications Implementation

## Overview

This implementation adds a global real-time event listener that watches the `public.messages` table for incoming notifications and displays toast alerts across the application based on user roles.

## Architecture

### 1. Global Message Listener Hook (`src/hooks/useGlobalMessageListener.ts`)
- **Location**: Mounted in `AppContent` component in `src/App.tsx`
- **Purpose**: Establishes a Supabase real-time channel subscription at the application root
- **Behavior**:
  - Listens to all `INSERT` events on the `public.messages` table
  - Filters notifications based on user role and context
  - Deduplicates messages using a Set to prevent duplicate toasts
  - Automatically cleans up subscriptions on unmount

### 2. System Messaging Utilities (`src/lib/systemMessaging.ts`)
Provides helper functions to create system messages:

- `createOrGetSystemConversation()`: Creates or retrieves a conversation for system messages
- `sendSystemReceipt()`: Sends a system receipt to a conversation
- `sendOrderConfirmationReceipt()`: Creates an order confirmation receipt for customers
- `sendRetailerOrderNotification()`: Creates an order notification for vendors
- `sendDeliveryClaimedNotification()`: Creates a delivery claim notification for riders

### 3. Message UI (`src/pages/customer/Messages.tsx`)
Existing message interface that displays:
- Conversation list with real-time updates
- Message threads with system receipts
- Automatic loading of conversations on page visit
- Real-time message streaming

## Usage

### For Order Confirmations (Customers/Guests)

When an order is confirmed as paid:

```typescript
import { sendOrderConfirmationReceipt } from "@/lib/systemMessaging";

// For authenticated users
await sendOrderConfirmationReceipt(
  userId,
  orderId,
  `Order #${orderId}\nTotal: $99.99\nEstimated Delivery: 2-3 hours`,
  false
);

// For guest users
const guestToken = localStorage.getItem("hive_guest_active_cart");
await sendOrderConfirmationReceipt(
  "guest-placeholder",
  orderId,
  `Order #${orderId}\nTotal: $99.99\nEstimated Delivery: 2-3 hours`,
  true,
  guestToken
);
```

**Toast Displayed**:
- 🐝 Order Confirmed! Check your receipt inbox details.

### For Vendor Order Notifications

When a new order is placed:

```typescript
import { sendRetailerOrderNotification } from "@/lib/systemMessaging";

await sendRetailerOrderNotification(
  vendorId,
  orderId,
  `New order from John Doe\nItems: 2x Bread, 1x Milk\nTotal: K250`
);
```

**Toast Displayed**:
- 📦 New Hive Order Booked! Prepare item for fulfillment.
- Audio chime plays automatically

### For Delivery Route Claims (Riders)

When a rider claims a delivery:

```typescript
import { sendDeliveryClaimedNotification } from "@/lib/systemMessaging";

await sendDeliveryClaimedNotification(riderId, orderId);
```

**Toast Displayed**:
- 🚀 Delivery Route Claimed Successfully!

## Message Content Format

Messages must follow specific prefixes for the global listener to trigger notifications:

| User Role | Message Prefix | Toast Message |
|-----------|----------------|---------------|
| Customer/Guest | `🐝 Hive System Receipt` | Order Confirmed! |
| Vendor | `📦 Retailer Notification` | New Hive Order Booked! |
| Rider | `🚀 Delivery Route Claimed` | Delivery Route Claimed! |

## Real-Time Flow

```
Database Trigger (order marked as paid)
    ↓
INSERT into public.messages table
    ↓
Supabase Real-Time Event fires
    ↓
useGlobalMessageListener hook receives payload
    ↓
Check message content + user role
    ↓
If match: Dispatch toast.success/info()
    ↓
Conversation UI auto-loads when user navigates to /customer-dash?section=Messages
    ↓
System receipts displayed inline with other messages
```

## Integration Points

### 1. Database Triggers
You'll need database triggers that:
- Listen for order status changes (paid/claimed)
- INSERT message records with appropriate content

Example trigger structure:
```sql
-- When order.payment_status = 'paid'
INSERT INTO public.messages (
  conversation_id,
  sender_id,
  content,
  message_type
) VALUES (
  <conversation_id>,
  'system',
  '🐝 Hive System Receipt\n...',
  'system_receipt'
);
```

### 2. Conversation Initialization
Conversations are created automatically when:
- `createOrGetSystemConversation()` is called
- Or when a user opens the Messages page

### 3. Message Content Population
When user navigates to Messages page:
1. Component loads conversations for the user
2. System receipts are pre-populated in the message thread
3. No loading state shown—messages are already present

## Testing the Implementation

### Debug Panel
The Messages page includes a debug panel (bottom-left corner):
1. Click "🐛 Messaging Debug" to expand
2. Use "Verify Tables" to confirm database connectivity
3. Use "Create Test Data" to generate test conversations

### Manual Testing
1. Navigate to `/customer-dash?section=Messages`
2. If conversations exist, they'll display immediately
3. When system messages arrive, toast appears in top-right
4. Click conversation to view full message thread

### Browser Console
Enable debug logging:
```javascript
// In console
localStorage.setItem('debug', 'useGlobalMessageListener*');
// Then reload page
```

## Error Handling

- **Missing conversations**: System creates on-the-fly when message arrives
- **Toast failures**: Caught and logged to console, doesn't break the app
- **Real-time disconnection**: Auto-reconnects via Supabase
- **Duplicate messages**: Deduplicated by message ID

## Database Schema Requirements

```sql
-- conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  participant_a UUID REFERENCES profiles(user_id),
  participant_b UUID REFERENCES profiles(user_id),
  guest_tracking_token TEXT,
  context_order_id INTEGER,
  last_message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id TEXT,
  content TEXT,
  message_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable real-time on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

## Configuration

No additional configuration needed. The system uses:
- Active user context from `useAuth` hook
- Guest tracking token from `useGuestTracking` hook
- Existing Supabase client configuration
- Sonner toast library (already installed)

## Performance Considerations

- Global listener uses a single real-time channel
- Message deduplication prevents duplicate processing
- Subscriptions are cleaned up on component unmount
- Set-based tracking uses O(1) lookup time

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Toasts not appearing | Check user role in profile, verify message content format |
| Messages not loading | Verify conversation exists, check Supabase RLS policies |
| Duplicate toasts | Already handled by deduplication Set |
| Audio not playing | Browser may require user interaction first, check console for errors |
| Real-time not connecting | Verify Supabase credentials, check network in DevTools |

## Files Modified/Created

- ✅ `src/hooks/useGlobalMessageListener.ts` - New global listener hook
- ✅ `src/lib/systemMessaging.ts` - New system message utilities
- ✅ `src/App.tsx` - Integrated global listener into AppContent
- ✅ `src/pages/customer/Messages.tsx` - No changes needed (already supports real-time)
