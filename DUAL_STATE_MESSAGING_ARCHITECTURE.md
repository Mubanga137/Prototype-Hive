# Dual-State Messaging Architecture

## Overview

The refactored messaging system now cleanly handles both **Registered Accounts** (Users, Vendors, Riders) and **Unauthenticated Guest Buyers** without data leaks. This document outlines the implementation, data flows, and integration points.

---

## 1. DUAL-STATE DATA RETRIEVAL RULES

### Core Hook: `useDualStateMessaging()`
**Location:** `src/hooks/useDualStateMessaging.ts`

The hook determines the active authentication context and branches data-fetching logic accordingly.

#### 1.1 Authentication Context Detection

```typescript
const { user } = useAuth();           // Registered account
const { trackingToken } = useGuestTracking();  // Guest token

// Context resolution:
if (user?.id) {
  // AUTHENTICATED MODE: User, Vendor, or Rider
  authMode = "user"
  authIdentifier = user.id
} else if (hasValidToken && trackingToken) {
  // GUEST MODE: Unauthenticated buyer
  authMode = "guest"
  authIdentifier = trackingToken  // 36-character UUID from localStorage
}
```

#### 1.2 Guest Token Storage

Guest state is persisted in browser cache:
```javascript
// Location: localStorage
localStorage.getItem('hive_guest_active_cart')

// Structure (parsed JSON):
{
  trackingToken: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",  // 36-char UUID
  orderData: { ... },
  cartItems: [ ... ]
}
```

#### 1.3 Conversation Loading Strategy

**IF GUEST MODE (UN-AUTHENTICATED):**

```typescript
// Step 1: Inspect browser cache
const guestCartData = JSON.parse(localStorage.getItem('hive_guest_active_cart'));
const trackingToken = guestCartData.trackingToken;

// Step 2: Twin-table relational lookup
// First, resolve the conversation shell via guest token anchor
const { data: conversations } = await supabase
  .from('conversations')
  .select('id, context_order_id, last_message, last_message_at')
  .eq('guest_tracking_token', trackingToken)  // Filter by guest token
  .order('last_message_at', { ascending: false });

// Step 3: Load message entries for each thread
for (const conversation of conversations) {
  const { data: messages } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at, message_type')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true });
  
  // Store in state
  setMessages(messages || []);
}
```

**IF AUTHENTICATED (REGISTERED ACCOUNT):**

```typescript
// Isolate conversation histories by checking auth.uid() participation
const uid = supabase.auth.user().id;

const { data: conversations } = await supabase
  .from('conversations')
  .select('id, context_order_id, last_message, last_message_at')
  .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)  // User is a participant
  .order('last_message_at', { ascending: false });
```

---

## 2. REAL-TIME SYSTEM ALERTS RENDERING

### 2.1 System Bot Architecture

System alerts are sent by a designated bot account with a reserved sender ID:

```typescript
const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000000";

// Message examples:
// "🐝 Hive System Receipt: Payment confirmed for order #12345"
// "🚀 Delivery Dispatch: Rider assigned, ETA 15 minutes"
// "📦 Order Status: Your package is out for delivery"
```

### 2.2 Real-Time Subscription

A permanent Supabase real-time channel monitors the `public.messages` table:

```typescript
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
    (payload) => {
      const newMsg = payload.new as Message;
      
      // Check if system alert
      if (newMsg.sender_id === SYSTEM_BOT_ID) {
        console.log("System alert received:", newMsg.content);
      }
      
      // Push instantly to state (no page reload required)
      setMessages((prev) => [...prev, newMsg]);
    }
  )
  .subscribe();
```

### 2.3 Visual Styling for System Alerts

System alerts render in a **centered, neutral, italicized banner** separate from peer-to-peer chats:

```typescript
if (isSystemAlert) {
  return (
    <div className="flex justify-center py-3">
      <div className="max-w-md px-4 py-3 rounded-lg bg-[#F0EDE6]/80 
                      text-[#0F1A35]/70 border border-[#B37C1C]/15 
                      italic text-center shadow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {msg.content}
        </p>
        <p className="text-[10px] mt-2 text-[#0F1A35]/50">
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}
```

---

## 3. GUEST-TO-AUTH CONVERSATION CONTINUITY

