import { supabase } from "@/integrations/supabase/client";

// System bot ID (reserved UUID for all platform/system alerts)
const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Creates or gets a system message conversation for order receipts/notifications
 * For guests: uses guest_tracking_token
 * For users: uses participant_a as the order recipient
 * NOTE: RPC-side orchestration may have already created this - this is a fallback
 */
export const createOrGetSystemConversation = async (
  participantId: string,
  orderId: number,
  isGuest: boolean = false,
  guestToken?: string
) => {
  try {
    console.log("[systemMessaging] Looking up conversation", {
      orderId,
      isGuest,
      participantId: isGuest ? "GUEST" : participantId?.slice(0, 8) + "...",
      guestToken: guestToken ? guestToken.slice(0, 8) + "..." : undefined,
    });

    // FIRST: Try to find by order ID (RPC may have already created it)
    const { data: byOrder, error: orderQueryError } = await (supabase as any)
      .from("conversations")
      .select("*")
      .eq("context_order_id", orderId);

    if (!orderQueryError && byOrder && byOrder.length > 0) {
      console.log("[systemMessaging] Found existing conversation by order ID", {
        conversationId: byOrder[0].id,
        orderId,
      });
      return byOrder[0];
    }

    // SECOND: Try by participant + order (fallback)
    if (!isGuest && participantId) {
      const { data: byParticipant, error: partError } = await (supabase as any)
        .from("conversations")
        .select("*")
        .eq("participant_a", participantId)
        .eq("context_order_id", orderId)
        .maybeSingle();

      if (!partError && byParticipant) {
        console.log("[systemMessaging] Found existing conversation by participant", {
          conversationId: byParticipant.id,
          orderId,
        });
        return byParticipant;
      }
    }

    // THIRD: Try by guest token + order
    if (isGuest && guestToken) {
      const { data: byGuest, error: guestError } = await (supabase as any)
        .from("conversations")
        .select("*")
        .eq("guest_tracking_token", guestToken)
        .eq("context_order_id", orderId)
        .maybeSingle();

      if (!guestError && byGuest) {
        console.log("[systemMessaging] Found existing conversation by guest token", {
          conversationId: byGuest.id,
          orderId,
        });
        return byGuest;
      }
    }

    console.log("[systemMessaging] No existing conversation found, creating new one", {
      orderId,
      isGuest,
    });

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
      console.error("[systemMessaging] Create conversation error:", {
        code: (createError as any)?.code,
        message: (createError as any)?.message,
        details: (createError as any)?.details,
        orderId,
      });
      return null;
    }

    console.log("[systemMessaging] Conversation created successfully", {
      conversationId: newConv?.id,
      orderId,
    });

    return newConv;
  } catch (err) {
    console.error("[systemMessaging] Exception creating conversation:", {
      errorString: String(err),
      orderId,
    });
    return null;
  }
};

/**
 * Sends a system receipt message to a conversation
 * Uses reserved SYSTEM_BOT_ID for all platform alerts
 */
