import { supabase } from "@/integrations/supabase/client";

const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000000";

export const createTestSystemConversationsAndMessages = async (userId: string) => {
  try {
    console.log("[testSystemMessages] Creating test data for user:", userId);

    // Create a test conversation for this user
    const { data: conv, error: convError } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_a: userId,
        participant_b: null,
        context_order_id: 1001,
        last_message: "System Receipt",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) {
      console.error("[testSystemMessages] Failed to create conversation:", convError);
      return { success: false, error: convError.message };
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
      console.error("[testSystemMessages] Failed to insert message:", msgError);
      return { success: false, error: msgError.message };
    }

    console.log("[testSystemMessages] Message created:", msg.id);

    return {
      success: true,
      conversationId: conv.id,
      messageId: msg.id,
      message: "✅ Test conversation and system receipt created successfully!",
    };
  } catch (error: any) {
    console.error("[testSystemMessages] Exception:", error);
    return { success: false, error: error.message };
  }
};

export const createTestVendorNotification = async (vendorId: string) => {
  try {
    console.log("[testSystemMessages] Creating vendor test notification for:", vendorId);

    // Create a test conversation for this vendor
    const { data: conv, error: convError } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_a: vendorId,
        participant_b: null,
        context_order_id: 2001,
        last_message: "New Order",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) {
      console.error("[testSystemMessages] Failed to create vendor conversation:", convError);
      return { success: false, error: convError.message };
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
      console.error("[testSystemMessages] Failed to insert vendor notification:", msgError);
      return { success: false, error: msgError.message };
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
        participant_a: riderId,
        participant_b: null,
        context_order_id: 3001,
        last_message: "Delivery Claimed",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) {
      console.error("[testSystemMessages] Failed to create rider conversation:", convError);
      return { success: false, error: convError.message };
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
      console.error("[testSystemMessages] Failed to insert rider notification:", msgError);
      return { success: false, error: msgError.message };
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