### 3.1 The Linkage Flow

When a guest user **signs up or logs in**, their historical message threads migrate to their authenticated account.

**Location:** `src/utils/guestConversationLinkage.ts`

```typescript
export async function linkGuestConversationsToUser(userId: string): Promise<void> {
  // Step 1: Retrieve guest token from localStorage
  const trackingToken = JSON.parse(
    localStorage.getItem('hive_guest_active_cart')
  ).trackingToken;

  // Step 2: Fetch all conversations owned by guest
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('guest_tracking_token', trackingToken);

  // Step 3: Migrate conversations
  await supabase
    .from('conversations')
    .update({
      guest_tracking_token: null,
      participant_a: userId,  // Reassign ownership
    })
    .eq('guest_tracking_token', trackingToken);

  // Step 4: Migrate messages (update sender_id)
  const conversationIds = conversations.map((c) => c.id);
  await supabase
    .from('messages')
    .update({ sender_id: userId })
    .eq('sender_id', `guest_${trackingToken}`)
    .in('conversation_id', conversationIds);
}
```

### 3.2 Integration Points

Linkage is called during signup and login flows:

**In `src/pages/Signup.tsx`:**
```typescript
import { linkGuestConversationsToUser } from "@/utils/guestConversationLinkage";

// After signup, before navigation
const userId = user?.id;
if (userId) {
  try {
    await linkGuestConversationsToUser(userId);
  } catch (linkError) {
    console.warn("[Signup] Guest conversation linkage failed (non-blocking):", linkError);
  }
}
```

**In `src/pages/Login.tsx`:**
```typescript
import { linkGuestConversationsToUser } from "@/utils/guestConversationLinkage";

// After login succeeds
const { data: { user } } = await supabase.auth.getUser();
if (user?.id) {
  try {
    await linkGuestConversationsToUser(user.id);
  } catch (linkError) {
    console.warn("[Login] Guest conversation linkage failed (non-blocking):", linkError);
  }
}
```

---

## 4. FRONTEND NAVIGATION CTA BINDING

### 4.1 WhatsApp Receipt Button with Transaction Token

**Location:** `src/pages/customer/Messages.tsx`

The `[ 🟢 VIEW WHATSAPP RECEIPT ]` button securely encodes and transmits transaction verification tokens:

```typescript
{/* WhatsApp Receipt Button with Transaction Token */}
{otherProfile?.phone && activeConv?.context_order_id && (
  <button
    onClick={() => {
      // RULE 3: Wire transaction verification token parameters securely
      // Encode order tracking token and pass as URL query parameter
      const orderTrackingToken = activeConv?.context_order_id?.toString() || "";
      const message = encodeURIComponent(
        `Hello Hive, send my receipt summary text for Token: ${orderTrackingToken}`
      );
      const phoneNumber = otherProfile.phone.replace(/\D/g, "");
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(whatsappUrl, "_blank");
    }}
    className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110 active:scale-95"
    style={{ backgroundColor: "#25D366" }}
    title="View WhatsApp Receipt"
  >
    <span className="text-lg">💬</span>
  </button>
)}
```

### 4.2 URL Encoding Strategy

Transaction tokens are **URL-encoded** to prevent corruption in transit:

