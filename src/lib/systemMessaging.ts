import { supabase } from "@/integrations/supabase/client";

// System bot ID (reserved UUID for all platform/system alerts)
const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Creates or gets a system message conversation for order receipts/notifications
 * INVARIANT #1: Single conversation per order
 * INVARIANT #2: No new conversations during messaging
 * For guests: uses guest_tracking_token
 * For users: uses participant_1 as the order recipient
 * NOTE: RPC-side orchestration should have already created this
 */
export const createOrGetSystemConversation = async (
  participantId: string,
  orderId: number,
  isGuest: boolean = false,
  guestToken?: string
) => {
  // Disabled: handled by database trigger handle_order_created()
  return;
  try {
    console.log("[systemMessaging] INVARIANT CHECK: Looking up conversation for order", {
      orderId,
      isGuest,
      participantId: isGuest ? "GUEST" : participantId?.slice(0, 8) + "...",
      guestToken: guestToken ? guestToken.slice(0, 8) + "..." : undefined,
    });

    // INVARIANT #1: Look up by order ID (single source of truth)
    const { data: byOrder, error: orderQueryError } = await (supabase as any)
      .from("conversations")
      .select("*")
      .eq("order_id", orderId);

    if (orderQueryError) {
      console.error("[systemMessaging] ERROR querying conversations by order_id:", {
        error: orderQueryError,
        orderId,
      });
      throw new Error(`Failed to look up conversation for order ${orderId}`);
    }

    if (byOrder && byOrder.length > 0) {
      if (byOrder.length > 1) {
        console.error("[systemMessaging] INVARIANT VIOLATION: Multiple conversations for one order!", {
          orderId,
          conversationCount: byOrder.length,
          conversationIds: byOrder.map(c => c.id),
        });
        throw new Error(`INVARIANT VIOLATION: Multiple conversations exist for order ${orderId}`);
      }

      const conv = byOrder[0];
      console.log("[systemMessaging] ✓ INVARIANT SATISFIED: Found conversation by order", {
        conversationId: conv.id,
        orderId,
      });
      return conv;
    }

    // Only create if this is a legitimate first call (not a messaging operation)
    // Messaging operations should NEVER create conversations (Invariant #2)
    console.warn("[systemMessaging] WARNING: No conversation found for order. Creating fallback.", {
      orderId,
      isGuest,
      timestamp: new Date().toISOString(),
    });

    const { data: newConv, error: createError } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_1: isGuest ? null : participantId,
        participant_2: null,
        guest_tracking_token: isGuest ? guestToken : null,
        order_id: orderId,
        last_message: "System Receipt",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("[systemMessaging] CRITICAL: Failed to create conversation", {
        code: (createError as any)?.code,
        message: (createError as any)?.message,
        details: (createError as any)?.details,
        orderId,
      });
      throw new Error(`Failed to create conversation for order ${orderId}: ${(createError as any)?.message}`);
    }

    console.log("[systemMessaging] Fallback conversation created", {
      conversationId: newConv?.id,
      orderId,
      warning: "This indicates RPC did not create conversation at order time",
    });

    return newConv;
  } catch (err) {
    console.error("[systemMessaging] EXCEPTION in createOrGetSystemConversation:", {
      errorString: String(err),
      orderId,
      stack: err instanceof Error ? err.stack : undefined,
    });
    return null;
  }
};

/**
 * Sends a system receipt message to a conversation
 * INVARIANT #3: Message insert requires valid conversation_id
 * Uses reserved SYSTEM_BOT_ID for all platform alerts
 */
export const sendSystemReceipt = async (
  conversationId: string,
  content: string,
  messageType: string = "system_receipt"
) => {
  // Disabled: handled by database trigger handle_order_created()
  return;
  try {
    if (!conversationId || conversationId.trim() === "") {
      throw new Error("INVARIANT VIOLATION #3: conversation_id is required and must not be empty");
    }

    console.log("[systemMessaging] INVARIANT #3: Inserting message with conversation_id", {
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
      console.error("[systemMessaging] CRITICAL: Message insert failed", {
        error,
        code: (error as any)?.code,
        message: (error as any)?.message,
        details: (error as any)?.details,
        conversationId,
        messageType,
      });
      throw new Error(`Message insert failed: ${(error as any)?.message}`);
    }

    console.log("[systemMessaging] ✓ INVARIANT #3 SATISFIED: Message inserted with valid conversation_id", {
      messageId: data?.id,
      conversationId,
      messageType,
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
      console.warn("[systemMessaging] Warning: Failed to update conversation metadata:", {
        error: updateError,
        conversationId,
      });
    }

    return data;
  } catch (err) {
    console.error("[systemMessaging] EXCEPTION in sendSystemReceipt:", {
      error: err,
      conversationId,
      errorString: String(err),
      stack: err instanceof Error ? err.stack : undefined,
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
  // Disabled: handled by database trigger handle_order_created()
  return;
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
  // Disabled: handled by database trigger handle_order_created()
  return;
  console.log("[systemMessaging] Sending retailer notification", {
    orderId,
    vendorId,
  });

  const fetchQuery = (supabase as any)
    .from("conversations")
    .select("*")
    .eq("participant_1", vendorId)
    .eq("order_id", orderId)
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
        participant_1: vendorId,
        participant_2: null,
        order_id: orderId,
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
  // Disabled: handled by database trigger handle_order_created()
  return;
  console.log("[systemMessaging] Sending delivery claimed notification", {
    orderId,
    riderId,
  });

  const fetchQuery = (supabase as any)
    .from("conversations")
    .select("*")
    .eq("participant_1", riderId)
    .eq("order_id", orderId)
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
        participant_1: riderId,
        participant_2: null,
        order_id: orderId,
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
