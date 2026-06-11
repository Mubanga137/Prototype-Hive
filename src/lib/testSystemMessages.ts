import { supabase } from "@/integrations/supabase/client";

const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000001";

export const createTestSystemConversationsAndMessages = async (userId: string) => {
  try {
    console.log("[testSystemMessages] Creating test data for user:", userId?.slice(0, 8) + "...");

    // Create a test conversation for this user
    const { data: conv, error: convError } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_1: userId,
        participant_2: null,
        context_order_id: 1001,
        last_message: "System Receipt",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) {
      console.error("[testSystemMessages] Conversation INSERT failed:", {
        code: convError.code,
        message: convError.message,
        details: convError.details,
        hint: convError.hint,
      });
      return { success: false, error: `INSERT failed: ${convError.message}` };
    }

    if (!conv) {
      console.error("[testSystemMessages] Conversation returned null");
      return { success: false, error: "Conversation creation returned no data" };
    }

    console.log("[testSystemMessages] Conversation created:", conv.id);

    // Insert a test system receipt message
    const { data: msg, error: msgError } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: SYSTEM_BOT_ID,
        content: `🐝 Hive System Receipt\n\nOrder #1001\nTotal: K450.00\nEstimated Delivery: 2-3 hours\n\nYour order is confirmed and will be prepared shortly.`,
        message_type: "system_receipt",
      })
      .select()
      .single();

    if (msgError) {
      console.error("[testSystemMessages] Message INSERT failed:", {
        code: msgError.code,
        message: msgError.message,
        details: msgError.details,
        hint: msgError.hint,
      });
      return { success: false, error: `Message INSERT failed: ${msgError.message}` };
    }

    if (!msg) {
      console.error("[testSystemMessages] Message returned null");
      return { success: false, error: "Message creation returned no data" };
    }

    console.log("[testSystemMessages] ✅ Success! Conversation:", conv.id, "Message:", msg.id);

    return {
      success: true,
      conversationId: conv.id,
      messageId: msg.id,
      message: "✅ Test conversation and system receipt created successfully!",
    };
  } catch (error: any) {
    console.error("[testSystemMessages] Exception:", error.message, error.stack);
    return { success: false, error: `Exception: ${error.message}` };
  }
};

export const createTestVendorNotification = async (vendorId: string) => {
  try {
    console.log("[testSystemMessages] Creating vendor test notification for:", vendorId);

    // Create a test conversation for this vendor
    const { data: conv, error: convError } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_1: vendorId,
        participant_2: null,
        context_order_id: 2001,
        last_message: "New Order",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) {
      console.error("[testSystemMessages] Vendor conversation INSERT failed:", convError.message);
      return { success: false, error: convError.message };
    }

    if (!conv) {
      return { success: false, error: "Vendor conversation returned null" };
    }

    // Insert a test retailer notification
    const { data: msg, error: msgError } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: SYSTEM_BOT_ID,
        content: `📦 Retailer Notification\n\nNew order from Jane Smith\n\nItems:\n• 2x Fresh Bread\n• 1x Milk (1L)\n• 1x Butter (500g)\n\nTotal: K285.00\nPickup Location: Store Address`,
        message_type: "retailer_notification",
      })
      .select()
      .single();

    if (msgError) {
      console.error("[testSystemMessages] Vendor message INSERT failed:", msgError.message);
      return { success: false, error: msgError.message };
    }

    if (!msg) {
      return { success: false, error: "Vendor message returned null" };
    }

    return {
      success: true,
      conversationId: conv.id,
      messageId: msg.id,
      message: "✅ Test vendor notification created successfully!",
    };
  } catch (error: any) {
    console.error("[testSystemMessages] Exception:", error);
    return { success: false, error: error.message };
  }
};

export const createTestRiderNotification = async (riderId: string) => {
  try {
    console.log("[testSystemMessages] Creating rider test notification for:", riderId);

    // Create a test conversation for this rider
    const { data: conv, error: convError } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_1: riderId,
        participant_2: null,
        context_order_id: 3001,
        last_message: "Delivery Claimed",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) {
      console.error("[testSystemMessages] Rider conversation INSERT failed:", convError.message);
      return { success: false, error: convError.message };
    }

    if (!conv) {
      return { success: false, error: "Rider conversation returned null" };
    }

    // Insert a test delivery notification
    const { data: msg, error: msgError } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conv.id,
        sender_id: SYSTEM_BOT_ID,
        content: `🚀 Delivery Route Claimed Successfully!\n\nOrder #3001 has been claimed for delivery.\nEstimated delivery time: 30 minutes`,
        message_type: "delivery_notification",
      })
      .select()
      .single();

    if (msgError) {
      console.error("[testSystemMessages] Rider message INSERT failed:", msgError.message);
      return { success: false, error: msgError.message };
    }

    if (!msg) {
      return { success: false, error: "Rider message returned null" };
    }

    return {
      success: true,
      conversationId: conv.id,
      messageId: msg.id,
      message: "✅ Test rider notification created successfully!",
    };
  } catch (error: any) {
    console.error("[testSystemMessages] Exception:", error);
    return { success: false, error: error.message };
  }
};
