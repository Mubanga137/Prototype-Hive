# Messaging System Setup Guide

## Overview
The frontend Messages UI is now refactored with:
- ✅ Real-time Supabase subscriptions wired in
- ✅ Unfiltered database queries to ensure all data is visible
- ✅ Debug panel for testing and verification
- ✅ Premium Ivory/Charcoal brand styling preserved
- ✅ Automatic message sync when triggered by backend

## Step 1: Create Database Tables

Run this SQL in your Supabase dashboard (**SQL Editor** → **New Query**):

**Copy the entire contents of:** `supabase/migrations/setup_messaging.sql`

This creates:
- `public.conversations` — stores conversation threads between two participants
- `public.messages` — stores individual messages
- Indexes for performance
- RLS (Row Level Security) policies
- Real-time publication setup

## Step 2: Verify Setup

Navigate to `/customer-dash?section=Messages` in your app.

You'll see a **🐛 Messaging Debug** panel in the bottom-left corner.

**Click these buttons to verify:**

1. **Verify Tables** — confirms both tables exist and are accessible
2. **Load Conversations** — fetches all conversations (will be empty initially)
3. **Load Messages** — fetches all messages (will be empty initially)
4. **Create Test Data** — creates a test conversation and sends sample messages
5. **Clear Logs** — clears the debug logs

## Step 3: Test with Automated Triggers

Once your Supabase database-level automated message triggers are running (checkout/payment/rider assignment):

1. Open the Messages page in one browser tab
2. **In another tab**, trigger an event (e.g., complete a checkout or assign a rider)
3. Watch the messages appear **instantly** in the Messages panel via real-time subscription
4. You should NOT need to refresh the page

## Architecture

### Messages Component (`src/pages/customer/Messages.tsx`)

**Unfiltered Query Flow:**
```javascript
// Load all conversations where user is a participant
const { data } = await supabase
  .from("conversations")
  .select("*")
  .or(`participant_a.eq.${uid},participant_b.eq.${uid}`)
  .order("last_message_at", { ascending: false });
```

**Real-Time Subscription:**
```javascript
supabase
  .channel(`messages_${uid}`)
  .on("postgres_changes", 
    { event: "INSERT", schema: "public", table: "messages" }, 
    (payload) => {
      if (activeConv && payload.new.conversation_id === activeConv.id) {
        setMessages(prev => [...prev, payload.new]);
      }
    }
  )
  .subscribe();
```

### Database Schema

**conversations**
- `id` (UUID) — primary key
- `participant_a` (UUID) — first user
- `participant_b` (UUID) — second user
- `last_message` (TEXT) — preview of last message
- `last_message_at` (TIMESTAMP) — for sorting
- `context_order_id` (INTEGER, optional) — link to orders table
- `created_at`, `updated_at` (TIMESTAMP)

**messages**
- `id` (UUID) — primary key
- `conversation_id` (UUID) — foreign key to conversations
- `sender_id` (UUID) — who sent it
- `content` (TEXT) — the message body
- `message_type` (TEXT) — "text", "system", etc.
- `created_at`, `updated_at` (TIMESTAMP)

### UI Binding

Messages display maps to database columns:

| UI Element | Database Field |
|----------|----------------|
| Sender alignment (left/right) | `sender_id === currentUser.id` |
| Message text | `messages.content` |
| Message timestamp | `messages.created_at` (formatted) |
| Conversation title | Participant's `user_profiles.full_name` |
| Conversation preview | `conversations.last_message` |
| Conversation time | `conversations.last_message_at` |

## Troubleshooting

### Messages Not Appearing?

1. **Check Debug Panel:**
   - Click "Load Messages" — are there any rows in the database?
   - Click "Create Test Data" — does this successfully create test messages?

2. **Check RLS Policies:**
   - Make sure the SQL migration was fully executed
   - Verify in Supabase → Authentication → RLS that policies exist for both tables

3. **Check Real-Time:**
   - Verify in Supabase → Database → Publications that `messages` and `conversations` are included in `supabase_realtime`

4. **Browser Console:**
   - Open DevTools → Console
   - "Load Conversations" button logs will show any database errors

### Table Permission Errors?

If you see "permission denied" errors:

1. In Supabase, go to **SQL Editor**
2. Run this to grant permissions:
   ```sql
   GRANT ALL ON public.conversations TO authenticated;
   GRANT ALL ON public.messages TO authenticated;
   ```

## Integration with Your Backend

Your automated message triggers should execute something like:

```sql
-- After successful checkout payment
INSERT INTO public.messages (
  conversation_id,
  sender_id,
  content,
  message_type
) VALUES (
  <conversation_uuid>,
  <system_user_uuid>,
  'Your order #12345 has been confirmed!',
  'system'
);
```

The frontend will receive this **instantly** via the real-time subscription and add it to the UI without requiring a page refresh.

## Disabling Debug Panel

To remove the debug panel from production, edit `src/pages/customer/Messages.tsx`:

Remove this line from the import:
```javascript
import MessagingDebugPanel from "@/components/messaging/MessagingDebugPanel";
```

And remove `<MessagingDebugPanel />` from the JSX return.

Or conditionally show it only in development:
```javascript
{process.env.NODE_ENV === "development" && <MessagingDebugPanel />}
```

## Next Steps

1. ✅ Run the SQL migration
2. ✅ Navigate to `/customer-dash?section=Messages`
3. ✅ Use debug panel to verify tables exist
4. ✅ Create test conversation with "Create Test Data"
5. ✅ Verify messages appear in real-time
6. ✅ Connect your automated backend triggers
