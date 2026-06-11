import { supabase } from "@/integrations/supabase/client";

export const verifyMessagingTables = async () => {
  try {
    console.log("🔍 Verifying messaging tables...");

    // Check conversations table
    const { data: convData, error: convError } = await (supabase as any)
      .from("conversations")
      .select("count", { count: "exact", head: true });

    if (convError) {
      console.error("❌ Conversations table error:", convError);
    } else {
      console.log("✅ Conversations table exists");
    }

    // Check messages table
    const { data: msgData, error: msgError } = await (supabase as any)
      .from("messages")
      .select("count", { count: "exact", head: true });

    if (msgError) {
      console.error("❌ Messages table error:", msgError);
    } else {
      console.log("✅ Messages table exists");
    }

    // Test real-time subscription
    console.log("🔄 Testing real-time subscriptions...");
    const channel = (supabase as any)
      .channel("test_messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload: any) => {
        console.log("📨 Real-time event received:", payload);
      })
      .subscribe();

    console.log("✅ Real-time channel subscribed");

    return { success: true, convTable: !convError, msgTable: !msgError };
  } catch (error) {
    console.error("Setup verification failed:", error);
    return { success: false };
  }
};

export const createTestConversation = async (
  userId1: string,
  userId2: string,
  orderId?: number
) => {
  try {
    const { data, error } = await (supabase as any)
      .from("conversations")
      .insert({
        participant_1: userId1,
        participant_2: userId2,
        context_order_id: orderId || null,
        last_message: "Conversation started",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    console.log("✅ Test conversation created:", data);
    return data;
  } catch (error) {
    console.error("Failed to create test conversation:", error);
    throw error;
  }
};

export const sendTestMessage = async (
  conversationId: string,
  senderId: string,
  content: string
) => {
  try {
    const { data, error } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: "text",
      })
      .select()
      .single();

    if (error) throw error;
    console.log("✅ Test message sent:", data);
    return data;
  } catch (error) {
    console.error("Failed to send test message:", error);
    throw error;
  }
};

export const getAllConversations = async () => {
  try {
    const { data, error } = await (supabase as any)
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    console.log("📋 All conversations:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    throw error;
  }
};

export const getAllMessages = async () => {
  try {
    const { data, error } = await (supabase as any)
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    console.log("💬 All messages:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    throw error;
  }
};
