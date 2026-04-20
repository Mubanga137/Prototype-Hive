# Order Notifications — setup checklist

This pipeline emails the SME owner and pushes an in-app toast the moment a
new row lands in `public.orders`.

## 1 · Run the SQL migration

Open Supabase → SQL Editor and run:

```
docs/migrations/2026-04-18_order_notifications.sql
```

This creates the `sme_notifications` table, RLS policies, and adds it to
the realtime publication.

## 2 · Deploy the edge function

In Supabase → Edge Functions → Create function, name it **`notify-new-order`**
and paste the contents of:

```
docs/edge-functions/notify-new-order/index.ts
```

In the function's settings:

- Set **Verify JWT** = OFF (the function authenticates the webhook by a shared
  header secret).
- Add these secrets:
  | Name                       | Value                                          |
  |----------------------------|------------------------------------------------|
  | `RESEND_API_KEY`           | Your Resend API key (https://resend.com)       |
  | `ORDER_WEBHOOK_SECRET`     | Any long random string                         |
  | `ORDER_EMAIL_FROM`         | e.g. `Hive Orders <orders@yourdomain.com>`     |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## 3 · Wire up the database webhook

Supabase → Database → Webhooks → **Create a new hook**:

- **Name**: `notify_new_order`
- **Table**: `public.orders`
- **Events**: ✅ Insert
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://<your-project-ref>.supabase.co/functions/v1/notify-new-order`
- **HTTP Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>
  x-webhook-secret: <same value as ORDER_WEBHOOK_SECRET above>
  ```

Save. The next order placed via the storefront should:

1. Insert the row in `orders`
2. Trigger the webhook
3. Email the SME owner and insert a row in `sme_notifications`
4. The retailer studio (subscribed via realtime) shows an in-app toast.

## 4 · In-app realtime listener (already wired in the app)

The studio components subscribe to `sme_notifications` and render a toast
on every insert — no extra setup required.
