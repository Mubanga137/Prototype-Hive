# Messaging Invariants - Quick Reference

## The 7 Invariants (TL;DR)

| # | Rule | Enforcement | Owner |
|---|------|-------------|-------|
| 1 | One conversation per order | DB trigger + RPC atomic | Backend/DB |
| 2 | No conversation creation during message send | Frontend validation | Frontend |
| 3 | Messages MUST have conversation_id | DB constraint + validation | Frontend/DB |
| 4 | Only query by conversation_id | Frontend validation | Frontend |
| 5 | messages table = single source of truth | ✓ verified (no parallel systems) | N/A |
| 6 | order → conversation → message → fetch | FK constraints + RPC | Backend/DB |
| 7 | Log conversation_id at all key points | Logging in all functions | Both |

---

## When Building Features

### Creating Messages
```typescript
// ✅ DO: Always validate conversation_id first
if (!conversation?.id) {
  throw new Error("INVARIANT VIOLATION: Missing conversation_id");
}

// Insert with explicit conversation_id
const { error } = await supabase.from("messages").insert({
  conversation_id: conversation.id,  // REQUIRED
  sender_id: uid,
  content: text,
  message_type: "text",
});
```

### Fetching Messages
```typescript
// ✅ DO: Only query by conversation_id
const { data: messages } = await supabase
  .from("messages")
  .select("*")
  .eq("conversation_id", conversationId)  // ONLY this query
  .order("created_at", { ascending: true });

// ❌ DON'T: Never regenerate or derive conversation_id on client
const derivedId = btoa(orderId);  // BAD - don't do this
```

### Creating Orders
```typescript
// ✅ DO: The RPC handles this atomically
const { data, error } = await supabase.rpc("secure_place_order", {
  // ... params ...
});

// RPC automatically:
// 1. Creates order
// 2. Creates conversation  
// 3. Links them
// 4. Creates initial system message

const { order_id, conversation_id } = data?.[0];
console.log("INVARIANT #1: Created order & conversation", {
  order_id, conversation_id
});
```

---

## Common Scenarios

### "I need to send a message"
1. Get the conversation_id (from order or state)
2. Validate it's not empty: `if (!conv?.id) return;`
3. Insert with conversation_id required
4. Log: `console.log("[Messages] INVARIANT #3: Inserting with conversation_id")`

### "User wants to see their messages"
1. Get conversation_id (from URL or state)
2. Validate: `if (!convId) return;`
3. Query: `.eq("conversation_id", convId)`
4. Log: `console.log("[Messages] INVARIANT #4: Fetching with conversation_id")`

### "New feature: attach file to order"
1. ✓ Get conversation_id from order
2. ✓ Validate conversation_id exists
3. ✓ Insert message with conversation_id
4. ✓ Log the operation
5. That's it - don't create new conversations

---

## Debug Commands

### Check if order has conversation
```typescript
import { validateConversationPerOrder } from '@/lib/messaging-invariants';
await validateConversationPerOrder(123);
```

### Check if messages are linked to conversation
```typescript
import { validateMessageConversationIntegrity } from '@/lib/messaging-invariants';
await validateMessageConversationIntegrity('conv-uuid');
```

### Log a messaging event
```typescript
import { logMessagingFlowEvent } from '@/lib/messaging-invariants';
logMessagingFlowEvent('order_created', { orderId: 123, conversationId: 'xxx' });
```

---

## Red Flags 🚩

| Flag | Meaning | Action |
|------|---------|--------|
| `INVARIANT VIOLATION` in logs | Rule broken | FIX IMMEDIATELY |
| `conversation_id is missing` | message without conversation | FIX IMMEDIATELY |
| `Multiple conversations for one order` | Duplicate creation | Check trigger |
| `Message insert rejected: conversation_id does not exist` | Orphaned message | Database corruption |
| `No conversation found, creating fallback` | RPC didn't create it | Check RPC output |

---

## After Deployment Checks

Day 1:
```sql
-- No orphaned messages
SELECT COUNT(*) FROM messages WHERE conversation_id IS NULL;
-- Should be 0

-- No duplicate conversations
SELECT context_order_id, COUNT(*) FROM conversations 
WHERE context_order_id IS NOT NULL 
GROUP BY context_order_id HAVING COUNT(*) > 1;
-- Should be empty

-- All orders have conversations
SELECT COUNT(*) FROM orders WHERE conversation_id IS NULL;
-- Should be 0 (or low if RPC migration pending)
```

Server logs:
```
// Should see these patterns frequently:
[Checkout] INVARIANT #1 & #7: Order and conversation created
[Messages] INVARIANT #3: Inserting message with conversation_id
[useDualStateMessaging] INVARIANT #4: Fetching messages with conversation_id

// Should NEVER see:
INVARIANT VIOLATION
INVARIANT VIOLATION #1
INVARIANT VIOLATION #2
```

---

## Key Files Reference

| File | Purpose | When to Edit |
|------|---------|--------------|
| `src/lib/messaging-invariants.ts` | Validation utilities | Adding new invariant checks |
| `src/lib/systemMessaging.ts` | System message logic | Changing how system messages work |
| `src/pages/Messages.tsx` | User message UI | Changing message send flow |
| `src/pages/customer/Messages.tsx` | Guest message UI | Changing guest message flow |
| `src/hooks/useDualStateMessaging.ts` | Message fetch logic | Changing how messages load |
| `docs/migrations/2026-06-05_*.sql` | Database enforcement | Should not edit (append only) |

---

## The Test

Before shipping any messaging feature:
1. Does it require conversation_id? ✓
2. Is conversation_id validated? ✓
3. Is conversation_id logged? ✓
4. Do tests pass? ✓
5. Is flow order→conversation→message→fetch maintained? ✓

If any answer is "no", don't ship.

---

## Emergency Contacts

Invariant violations indicate serious issues:
- Check server logs (search "INVARIANT")
- Run `validateAllInvariants(orderId, conversationId)`
- Contact backend team if database trigger failed
- Check if RPC is returning conversation_id in response

---

## One-Liner Summaries

- **Invariant #1:** One conversation per order (enforced by DB)
- **Invariant #2:** Messages don't create conversations (validate before send)
- **Invariant #3:** Messages must have conversation_id (can't insert without it)
- **Invariant #4:** Frontend only fetches by conversation_id (no derivation)
- **Invariant #5:** One messaging table (verified, no parallel systems)
- **Invariant #6:** Strict order flow (FK constraints prevent shortcuts)
- **Invariant #7:** Log everything (check logs for proof it worked)

**Golden Rule:** If you're touching messaging code and not thinking about conversation_id, you're doing it wrong.
