// =============================================================================
// Edge Function: notify-new-order
// =============================================================================
// Fires on every new row in `public.orders` (via a Supabase database webhook)
// and:
//   1. Sends a branded email to the SME owner via Resend.
//   2. Inserts a row into `public.sme_notifications` so the retailer studio
//      can pick it up over Realtime and render an in-app toast.
//
// DEPLOYMENT
// ----------
// 1. In your Supabase project, create a new Edge Function named
//    `notify-new-order` and paste the contents of this file into index.ts.
// 2. Add the secret RESEND_API_KEY to the function's environment.
// 3. Run the SQL in docs/migrations/2026-04-18_order_notifications.sql to
//    create the `sme_notifications` table + the `notify_new_order` webhook.
// 4. In Supabase → Database → Webhooks, create a webhook:
//      • Name:   notify_new_order
//      • Table:  public.orders
//      • Events: INSERT
//      • Type:   HTTP Request
//      • Method: POST
//      • URL:    https://<your-project-ref>.supabase.co/functions/v1/notify-new-order
//      • HTTP Headers:
//          Content-Type: application/json
//          Authorization: Bearer <YOUR_SUPABASE_SERVICE_ROLE_KEY>
//          x-webhook-secret: <a long random string you also store as the
//                             ORDER_WEBHOOK_SECRET function secret>
// 5. Set verify_jwt = false on this function so the webhook can call it
//    (it's authenticated by the shared header secret instead).
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface OrderRow {
  id: number | string;
  store_id?: number | null;
  sme_id?: number | null;
  offer_id?: number | null;
  item_type?: string | null;
  quantity?: number | null;
  total_amount?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  scheduled_date?: string | null;
  service_notes?: string | null;
  otp_code?: string | null;
  status?: string | null;
  created_at?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Shared-secret guard so randoms can't post fake orders here
  const expected = Deno.env.get("ORDER_WEBHOOK_SECRET");
  const got = req.headers.get("x-webhook-secret");
  if (expected && got !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Supabase webhook payload shape: { type, table, record, schema, old_record }
  const order: OrderRow | undefined = body?.record;
  if (!order || body?.type !== "INSERT") {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) Look up the store + owner email
  let storeName = "Your store";
  let ownerEmail: string | null = null;
  if (order.store_id) {
    const { data: store } = await supabase
      .from("sme_stores")
      .select("brand_name, owner_user_id")
      .eq("id", order.store_id)
      .maybeSingle();
    if (store) {
      storeName = (store as any).brand_name ?? storeName;
      const ownerId = (store as any).owner_user_id;
      if (ownerId) {
        const { data: userResp } = await supabase.auth.admin.getUserById(ownerId);
        ownerEmail = userResp?.user?.email ?? null;
      }
    }
  }

  // 2) Insert the in-app notification (Realtime will deliver it to the studio)
  await supabase.from("sme_notifications").insert({
    sme_id: order.sme_id ?? null,
    store_id: order.store_id ?? null,
    order_id: order.id,
    title: order.item_type === "service" ? "New booking received" : "New order received",
    body: `ZMW ${Number(order.total_amount ?? 0).toFixed(2)} from ${order.customer_name ?? "a customer"}`,
    metadata: order as any,
  });

  // 3) Send the email
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (RESEND_API_KEY && ownerEmail) {
    const isService = order.item_type === "service";
    const detailsLine = isService
      ? `Date: ${order.scheduled_date ?? "—"}${order.service_notes ? `<br/>Notes: ${order.service_notes}` : ""}`
      : `Address: ${order.delivery_address ?? "—"}`;

    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#FFFBF2;padding:24px;color:#1f1810">
        <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e9dfc5;border-radius:16px;overflow:hidden">
          <div style="background:#B37C1C;color:#fff;padding:18px 22px">
            <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.85">🐝 The Hive</div>
            <div style="font-size:20px;font-weight:700;margin-top:2px">${isService ? "New Booking" : "New Order"}</div>
          </div>
          <div style="padding:22px">
            <p style="margin:0 0 12px">Hi ${storeName},</p>
            <p style="margin:0 0 16px">You just received a new ${isService ? "booking" : "order"} on The Hive.</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 0;color:#7a6f55">Order ID</td><td style="padding:6px 0;text-align:right"><b>#${order.id}</b></td></tr>
              <tr><td style="padding:6px 0;color:#7a6f55">Total</td><td style="padding:6px 0;text-align:right"><b style="color:#B37C1C">ZMW ${Number(order.total_amount ?? 0).toFixed(2)}</b></td></tr>
              <tr><td style="padding:6px 0;color:#7a6f55">Quantity</td><td style="padding:6px 0;text-align:right">${order.quantity ?? 1}</td></tr>
              <tr><td style="padding:6px 0;color:#7a6f55">Customer</td><td style="padding:6px 0;text-align:right">${order.customer_name ?? "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#7a6f55">Phone</td><td style="padding:6px 0;text-align:right">${order.customer_phone ?? "—"}</td></tr>
              <tr><td style="padding:6px 0;color:#7a6f55">Drop-off code</td><td style="padding:6px 0;text-align:right"><b>${order.otp_code ?? "—"}</b></td></tr>
            </table>
            <div style="margin-top:12px;padding:12px;background:#FFFBF2;border-radius:10px;font-size:13px">${detailsLine}</div>
            <p style="margin:18px 0 0;font-size:12px;color:#7a6f55">Open The Hive Retailer Studio → Orders to fulfil this request.</p>
          </div>
        </div>
      </div>`;

    const fromAddress = Deno.env.get("ORDER_EMAIL_FROM") ?? "Hive Orders <orders@thehive.app>";
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: ownerEmail,
          subject: `🐝 New ${isService ? "booking" : "order"} #${order.id} — ZMW ${Number(order.total_amount ?? 0).toFixed(2)}`,
          html,
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        console.error("[notify-new-order] resend failed", r.status, text);
      }
    } catch (e) {
      console.error("[notify-new-order] resend exception", e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
