# Quick Start: Real-Time Message Notifications

## 30-Second Overview

✅ **Done**: Global real-time listener is active  
✅ **Done**: Toast notifications configured for all user roles  
✅ **Done**: System messaging utilities ready to use  
✅ **Done**: Messages persist in conversation feed  

## What It Does

- **Customers see**: 🐝 Order confirmation toasts when payments process
- **Vendors see**: 📦 New order notification toasts with audio chime
- **Riders see**: 🚀 Delivery route claimed toasts
- **All users**: Messages saved in `/customer-dash?section=Messages` feed

## How It Works

```
Your Backend Creates Message → Database Insert
              ↓
Supabase Real-Time Detects
              ↓
Frontend Toast Pops Up
              ↓
User Navigates to Messages
              ↓
Messages Pre-Loaded (no blank state)
```

## For Customers

**When order is paid:**
```typescript
import { sendOrderConfirmationReceipt } from "@/lib/systemMessaging";

await sendOrderConfirmationReceipt(
  customerId,
  orderId,
  `Order #${orderId}\nTotal: K99.99\nEstimated Delivery: 2-3 hours`,
  false // not a guest
);
// User sees: 🐝 Order Confirmed! Check your receipt inbox details.
```

**For guest customers:**
```typescript
const guestToken = localStorage.getItem("hive_guest_active_cart");
await sendOrderConfirmationReceipt(
  "guest-placeholder",
  orderId,
  `Order #${orderId}\nTotal: K99.99\n[Token: ${guestToken}]`,
  true, // is a guest
  guestToken
);
```

## For Vendors

**When order is assigned:**
```typescript
import { sendRetailerOrderNotification } from "@/lib/systemMessaging";

await sendRetailerOrderNotification(
  vendorId,
  orderId,
  `New order from John Doe\nItems: 2x Bread, 1x Milk\nTotal: K250`
);
// User sees: 📦 New Hive Order Booked! Prepare item for fulfillment.
// Audio chime plays automatically
```

## For Riders

**When delivery is claimed:**
```typescript
import { sendDeliveryClaimedNotification } from "@/lib/systemMessaging";

await sendDeliveryClaimedNotification(riderId, orderId);
// User sees: 🚀 Delivery Route Claimed Successfully!
```

## Testing It

1. **Go to Messages Page:**
   ```
   Navigate to /customer-dash?section=Messages
   ```

2. **Open Debug Panel:**
   ```
   Click "🐛 Messaging Debug" in bottom-left corner
   ```

3. **Create Test Data:**
   ```
   Click "Create Test Data" button
   Wait for success messages
   ```

4. **Test Real-Time:**
   ```
   In database: INSERT message with "🐝", "📦", or "🚀" prefix
   Toast should pop up instantly
   ```

## Message Prefixes (Important!)

Your database triggers MUST use these exact prefixes:

| User Type | Prefix | Toast Message |
|-----------|--------|---------------|
| Customer | `🐝 Hive System Receipt` | Order Confirmed! |
| Vendor | `📦 Retailer Notification` | New Hive Order Booked! |
| Rider | `🚀 Delivery Route Claimed` | Delivery Route Claimed! |

## Database Trigger Example

```sql
-- When order payment_status changes to 'paid'
CREATE TRIGGER on_order_paid
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.payment_status = 'paid')
EXECUTE FUNCTION insert_customer_receipt();

CREATE FUNCTION insert_customer_receipt()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO messages (
    conversation_id,
    sender_id,
    content,
    message_type
  ) VALUES (
    (SELECT id FROM conversations WHERE context_order_id = NEW.id LIMIT 1),
    'system',
    '🐝 Hive System Receipt\nOrder #' || NEW.id || '\nStatus: Confirmed',
    'system_receipt'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Files Created

| File | Purpose |
|------|---------|
| `src/hooks/useGlobalMessageListener.ts` | Global listener hook |
| `src/lib/systemMessaging.ts` | Utility functions |
| `src/lib/exampleSystemMessages.ts` | Implementation examples |
| `src/App.tsx` | Hook integration |

## Verify It Works

✅ Go to `/customer-dash?section=Messages`  
✅ Open browser console (F12)  
✅ Should see: `[useGlobalMessageListener] Global message listener active`  
✅ Click "🐛 Messaging Debug"  
✅ Click "Verify Tables" → should show ✅ success  

## If Something Breaks

1. **Check browser console** for error messages
2. **Check Supabase status** - is real-time enabled?
3. **Check RLS policies** - can system user insert messages?
4. **Check message format** - does it start with the right emoji?
5. **Check user role** - profile.role must be correct

## Common Issues

| Problem | Solution |
|---------|----------|
| Toast doesn't appear | Check message prefix matches exactly |
| Messages not loading | Check participant_a matches current user |
| Audio doesn't play | Browser may need user interaction first |
| Real-time not connecting | Check Supabase connectivity |
| Duplicate toasts | Already handled - shouldn't happen |

## Next: Production Deployment

1. ✅ Frontend code is ready
2. ⏳ Set up database triggers on your backend
3. ⏳ Test real-time message flow
4. ⏳ Monitor console logs
5. ⏳ Deploy to production

## Documentation

- **Full Guide**: `INTEGRATION_GUIDE.md`
- **Testing Guide**: `TESTING_REALTIME_MESSAGES.md`
- **Complete Summary**: `REALTIME_MESSAGES_IMPLEMENTATION_SUMMARY.md`
- **Examples**: `src/lib/exampleSystemMessages.ts`

## That's It!

Your system is ready for real-time notifications. Just set up the database triggers on your backend and you're done.

Questions? Check the console logs — they'll tell you exactly what's happening at each step.

---

**Status: ✅ READY FOR DEPLOYMENT**

Frontend implementation complete. Awaiting backend trigger setup.
