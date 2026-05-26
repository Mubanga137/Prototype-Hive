# Database Schema Mismatch Fix - "column title does not exist" ❌→✅

## Root Cause Analysis

The error `column "title" does not exist` was caused by a **TypeScript type definition mismatch**, not an actual database schema issue.

### The Problem

1. **Edge Function**: `docs/edge-functions/notify-new-order/index.ts` (line 115-121)
   - Tries to insert into `sme_notifications` table with a `title` field
   - This is the correct operation and matches the SQL migration

2. **SQL Migration**: `docs/migrations/2026-04-18_order_notifications.sql` (line 14)
   - Defines the `sme_notifications` table **WITH** the `title` column
   - The migration SQL is correct

3. **TypeScript Types**: `src/integrations/supabase/types.ts`
   - ❌ **WAS MISSING**: The `sme_notifications` table definition
   - Without this type definition, TypeScript/Supabase client cannot properly serialize the insert operation
   - Runtime error: "column title does not exist" when trying to insert

## The Solution

### Step 1: Added Type Definition ✅

**File**: `src/integrations/supabase/types.ts`

Added the complete `sme_notifications` table type definition between `sme_stores` and `vendor_cloned_items`:

```typescript
sme_notifications: {
  Row: {
    body: string | null
    created_at: string
    id: number
    is_read: boolean
    metadata: Json | null
    order_id: number | null
    sme_id: number | null
    store_id: number | null
    title: string
  }
  Insert: {
    body?: string | null
    created_at?: string
    id?: number
    is_read?: boolean
    metadata?: Json | null
    order_id?: number | null
    sme_id?: number | null
    store_id?: number | null
    title: string  // Required on insert
  }
  Update: {
    body?: string | null
    created_at?: string
    id?: number
    is_read?: boolean
    metadata?: Json | null
    order_id?: number | null
    sme_id?: number | null
    store_id?: number | null
    title?: string
  }
  Relationships: []
}
```

### Step 2: Migration Prerequisites ✅

The SQL migration **must be run** in your Supabase database:

**File**: `docs/migrations/2026-04-18_order_notifications.sql`

Run this SQL in Supabase:
1. Open Supabase Console → Your Project → SQL Editor
2. Create a new query
3. Copy the entire contents of `docs/migrations/2026-04-18_order_notifications.sql`
4. Execute the query

This creates:
- ✅ `sme_notifications` table with `title`, `body`, `metadata` columns
- ✅ Proper indexes on `store_id`, `sme_id`, `created_at`
- ✅ Row-Level Security (RLS) policies
- ✅ Realtime publication for live updates

---

## Data Flow: Post-Purchase Notifications

```
1. Customer places order
   ↓
2. Order inserted into orders table
   ↓
3. Supabase Database Webhook triggers
   ↓
4. Edge Function: notify-new-order invoked
   ↓
5. Function inserts into sme_notifications with title + body
   ├─ title: "New order received" | "New booking received"
   ├─ body: "ZMW XXX from Customer Name"
   ├─ metadata: { ...full order details }
   ├─ store_id: (vendor's store id)
   └─ is_read: false
   ↓
6. Realtime subscription picks up new notification
   ↓
7. Retailer Studio displays in-app toast alert
```

---

## Files Modified

### ✅ Modified
- `src/integrations/supabase/types.ts` — Added `sme_notifications` table type definition

### ✅ No Changes Needed
- `docs/edge-functions/notify-new-order/index.ts` — Already correct
- `docs/migrations/2026-04-18_order_notifications.sql` — Already correct
- `src/hooks/useOrderNotifications.ts` — Already subscribes correctly

---

## Checklist: Post-Deployment

- [ ] Run the SQL migration in Supabase console (if not already done)
- [ ] Verify `sme_notifications` table exists in Supabase
- [ ] Test checkout flow (place an order as guest)
- [ ] Check Retailer Studio for in-app notification toast
- [ ] Verify edge function logs show successful notification insert
- [ ] Confirm no "column title does not exist" error in logs

---

## Why This Error Occurred

1. **Schema Evolution**: The database was updated with the new `sme_notifications` table
2. **Type Sync Lag**: The TypeScript type definitions weren't updated to match
3. **Runtime Mismatch**: When code tried to insert into an untyped table, Supabase client couldn't properly build the query
4. **User Impact**: Checkout flow would fail with cryptic "column does not exist" error

This is a common pattern in API-based databases where the schema and type definitions must stay in sync.

---

## Related Code References

- **Edge Function** notifying on order: `docs/edge-functions/notify-new-order/index.ts:115-121`
- **Notification Realtime Hook**: `src/hooks/useOrderNotifications.ts:35-37`
- **Notification Display**: (in Retailer Studio, consumes Realtime updates)

