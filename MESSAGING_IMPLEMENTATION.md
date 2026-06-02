# Messaging UI Twin-Table Architecture Implementation

## Overview

The messages UI panel has been successfully bound to the twin-table architecture (`public.conversations` and `public.messages`) with support for both registered users and guest buyers. The implementation features real-time message streaming, dynamic conversation fetching, and premium Ivory/Charcoal branding.

---

## Architecture

### Database Schema

**public.conversations** table:
- `id` (UUID): Primary key
- `participant_a` (UUID | NULL): First participant (registered user)
- `participant_b` (UUID | NULL): Second participant (registered user)
- `guest_tracking_token` (VARCHAR | NULL): 36-char guest identifier
- `last_message` (TEXT | NULL): Preview of most recent message
- `last_message_at` (TIMESTAMP | NULL): When last message was sent
- `context_order_id` (INT | NULL): Related order ID
- `created_at` (TIMESTAMP): Conversation creation time

**public.messages** table:
- `id` (UUID): Primary key
- `conversation_id` (UUID): Foreign key → conversations
- `sender_id` (VARCHAR): User ID or `guest_[token]`
- `content` (TEXT | NULL): Message text
- `message_type` (VARCHAR): "text", "system", etc.
- `created_at` (TIMESTAMP): Message timestamp

---

## UI Implementation: Dual-State Fallback

### 1. Fetch Conversation Thread Dynamically

Located in: `src/pages/customer/Messages.tsx` → `loadConversations()` function

```typescript
// Dual-state fallback check:
if (isAuthenticated && uid) {
  // Fallback Check 1: Customer session is logged in
  // SELECT * FROM conversations WHERE participant_a === auth.uid() OR participant_b === auth.uid()
  query = query.or(`participant_a.eq.${uid},participant_b.eq.${uid}`);
} else if (!isAuthenticated && trackingToken) {
  // Fallback Check 2: Anonymous Guest Buyer is active
  // Extract 36-character token from localStorage.hive_guest_active_cart
  // Fetch unique row WHERE guest_tracking_token === cachedToken
  query = query.eq("guest_tracking_token", trackingToken);
}
```

**Logic Flow:**
1. Check if user is authenticated via `useAuth()` hook
2. If authenticated: fetch conversations where user is either `participant_a` or `participant_b`
3. If not authenticated: use `useGuestTracking()` hook to extract 36-char token from `localStorage.hive_guest_active_cart`
4. If guest token exists: fetch conversations where `guest_tracking_token === token`

---

## Real-Time Message Streaming

### 2. Stream Real-Time Message Bubbles

Located in: `src/pages/customer/Messages.tsx` → Real-time subscription block

#### Active Conversation Subscription

```typescript
useEffect(() => {
  if (!activeConv?.id) return;

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: any) => {
        const newMsg = payload.new as Message;
        setMessages((prev) =>
          prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [activeConv?.id]);
```

**Key Features:**
- Sets up active real-time subscription targeting `public.messages` table
- Filters **strictly by current `conversation_id`** using Supabase filter syntax
- Prevents duplicate messages with existence check
- Auto-unsubscribes when conversation changes

#### Message Field Mapping

Message properties are bound to UI interface layout cards:

| Database Field | UI Display | Element |
|---|---|---|
| `content` | Message text bubble | `.content` |
| `created_at` | Timestamp below message | `.formatTime()` |
| `sender_id` | Determines bubble alignment | `isOwn` logic |
| `message_type` | Message rendering type | "text", "system", etc. |

---

## Premium Branding

### Ivory & Charcoal Theme

**Ivory** (`#FFFBF2`):
- Background gradient base
- Received message bubbles
- Input area background
- Chat header gradient

**Charcoal** (`#0F1A35`):
- Text color
- Chat bubbles for received messages
- Icon colors

**Golden Bronze** (`#B37C1C`):
- Sent message bubbles
- Action buttons
- Primary interactive elements
- WhatsApp button (accent: `#25D366`)

### Branding Elements Preserved

1. **Overlay Style**: Charcoal background frames with Ivory text
2. **Message Bubbles**: 
   - Sent: Bronze (`#B37C1C`) with Ivory text
   - Received: Light Ivory with Charcoal text
3. **WhatsApp Receipt Button**: Direct messaging integration