export const sendSystemReceipt = async (
  conversationId: string,
  content: string,
  messageType: string = "system_receipt"
) => {
  try {
    console.log("[systemMessaging] Sending message", {
      conversationId,
      senderBotId: SYSTEM_BOT_ID,
      messageType,
      contentLength: content.length,
      timestamp: new Date().toISOString(),
    });

    const { data, error } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: SYSTEM_BOT_ID,
        content,
        message_type: messageType,
      })
      .select()
      .single();

    if (error) {
      console.error("[systemMessaging] Send receipt error:", {
        error,
        code: (error as any)?.code,
        message: (error as any)?.message,
        details: (error as any)?.details,
        conversationId,
      });
      return null;
    }

    console.log("[systemMessaging] Message inserted successfully", {
      messageId: data?.id,
      conversationId,
    });

    // Update conversation's last_message
    const { error: updateError } = await (supabase as any)
      .from("conversations")
      .update({
        last_message: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (updateError) {
      console.warn("[systemMessaging] Failed to update conversation last_message:", updateError);
    }

    return data;
  } catch (err) {
    console.error("[systemMessaging] Exception sending receipt:", {
      error: err,
      conversationId,
      errorString: String(err),
    });
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
  console.log("[systemMessaging] Sending order confirmation receipt", {
    orderId,
    isGuest,
    recipientType: isGuest ? "guest" : "authenticated",
  });

  const conv = await createOrGetSystemConversation(
    participantId,
    orderId,
    isGuest,
    guestToken
  );

  if (!conv) {
    console.error("[systemMessaging] Failed to create/get conversation for receipt", {
      orderId,
      isGuest,
    });
    return null;
  }

  const receiptContent = `🐝 Hive System Receipt\n\n${receiptDetails}\n\n[Token: ${guestToken || orderId}]`;
  const result = await sendSystemReceipt(conv.id, receiptContent, "system_receipt");

  if (result) {
    console.log("[systemMessaging] Order confirmation receipt sent successfully", {
      orderId,
      messageId: result.id,
    });
  }

  return result;
};

/**
 * Sends a retailer order notification
 */
export const sendRetailerOrderNotification = async (
  vendorId: string,
  orderId: number,
  orderDetails: string
) => {
  console.log("[systemMessaging] Sending retailer notification", {
    orderId,
    vendorId,
  });

  const fetchQuery = (supabase as any)
    .from("conversations")
    .select("*")
    .eq("participant_a", vendorId)
    .eq("context_order_id", orderId)
    .maybeSingle();

  const { data: existing, error: fetchError } = await fetchQuery;

  let convId = existing?.id;

  if (!convId) {
    console.log("[systemMessaging] Creating conversation for vendor notification", {
      orderId,
      vendorId,
    });

    const { data: newConv, error: createError } = await (supabase as any)
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

    if (createError) {
      console.error("[systemMessaging] Failed to create vendor conversation", {
        orderId,
        vendorId,
        error: createError,
      });
      return null;
    }

    convId = newConv?.id;
  }

  if (!convId) {
    console.error("[systemMessaging] No conversation ID for vendor notification", {
      orderId,
      vendorId,
    });
    return null;
  }

  console.log("[systemMessaging] Sending notification to vendor conversation", {
    orderId,
    vendorId,
    conversationId: convId,
  });

  const notificationContent = `📦 Retailer Notification\n\n${orderDetails}`;
  const result = await sendSystemReceipt(convId, notificationContent, "retailer_notification");

  if (result) {
    console.log("[systemMessaging] Vendor notification sent successfully", {
      orderId,
      messageId: result.id,
    });
  }

  return result;
};

/**
 * Sends a delivery route claimed notification
 */
export const sendDeliveryClaimedNotification = async (
  riderId: string,
  orderId: number
) => {
  console.log("[systemMessaging] Sending delivery claimed notification", {
    orderId,
    riderId,
  });

  const fetchQuery = (supabase as any)
    .from("conversations")
    .select("*")
    .eq("participant_a", riderId)
    .eq("context_order_id", orderId)
    .maybeSingle();

  const { data: existing, error: fetchError } = await fetchQuery;

  let convId = existing?.id;

  if (!convId) {
    console.log("[systemMessaging] Creating conversation for delivery notification", {
      orderId,
      riderId,
    });

    const { data: newConv, error: createError } = await (supabase as any)
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

    if (createError) {
      console.error("[systemMessaging] Failed to create delivery conversation", {
        orderId,
        riderId,
        error: createError,
      });
      return null;
    }

    convId = newConv?.id;
  }

  if (!convId) {
    console.error("[systemMessaging] No conversation ID for delivery notification", {
      orderId,
      riderId,
    });
    return null;
  }

  console.log("[systemMessaging] Sending notification to delivery conversation", {
    orderId,
    riderId,
    conversationId: convId,
  });

  const content = `🚀 Delivery Route Claimed Successfully!\n\nOrder #${orderId} has been claimed for delivery.`;
  const result = await sendSystemReceipt(convId, content, "delivery_notification");

  if (result) {
    console.log("[systemMessaging] Delivery notification sent successfully", {
      orderId,
      messageId: result.id,
    });
  }

  return result;
};
