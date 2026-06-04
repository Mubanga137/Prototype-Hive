import { supabase } from "@/integrations/supabase/client";

/**
 * DUAL-STATE RULE: Guest-to-Auth Continuity
 * 
 * When a guest user signs up or logs in, link their historical localStorage 
 * message threads to their authenticated account, ensuring conversation continuity
 */
export async function linkGuestConversationsToUser(userId: string): Promise<void> {
  try {
    // Inspect browser cache for guest receipt data array key
    const stored = localStorage.getItem("hive_guest_active_cart");
    const guestCartData = stored ? JSON.parse(stored) : null;

    if (!guestCartData) {
      console.log("[linkGuestConversationsToUser] No guest cart data found");
      return;
    }

    // Extract 36-character unguessable tracking UUID
    const trackingToken = guestCartData.trackingToken || guestCartData.token;

    if (!trackingToken || typeof trackingToken !== "string") {
      console.log("[linkGuestConversationsToUser] No valid tracking token found");
      return;
    }

    console.log("[linkGuestConversationsToUser] Linking conversations for token:", {
      token: trackingToken.slice(0, 8) + "...",
      userId: userId.slice(0, 8) + "...",
    });

    // Twin-table relational lookup: resolve the conversation shell via guest token anchor
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, guest_tracking_token, participant_a, participant_b, context_order_id")
      .eq("guest_tracking_token", trackingToken);

    if (convError) {
      console.error("[linkGuestConversationsToUser] Conversation fetch failed:", convError);
      throw convError;
    }

    if (!conversations || conversations.length === 0) {
      console.log("[linkGuestConversationsToUser] No guest conversations to link");
      return;
    }

    console.log(
      `[linkGuestConversationsToUser] Found ${conversations.length} conversations to migrate`
    );

    // Update conversations: clear guest_tracking_token, set participant_a to new user
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        guest_tracking_token: null,
        participant_a: userId,
      })
      .eq("guest_tracking_token", trackingToken);

    if (updateError) {
      console.error("[linkGuestConversationsToUser] Conversation update failed:", updateError);
      throw updateError;
    }

    // Update messages: convert guest sender_id to authenticated user_id
    const guestSenderId = `guest_${trackingToken}`;
    const conversationIds = conversations.map((c) => c.id);

    const { error: msgError } = await supabase
      .from("messages")
      .update({ sender_id: userId })
      .eq("sender_id", guestSenderId)
      .in("conversation_id", conversationIds);

    if (msgError) {
      console.error("[linkGuestConversationsToUser] Message update failed:", msgError);
      throw msgError;
    }

    console.log("[linkGuestConversationsToUser] Successfully linked all conversations and messages");
  } catch (err) {
    console.error("[linkGuestConversationsToUser] Error:", err);
    throw err;
  }
}