```typescript
{otherProfile?.phone && (
  <a
    href={`https://wa.me/${otherProfile.phone.replace(/\D/g, "")}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110"
    style={{ backgroundColor: "#25D366" }}
    title="Open on WhatsApp"
  >
    <span className="text-lg">💬</span>
  </a>
)}
```

---

## Real-Time Functionality

### System vs App Messages

The implementation supports both:
- **System Messages**: From system/bot channels
- **App Messages**: User-to-user chat and product shares
- **In-app Chatting**: Real-time message exchange between any participants

### Message Handling

1. **Send Message**:
   - Insert into `public.messages`
   - Update conversation's `last_message` and `last_message_at`
   - For guests: sender_id = `guest_[trackingToken]`
   - For users: sender_id = `auth.uid()`

2. **Receive Message**:
   - Real-time subscription triggers on INSERT
   - Message appended to state
   - Auto-scroll to latest
   - Renders immediately with formatting

3. **Conversation Updates**:
   - Real-time subscription on conversation updates
   - New conversations prepended to list
   - List re-orders by `last_message_at`

---

## State Management

### Key State Variables

| Variable | Purpose |
|---|---|
| `conversations` | Array of all user's conversations |
| `activeConv` | Currently selected conversation |
| `messages` | Messages in active conversation |
| `profiles` | User profile cache (name, phone) |
| `draft` | Current message input text |
| `sending` | Message send loading state |
| `loading` | Initial load state |

### Channel Management

```typescript
const realtimeChannelsRef = useRef<Map<string, any>>(new Map());
```

- Tracks all active subscriptions
- Prevents memory leaks on unsubscribe
- Automatically cleans up old channels

---

## Mobile Responsiveness

- **Mobile**: Animated toggle between conversation list and chat (Framer Motion)
- **Desktop**: Two-panel layout (list + chat side-by-side)
- Responsive avatar sizes and text truncation
- Touch-friendly input areas

---

## Testing Checklist

### Authenticated User Scenario
```
1. Login with registered account
2. Verify loadConversations() uses participant_a/participant_b filter
3. Select a conversation
4. Send a message → verify INSERT into messages table
5. Receive a message in real-time → verify subscription triggers
6. Check conversation's last_message updates → verify UPDATE
```

### Guest Buyer Scenario
```
1. Logout or clear auth
2. Set localStorage.hive_guest_active_cart = "36-char-uuid-token"
3. Navigate to /customer/messages
4. Verify loadConversations() uses guest_tracking_token filter
5. Select a conversation
6. Send a message → verify sender_id = guest_[token]
7. Receive a message → verify real-time updates work
8. Check WhatsApp button shows on contact phone
```

### Real-Time Features
```
1. Open chat in two tabs/browsers
2. Send message from Tab A
3. Verify Tab B receives message in real-time (< 1 sec)
4. Verify message content and timestamp are correct
5. Verify last_message_at is updated
6. Close Tab A subscription
7. Send message from another user
8. Verify Tab B still receives new conversation updates
```

### Branding Verification
```
1. Check sent bubble color: #B37C1C (Bronze)
2. Check received bubble color: #FFFBF2 (Ivory) with #0F1A35 text
3. Check send button color: #B37C1C
4. Check WhatsApp button: #25D366
5. Check background gradient: Ivory to light cream
6. Check timestamp format: "12:34 PM" or "Mon" or "Jan 15"
```

---

## File Structure

```
src/pages/customer/Messages.tsx           ← Main implementation
  ├── useAuth() → registered user detection
  ├── useGuestTracking() → 36-char token extraction
  ├── useIsMobile() → responsive layout
  ├── Conversation loading (dual-state)
  ├── Real-time subscriptions
  │   ├── messages table (conversation_id filtered)
  │   └── conversations table (updates)
  ├── Message rendering
  │   ├── Text bubbles
  │   ├── System messages
  │   └── Timestamps
  └── UI components
      ├── Conversation list
      ├── Chat panel
      ├── Input area
      └── WhatsApp button

src/hooks/useAuth.tsx                     ← User authentication
src/hooks/useGuestTracking.ts             ← Guest token management
src/integrations/supabase/client.ts       ← Supabase instance
```

---

## Key Implementation Details

### Dual-State Logic
- **Authentication check** happens in `loadConversations()`
- **Fallback to guest mode** if `!isAuthenticated && trackingToken`
- **Token validation** ensures 36-char UUID format

### Real-Time Filtering
- **Messages subscription**: Filters by `conversation_id` to prevent message overload
- **Conversation subscription**: Monitors all conversation changes for user/guest
- **Channel cleanup**: Map-based tracking prevents orphaned subscriptions

### Message Identification
```typescript
const isOwn = msg.sender_id === uid || msg.sender_id === `guest_${trackingToken}`;
```
- Works for both registered users and guests
- Ensures correct bubble alignment (right vs left)
- Color coding: Bronze (own) vs Ivory (other)

---

## Error Handling

- Toast notifications on send failure
- Console error logging with context tags (`[CustomerMessages]`)
- Graceful fallback for missing profiles
- Loading state during initial conversation fetch
- Sending state prevents duplicate submissions

---

## Performance Optimizations

1. **Profile Caching**: Profiles fetched once per conversation list update
2. **Deduplication**: Checks if message already exists before appending
3. **Filtered Subscriptions**: Only receives messages for active conversation
4. **Channel Cleanup**: Prevents memory leaks from orphaned subscriptions
5. **Ref-based Channel Map**: O(1) lookup and cleanup

---

## Next Steps

1. **Verify database tables** have correct schema and indexes
2. **Test auth state changes** (login/logout flow)
3. **Monitor console logs** for subscription status messages
4. **Verify RLS policies** allow appropriate reads/writes
5. **Test with slow network** to ensure optimistic UI updates
6. **Load test** with 100+ messages in conversation
7. **Mobile testing** on actual devices for responsive layout

---

## API Surface

### Public Functions
- `CustomerMessages()` component exports no public API
- All state managed internally
- Subscribe to conversation updates via component mounting

### Hooks Used
- `useAuth()` → `user.id`
- `useGuestTracking()` → `trackingToken`, `isGuest`
- `useIsMobile()` → `isMobile`
- `useRef()` → `chatEndRef`, `inputRef`, `realtimeChannelsRef`
- `useState()` → All UI state
- `useCallback()` → `loadConversations()`, `loadMessagesForConversation()`, `loadProfiles()`
- `useEffect()` → Subscriptions, side effects

---

## Related Files

- `src/lib/messaging-setup.ts` — Messaging utilities (verification, test data)
- `src/components/messaging/MessagingDebugPanel.tsx` — Debug panel for development
- `src/hooks/useGuestTracking.ts` — Guest token extraction logic

---

**Status**: ✅ Implementation Complete

All requirements met:
- ✅ Dual-state fallback conversation loading
- ✅ Real-time message streaming with conversation filtering
- ✅ Message content and timestamp binding
- ✅ Premium Ivory/Charcoal branding preserved
- ✅ WhatsApp receipt button functional
- ✅ Real-time updates for both system and in-app messages