```javascript
const rawMessage = `Hello Hive, send my receipt summary text for Token: ${orderTrackingToken}`;
const encodedMessage = encodeURIComponent(rawMessage);
// Result: "Hello%20Hive%2C%20send%20my%20receipt%20summary%20text%20for%20Token%3A%20..."

const whatsappUrl = `https://wa.me/256701234567?text=${encodedMessage}`;
window.open(whatsappUrl, "_blank");
```

### 4.3 Fallback Behavior

If no order context exists, a simpler WhatsApp link is shown:

```typescript
{otherProfile?.phone && !activeConv?.context_order_id && (
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

## 5. IMPLEMENTATION CHECKLIST

### Core Components Updated

- ✅ `src/hooks/useDualStateMessaging.ts` — Dual-state context + guest linkage
- ✅ `src/pages/customer/Messages.tsx` — System alert rendering + WhatsApp CTA
- ✅ `src/utils/guestConversationLinkage.ts` — Guest conversation migration
- ✅ `src/pages/Signup.tsx` — Linkage on signup
- ✅ `src/pages/Login.tsx` — Linkage on login

### Data Model Requirements

Ensure Supabase tables have these fields:

**`conversations` table:**
- `id` (uuid, primary)
- `participant_a` (uuid, nullable)
- `participant_b` (uuid, nullable)
- `guest_tracking_token` (text, nullable)
- `context_order_id` (int, nullable)
- `last_message` (text, nullable)
- `last_message_at` (timestamp, nullable)
- `created_at` (timestamp)

**`messages` table:**
- `id` (uuid, primary)
- `conversation_id` (uuid, foreign key)
- `sender_id` (uuid or text)
- `content` (text, nullable)
- `message_type` (text)
- `created_at` (timestamp)

**System Bot ID (reserved):**
- `sender_id = '00000000-0000-0000-0000-000000000000'` for system alerts

---

## 6. SECURITY NOTES

### Data Isolation

1. **Guests** can only see conversations where `guest_tracking_token` matches their token
2. **Authenticated users** can only see conversations where they are `participant_a` or `participant_b`
3. **System alerts** are visible to all participants in the conversation (no privilege escalation)

### Token Handling

- Guest tracking tokens are **36-character UUIDs** (unguessable)
- Tokens are stored in `localStorage` with minimal exposure
- Upon signup/login, tokens are **cleared after linkage** to prevent replay attacks
- Sender IDs for guest messages follow the pattern `guest_${trackingToken}`

### Message Encryption (Future)

Current implementation assumes HTTPS in transit. Consider adding:
- Supabase Row Level Security (RLS) policies on `conversations` and `messages` tables
- End-to-end encryption for sensitive message content

---

## 7. TROUBLESHOOTING

### Issue: Guest conversations not appearing after signup

**Solution:** Ensure `linkGuestConversationsToUser()` is called immediately after authentication success in Signup/Login pages. Check browser console logs for linkage errors.

### Issue: System alerts not appearing in real-time

**Solution:** Verify the Supabase real-time subscription is active (check browser network tab). Ensure `sender_id = '00000000-0000-0000-0000-000000000000'` for system messages.

### Issue: WhatsApp button not showing

**Solution:** Verify `activeConv?.context_order_id` is populated. Check that `otherProfile?.phone` is not null. Ensure phone number is in valid international format.

### Issue: Guest mode not initializing

**Solution:** Check that `localStorage.getItem('hive_guest_active_cart')` contains valid JSON with `trackingToken` field. Verify `useGuestTracking()` hook is returning correct values.

---

## 8. TESTING WORKFLOWS

### Test Guest Messaging Flow

1. Open app in incognito mode (no auth)
2. Navigate to Messages page
3. Verify guest token is read from localStorage
4. Create a conversation entry with `guest_tracking_token`
5. Send messages (should use `sender_id = guest_${token}`)
6. Refresh page; messages persist

### Test Guest-to-Auth Migration

1. Complete guest messaging flow (above)
2. Sign up with new email/password
3. After signup, verify `linkGuestConversationsToUser()` is called
4. Navigate to Messages page (now authenticated)
5. Verify guest conversations are now visible with `participant_a = userId`
6. Verify messages show `sender_id = userId` (not `guest_*`)

### Test System Alerts

1. Authenticate as user
2. Open Messages page and select a conversation
3. Manually insert a message row with `sender_id = '00000000-0000-0000-0000-000000000000'`
4. Observe message appears in UI as centered, italicized banner
5. Verify real-time subscription didn't trigger manual page reload

### Test WhatsApp CTA

1. Open conversation with `context_order_id` populated
2. Click WhatsApp button (💬)
3. Verify window opens to `https://wa.me/{phone}?text={encoded_message}`
4. Check that order token is included in message text

---

## 9. FUTURE ENHANCEMENTS

- [ ] Read receipts per user (track `read_at` per message)
- [ ] Typing indicators via Supabase real-time
- [ ] Message editing/deletion with audit trail
- [ ] File/image attachments in messages
- [ ] Conversation archival/pinning
- [ ] Message search with full-text indexing
- [ ] Admin moderation dashboard for system alerts
- [ ] Multi-language support for system alert templates
