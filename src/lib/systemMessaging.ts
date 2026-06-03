import { supabase } from "@/integrations/supabase/client";

/**
 * Creates or gets a system message conversation for order receipts/notifications
 * For guests: uses guest_tracking_token
 * For users: uses participant_a as the order recipient
 */
export const createOrGetSystemConversation = async (
  participantId: string,
  orderId: number,
  isGuest: boolean = false,
  guestToken?: string
) => {
  try {
    let query = (supabase as any)
      .from("conversations")
      .select("*")
      .eq("context_order_id", orderId);

    if (isGuest && guestToken) {
      query = query.eq("guest_tracking_token", guestToken);
    } else {
      query = query.eq("participant_a", participantId);
    }

    const { data: existing, error: fetchError } = await query.single().catch(() => ({
      data: null,
      error: null,
    }));

    if (existing) {
      return existing;
    }

    // Create new conversation
    const { data: newConv, error: createError } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_a: isGuest ? null : participantId,
        participant_b: null,
        guest_tracking_token: isGuest ? guestToken : null,
        context_order_id: orderId,
        last_message: "System Receipt",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("[systemMessaging] Create conversation error:", createError);
      return null;
    }

    return newConv;
  } catch (err) {
    console.error("[systemMessaging] Exception:", err);
    return null;
  }
};

/**
 * Sends a system receipt message to a conversation
 */
export const sendSystemReceipt = async (
  conversationId: string,
  content: string,
  messageType: string = "system_receipt"
) => {
  try {
    const { data, error } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: "system",
        content,
        message_type: messageType,
      })
      .select()
      .single();

    if (error) {
      console.error("[systemMessaging] Send receipt error:", error);
      return null;
    }

    // Update conversation's last_message
    await (supabase as any)
      .from("conversations")
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return data;
  } catch (err) {
    console.error("[systemMessaging] Exception sending receipt:", err);
    return null;
  }
};

/**
 * Sends an order confirmation receipt (for customers/guests)
 */
export const sendOrderConfirmationReceipt = async (
  participantId: string,
  orderId: number,
  receiptDetails: string,
  isGuest: boolean = false,
  guestToken?: string
) => {
  const conv = await createOrGetSystemConversation(
    participantId,
    orderId,
    isGuest,
    guestToken
  );

  if (!conv) return null;

  const receiptContent = `🐝 Hive System Receipt\n\n${receiptDetails}\n\n[Token: ${guestToken || orderId}]`;
  return sendSystemReceipt(conv.id, receiptContent, "system_receipt");
};

/**
 * Sends a retailer order notification
 */
export const sendRetailerOrderNotification = async (
  vendorId: string,
  orderId: number,
  orderDetails: string
) => {
  const { data: existing } = await (supabase as any)
    .from("conversations")
    .select("*")
    .eq("participant_a", vendorId)
    .eq("context_order_id", orderId)
    .single()
    .catch(() => ({ data: null }));

  let convId = existing?.id;

  if (!convId) {
    const { data: newConv } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_a: vendorId,
        participant_b: null,
        context_order_id: orderId,
        last_message: "System Order Notification",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    convId = newConv?.id;
  }

  if (!convId) return null;

  const notificationContent = `📦 Retailer Notification\n\n${orderDetails}`;
  return sendSystemReceipt(convId, notificationContent, "retailer_notification");
};

/**
 * Sends a delivery route claimed notification
 */
export const sendDeliveryClaimedNotification = async (
  riderId: string,
  orderId: number
) => {
  const { data: existing } = await (supabase as any)
    .from("conversations")
    .select("*")
    .eq("participant_a", riderId)
    .eq("context_order_id", orderId)
    .single()
    .catch(() => ({ data: null }));

  let convId = existing?.id;

  if (!convId) {
    const { data: newConv } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_a: riderId,
        participant_b: null,
        context_order_id: orderId,
        last_message: "Delivery Claimed",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    convId = newConv?.id;
  }

  if (!convId) return null;

  const content = `🚀 Delivery Route Claimed Successfully!\n\nOrder #${orderId} has been claimed for delivery.`;
  return sendSystemReceipt(convId, content, "delivery_notification");
};
