# 📋 DEPLOYMENT CHECKLIST

## PRE-DEPLOYMENT (Before Pushing to Main)

### Code Quality
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] No `console.error` outside of error handlers
- [ ] No hardcoded API keys or tokens
- [ ] All imports resolve correctly

### Functional Tests
- [ ] Place test order as guest
  - [ ] Order appears in database
  - [ ] Diagnostic panel shows success logs
  - [ ] Green checkmark displays
  - [ ] `successCount: 2, failureCount: 0`
  
- [ ] Place test order as authenticated user
  - [ ] Order appears in database
  - [ ] Vendor notifications sent
  - [ ] User redirects to `/track-orders`

- [ ] Check cart checkout (multi-item)
  - [ ] Multiple orders created
  - [ ] All receive notifications
  - [ ] User redirects to `/track-orders`

- [ ] Check service booking (if applicable)
  - [ ] Order created with `item_type = "service"`
  - [ ] Notification sent
  - [ ] User redirects to `/messages`

### Dependency Verification
- [ ] `@supabase/supabase-js` installed (check package.json)
- [ ] `sonner` for toast notifications (check package.json)
- [ ] `lucide-react` for icons (check package.json)
- [ ] `framer-motion` for animations (check package.json)

### Environment Variables
- [ ] `VITE_SUPABASE_URL` is set and valid
- [ ] `VITE_SUPABASE_ANON_KEY` is set and valid
- [ ] (Optional) `VITE_ORDER_WEBHOOK_URL` for Make.com integration

### Database
- [ ] Migration `supabase/migrations/setup_messaging.sql` has been executed
- [ ] Tables exist: `conversations`, `messages`, `orders`
- [ ] RLS is disabled on `conversations` and `messages` (or proper policies set)
- [ ] Realtime is enabled for both tables:
  ```sql
  SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  -- Should show: conversations, messages
  ```

### Documentation
- [ ] `SYSTEM_REPAIR_SUMMARY.md` reviewed
- [ ] `MESSAGING_PIPELINE_VERIFICATION.md` reviewed
- [ ] `QUICK_START_REPAIR_VERIFICATION.md` reviewed
- [ ] Team briefed on diagnostic panel location

---

## DEPLOYMENT

### Step 1: Backup
- [ ] Backup current production code
- [ ] Backup database (optional but recommended)

### Step 2: Deploy Code
- [ ] Merge to main branch
- [ ] Deploy to staging environment
- [ ] Deploy to production

### Step 3: Verify Deployment
- [ ] All 6 files are present in production
  - [ ] `src/components/CheckoutDrawer.tsx`
  - [ ] `src/components/CartDrawer.tsx`
  - [ ] `src/lib/systemMessaging.ts`
  - [ ] `src/components/messaging/MessagingDiagnosticPanel.tsx`
  - [ ] `src/lib/systemStatusCheck.ts`
  - [ ] `src/App.tsx`

- [ ] Green diagnostic panel button appears (bottom-right)
- [ ] No TypeScript compilation errors
- [ ] Console shows no critical errors on page load

---

## POST-DEPLOYMENT (After Going Live)

### Immediate (First Hour)
- [ ] Monitor system with diagnostic panel open
- [ ] Place 5 test orders (mix of guest and authenticated)
- [ ] Verify all show `successCount: 2, failureCount: 0`
- [ ] Check database: orders table has entries
- [ ] Check database: conversations table has entries
- [ ] Check database: messages table has entries

### Short Term (First 24 Hours)
- [ ] Monitor error logs in diagnostic panel
- [ ] Watch for any red error badges
- [ ] Run `printSystemStatus()` every 2 hours
- [ ] Verify all tables show increasing row counts
- [ ] No Supabase connection errors

### Ongoing Monitoring
- [ ] Keep diagnostic panel accessible to support team
- [ ] Monitor for error spikes
- [ ] Run weekly `printSystemStatus()` verification
- [ ] Archive diagnostic logs if issues occur

---

## ROLLBACK PLAN

### If Critical Issues (Orders Not Creating)
```bash
# Revert to previous version
git revert HEAD~0
git push

# Or deploy previous commit
git checkout HEAD~1
npm run build
# Redeploy
```

### If Notifications Not Sent But Orders Created
```
1. Check Supabase logs for query errors
2. Run printSystemStatus() to verify connection
3. Check if conversations/messages tables exist
4. Review error logs in diagnostic panel
5. Do NOT rollback — issue is likely configuration
```

### If Only Some Orders Affected
```
1. Identify pattern (guest vs authenticated, certain products, etc.)
2. Run diagnostic on those specific orders
3. Check logs for that order_id
4. May be isolated issue, not system-wide
```

---

## VERIFICATION QUERIES

Run these in Supabase SQL Editor to verify system health:

### Check Recent Orders
```sql
SELECT id, customer_name, status, created_at 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
-- Should show recent test orders
```

### Check Recent Conversations
```sql
SELECT id, context_order_id, participant_a, guest_tracking_token, created_at
FROM conversations
ORDER BY created_at DESC
LIMIT 10;
-- Should show conversations linked to recent orders
```

### Check Recent System Messages
```sql
SELECT id, conversation_id, sender_id, message_type, created_at
FROM messages
WHERE sender_id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC
LIMIT 10;
-- Should show system messages from recent orders
```

### Check Message Count by Type
```sql
SELECT message_type, COUNT(*) as count
FROM messages
WHERE sender_id = '00000000-0000-0000-0000-000000000000'
GROUP BY message_type;
-- Should show breakdown of system_receipt vs retailer_notification
```

### Check Realtime Status
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
-- Should include: conversations, messages
```

---

## MONITORING DASHBOARD

### Daily Checks (5 minutes)

```javascript
// Open browser console and run:
printSystemStatus()

// Look for:
// ✅ Supabase Connection: healthy
// ✅ Conversations: EXISTS (with increasing count)
// ✅ Messages: EXISTS (with increasing count)
// ✅ Orders: EXISTS (with increasing count)
// ✅ Realtime: ENABLED for both tables
```

### Weekly Report

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Total Orders Last 7 Days | Growing | ? | |
| Total Conversations | Growing | ? | |
| Total System Messages | Growing | ? | |
| Error Rate | < 5% | ? | |
| Avg Response Time | < 2s | ? | |

---

## SUPPORT ESCALATION

### Level 1 (Automated Checks)
- [ ] Run `printSystemStatus()`
- [ ] Open diagnostic panel
- [ ] Filter by "Errors & Issues"
- [ ] Note error code and stack trace

### Level 2 (Manual Investigation)
- [ ] Run verification queries (see above)
- [ ] Check Supabase audit logs
- [ ] Review browser DevTools Network tab
- [ ] Check system resource usage

### Level 3 (Rollback)
- [ ] Notify stakeholders
- [ ] Revert to previous version
- [ ] Investigate root cause post-incident

---

## SIGN-OFF

- [ ] Development Lead: _____________ Date: _______
- [ ] QA Lead: _____________ Date: _______
- [ ] Operations Lead: _____________ Date: _______
- [ ] Product Owner: _____________ Date: _______

---

## Deployment completed on: ________________
## Verified by: ________________
## Issues encountered: ________________
## Notes: ________________________________________________________________
