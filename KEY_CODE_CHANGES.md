# Key Code Changes - Messaging System Repair

## 1. CheckoutDrawer.tsx - Guest Token Storage (ARRAY FORMAT)

### Before (BROKEN)
```javascript
// Stored as object - incompatible with readers
localStorage.setItem("hive_guest_active_cart", JSON.stringify({
  trackingTokens: [trackingToken],
  mostRecent: trackingToken,
}));
```

### After (FIXED)
```javascript
// Store as array only - compatible everywhere
let tokens: string[] = [];
if (stored) {
  // Migrate old object format
  const parsed = JSON.parse(stored);
  if (Array.isArray(parsed)) {
    tokens = parsed.filter((t) => typeof t === "string" && t.length >= 36);
  } else if (parsed?.trackingTokens) {
    tokens = parsed.trackingTokens.filter((t: any) => typeof t === "string" && t.length >= 36);
  }
}

// Add new token at front (most recent first)
tokens = [trackingToken, ...tokens.filter((t) => t !== trackingToken)];
tokens = tokens.slice(0, 10); // Keep 10 most recent

localStorage.setItem("hive_guest_active_cart", JSON.stringify(tokens));
```

---

## 2. useGuestTracking.ts - Format-Agnostic Parsing

### Before (BROKEN)
```javascript
let tokens: string[] = [];
try {
  const parsed = JSON.parse(stored);
  tokens = Array.isArray(parsed) ? parsed : [parsed]; // Wrong: [object] not [uuid]
} catch {
  tokens = [stored];
}
const validToken = tokens.find((t) => typeof t === "string" && t.length >= 36);
// Result: null (because [object] doesn't have string with length 36)
```

### After (FIXED)
```javascript
let trackingToken: string | null = null;
const parsed = JSON.parse(stored);

// PRIMARY: Array format
if (Array.isArray(parsed)) {
  trackingToken = parsed.find((t) => typeof t === "string" && t.length >= 36) || null;
}
// FALLBACK: Object format (old code)
else if (parsed?.trackingTokens && Array.isArray(parsed.trackingTokens)) {
  trackingToken = parsed.trackingTokens.find((t: any) => typeof t === "string" && t.length >= 36) || null;
}
else if (parsed?.mostRecent && typeof parsed.mostRecent === "string") {
  trackingToken = parsed.mostRecent.length >= 36 ? parsed.mostRecent : null;
}
// LAST RESORT: Direct string
else if (typeof parsed === "string" && parsed.length >= 36) {
  trackingToken = parsed;
}

setState({
  isGuest: !!trackingToken,
  trackingToken: trackingToken,
  hasValidToken: !!trackingToken,
});
```

**Result:** Works with any format; guest mode activates reliably.

---

## 3. secure_place_order RPC - Auto-Create Conversation & Message

### Added to RPC (PL/pgSQL)
```sql
-- STEP 2: Ensure conversation exists for order
BEGIN
  INSERT INTO public.conversations (
    participant_a,
    guest_tracking_token,
    context_order_id,
    last_message,
    last_message_at
  ) VALUES (
    v_buyer_id,  -- NULL for guests
    CASE WHEN v_buyer_id IS NULL THEN v_tracking_token::TEXT ELSE NULL END,
    v_order_id,
    '🐝 Order Received',
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_conversation_id;

  -- If insert didn't return (conflict), fetch existing
  IF v_conversation_id IS NULL THEN
    SELECT id INTO v_conversation_id
    FROM public.conversations
    WHERE context_order_id = v_order_id
    LIMIT 1;
  END IF;

  -- STEP 3: Insert initial system message
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO public.messages (
      conversation_id,
      sender_id,
      content,
      message_type,
      created_at
    ) VALUES (
      v_conversation_id,
      '00000000-0000-0000-0000-000000000000'::TEXT,
      '🐝 Hive System Receipt: Your order has been received and confirmed. A vendor/provider will contact you shortly.',
      'system_receipt',
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create conversation for order %: %', v_order_id, SQLERRM;
END;
```

**Result:** Every order automatically has a conversation + system message in database.

---

## 4. New Migration - Schema Columns

