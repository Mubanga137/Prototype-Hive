# Messaging System Invariants Implementation

## Overview
This document describes the enforcement of 7 core invariants for the messaging system to eliminate inconsistent use of `conversation_id` throughout the application.

## Implemented Invariants

### 1. Single Conversation Per Order
**Rule:** When an order is created, create exactly ONE conversation. Persist this `conversation_id` on the order record.

**Implementation:**
- Added `orders.conversation_id` column (UUID, nullable initially)
- Created database trigger `prevent_duplicate_order_conversation()` that blocks creation of multiple conversations for same order
- Added UNIQUE constraint on `conversations.context_order_id` (DEFERRABLE INITIALLY DEFERRED)
- Backfill migration maps existing conversations to orders via `context_order_id`

**Files Modified:**
- `docs/migrations/2026-06-05_enforce_messaging_invariants.sql` - Database migration
- `src/integrations/supabase/types.ts` - Updated orders schema to include `conversation_id`

### 2. No New Conversations During Messaging
**Rule:** Do NOT create a new conversation when sending messages. All messages must reuse the existing `conversation_id` tied to the order.

**Implementation:**
- Updated `createOrGetSystemConversation()` in `src/lib/systemMessaging.ts` to:
  - ONLY look up existing conversations by order_id
  - Throw error if multiple conversations found (INVARIANT #1 violation)
  - Log warnings if creating fallback conversation (indicates RPC didn't create at order time)
- Frontend message send handlers validate `conversation_id` exists before insert
- Never call conversation creation from message send endpoints

**Files Modified:**
- `src/lib/systemMessaging.ts` - Added strict lookup logic with error handling
- `src/pages/Messages.tsx` - Updated `handleSend()` and `handleAttachProduct()`
- `src/pages/customer/Messages.tsx` - Updated `handleSendMessage()`

### 3. Message Insertion Contract
**Rule:** Every message insert must include:
- `conversation_id` (required, existing)
- `message_text`
- `sender_role`

Reject or fail loudly if `conversation_id` is missing or invalid.

**Implementation:**
- Added database trigger `log_message_insert()` that:
  - Verifies conversation exists before insert (fails loudly if not)
  - Logs the message insert to server logs
- Frontend validation in message send handlers:
  - Checks `conversation_id` is not null/empty before insert
  - Displays toast error if validation fails
  - Wraps insert in try/catch to catch database constraint violations
- Added NOT NULL constraint to `messages.conversation_id`

**Files Modified:**
- `docs/migrations/2026-06-05_enforce_messaging_invariants.sql` - Database trigger
- `src/pages/Messages.tsx` - handleSend() validation
- `src/pages/customer/Messages.tsx` - handleSendMessage() validation
- `src/lib/systemMessaging.ts` - sendSystemReceipt() validation

### 4. Frontend Query Contract
**Rule:** The frontend must fetch messages using ONLY:
```sql
WHERE conversation_id = <stored_conversation_id>
```
Do not derive or regenerate conversation IDs on the client.

**Implementation:**
- Updated `loadMessages()` hook in `src/hooks/useDualStateMessaging.ts`:
  - Validates `conversation_id` parameter is not empty
  - Logs fetch with conversation_id
  - Queries ONLY by `conversation_id` (no regeneration)
- All message fetches must pass explicit `conversation_id`
- Frontend never generates/derives new conversation IDs

**Files Modified:**
- `src/hooks/useDualStateMessaging.ts` - Added validation to `loadMessages()`

### 5. Remove Parallel Systems
**Rule:** Stop using alternative messaging sources (chatrooms, chat_messages, sme_notifications for chat). Messages table is the single source of truth.

**Status:**
- ✓ `chatrooms` - Not found in codebase (already removed)
- ✓ `chat_messages` - Not found in codebase (already removed)
- ✓ `sme_notifications` - Exists but is correctly used for order notifications (toasts), NOT for messaging

**Verification Tool:**
- `src/lib/messaging-invariants.ts` includes `checkForParallelMessagingSystems()` function

### 6. Strict Flow Enforcement
**Rule:** System must follow exact sequence:
```
order → conversation → message → UI fetch
```

**Implementation:**
- Database migrations enforce foreign key constraints
- Backend RPC (`secure_place_order`) creates conversation atomically with order
- Message inserts validate conversation exists
- Frontend fetch uses stored conversation_id
- Flow logging at each stage (see Invariant #7)

**Verification:**
- Use `logMessagingFlowEvent()` and `validateAllInvariants()` functions

### 7. Debug Logging (Temporary)
**Rule:** Log conversation_id at:
- Conversation creation
- Message insertion
- Frontend fetch
These logs must always match.

**Implementation:**
- Added debug logging to:
  - `src/lib/systemMessaging.ts` - Every conversation lookup and creation
  - `src/pages/Messages.tsx` - Message send with conversation_id
  - `src/pages/customer/Messages.tsx` - Message send with conversation_id
  - `src/hooks/useDualStateMessaging.ts` - Message fetch with conversation_id
  - Database triggers log to PostgreSQL logs

**Log Format:**
```
[module] INVARIANT #N: <operation>
{
  conversationId: <uuid>,
  orderId: <number>,
  <additional context>
  timestamp: ISO8601
}
```

## New Files Added

### `src/lib/messaging-invariants.ts`
Validation and monitoring utilities:
- `validateConversationPerOrder()` - Check INVARIANT #1
- `validateMessageConversationIntegrity()` - Check INVARIANT #3
- `checkForParallelMessagingSystems()` - Check INVARIANT #5
- `validateAllInvariants()` - Comprehensive system check
- `logMessagingFlowEvent()` - Flow logging

### `docs/migrations/2026-06-05_enforce_messaging_invariants.sql`
Database migration that:
- Adds `orders.conversation_id` column
- Creates triggers for validation
- Backfills existing data
- Adds unique constraints

### `docs/MESSAGING_INVARIANTS_IMPLEMENTATION.md`
This documentation file.

## Testing & Validation

### Run Comprehensive Check
```typescript
import { validateAllInvariants } from '@/lib/messaging-invariants';

const result = await validateAllInvariants(orderId, conversationId);
console.log(result.summaryReport);
```

### Log Messaging Flow Events
```typescript
import { logMessagingFlowEvent } from '@/lib/messaging-invariants';

logMessagingFlowEvent('order_created', { orderId: 123 });
logMessagingFlowEvent('conversation_created', { orderId: 123, conversationId: 'xxx' });
logMessagingFlowEvent('message_inserted', { conversationId: 'xxx', messageId: 'yyy' });
logMessagingFlowEvent('message_fetched', { conversationId: 'xxx' });
logMessagingFlowEvent('flow_complete', { orderId: 123, conversationId: 'xxx' });
```

## Deployment Checklist

- [ ] Run migration `2026-06-05_enforce_messaging_invariants.sql`
- [ ] Deploy updated frontend code (Messages.tsx, customer/Messages.tsx, useDualStateMessaging.ts)
- [ ] Monitor logs for INVARIANT VIOLATION messages (should be none)
- [ ] Run `validateAllInvariants()` on sample orders
- [ ] Verify message sends include conversation_id in logs
- [ ] Check database for orphaned messages (should be 0):
  ```sql
  SELECT COUNT(*) FROM messages WHERE conversation_id IS NULL;
  SELECT COUNT(*) FROM conversations WHERE context_order_id IS NOT NULL AND id NOT IN (SELECT conversation_id FROM messages);
  ```

## Rollback Plan

If issues arise:
1. All changes are additive/validating (no data deletions)
2. Revert frontend code to previous commit
3. Disable triggers if needed: `DROP TRIGGER trg_prevent_duplicate_order_conversation ON conversations;`
4. Conversations still linked to orders via `context_order_id` even if column migration reverted

## Future Work

1. **Persistent Conversation ID on Orders:** Once transition complete, add NOT NULL constraint to `orders.conversation_id` and remove `conversations.context_order_id`
2. **RLS Policies:** Implement row-level security for message fetches
3. **Analytics:** Send flow events to analytics service for monitoring
4. **Automatic Remediation:** Create job to detect and fix orphaned messages