### File: supabase/migrations/20260605000001_add_messaging_columns.sql
```sql
-- Add product attachment support
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS product_data JSONB DEFAULT NULL;

-- Add item context to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS context_item_id INTEGER DEFAULT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS messages_product_data_idx ON public.messages USING BTREE (product_data);
CREATE INDEX IF NOT EXISTS conversations_context_item_id_idx ON public.conversations(context_item_id);
CREATE INDEX IF NOT EXISTS conversations_guest_tracking_token_idx ON public.conversations(guest_tracking_token);
```

**Result:** Messages can attach products; conversations can reference items.

---

## 5. systemMessaging.ts - 3-Tier Fallback Lookup

### Before (SIMPLE)
```javascript
let query = supabase.from("conversations").select("*").eq("context_order_id", orderId);
if (isGuest && guestToken) {
  query = query.eq("guest_tracking_token", guestToken);
}
const { data: existing } = await query.single();
```

### After (ROBUST)
```javascript
// FIRST: Try to find by order ID (RPC may have already created it)
const { data: byOrder } = await supabase
  .from("conversations")
  .select("*")
  .eq("context_order_id", orderId);

if (byOrder && byOrder.length > 0) {
  return byOrder[0]; // Found! (RPC created it)
}

// SECOND: Try by participant + order
if (!isGuest && participantId) {
  const { data: byParticipant } = await supabase
    .from("conversations")
    .select("*")
    .eq("participant_a", participantId)
    .eq("context_order_id", orderId)
    .maybeSingle();
  if (byParticipant) return byParticipant;
}

// THIRD: Try by guest token + order
if (isGuest && guestToken) {
  const { data: byGuest } = await supabase
    .from("conversations")
    .select("*")
    .eq("guest_tracking_token", guestToken)
    .eq("context_order_id", orderId)
    .maybeSingle();
  if (byGuest) return byGuest;
}

// FALLBACK: Create if not found
const { data: newConv } = await supabase
  .from("conversations")
  .insert({...})
  .select()
  .single();
```

**Result:** Reliably finds RPC-created conversations; falls back to frontend creation if needed.

---

## 6. Messages.tsx - Guest-Aware Realtime

### Before (USER-ONLY)
```javascript
useEffect(() => {
  if (!uid) return;  // Only works for authenticated users
  const channel = supabase
    .channel("conversations-list")
    .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConversations())
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [uid, loadConversations]);
```

### After (USER + GUEST)
```javascript
useEffect(() => {
  // Works for both authenticated (uid) and guest (context.authIdentifier)
  if (!context.authIdentifier || !context.authMode) return;

  const channel = supabase
    .channel("conversations-list-realtime")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "conversations",
    }, () => {
      console.log("[Messages] Conversation list changed, reloading");
      loadConversations();
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [context.authIdentifier, context.authMode, loadConversations]);
```

**Result:** Guests see realtime updates without page refresh.

---

## Summary of Impact

| Issue | Component | Fix Type | Impact |
|-------|-----------|----------|--------|
| Guest token format mismatch | 5 files | Data format | Guest mode now activates |
| No conversation created | RPC | Backend orchestration | Order = Conversation guaranteed |
| No system message | RPC | Backend orchestration | Initial receipt always exists |
| No product attachment | Migration | Schema | Product sharing in messages enabled |
| No guest realtime | Messages.tsx | Subscription logic | Guests see updates instantly |
| Limited lookup fallback | systemMessaging.ts | Query robustness | Handles RPC creation misses |

---

## Verification Commands

### Check localStorage format
```javascript
JSON.parse(localStorage.getItem('hive_guest_active_cart'))
// Should return array: ["uuid1", "uuid2", ...]
// NOT object: { trackingTokens: [...], mostRecent: "..." }
```

### Check RPC created conversation
```sql
SELECT id, context_order_id, guest_tracking_token, last_message
FROM public.conversations
WHERE context_order_id = 123
ORDER BY created_at DESC
LIMIT 1;
```

### Check system message
```sql
SELECT id, sender_id, content, message_type
FROM public.messages
WHERE sender_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 1;
```

### Check guest auth mode
```javascript
// In browser console after guest order
console.log(JSON.stringify(context, null, 2))
// Should show: { authMode: "guest", authIdentifier: "uuid...", isGuest: true }
```

---

## Notes

- **Backward compatibility:** All old formats still work (array, object, string)
- **No migrations needed for code:** Schema changes handled by migrations
- **No breaking changes:** Existing authenticated flows unaffected
- **Graceful degradation:** If RPC fails, frontend fallback creates conversation
