import { supabase } from "@/integrations/supabase/client";

/**
 * DUAL-STATE RULE: Guest-to-Auth Continuity
 * 
 * When a guest user signs up or logs in, link their historical localStorage 
 * message threads to their authenticated account, ensuring conversation continuity
 */
export async function linkGuestConversationsToUser(userId: string): Promise<void> {
  try {
    // Inspect browser cache for guest receipt data - handle both old and new formats
    const stored = localStorage.getItem("hive_guest_active_cart");
    let guestCartData: any = stored ? JSON.parse(stored) : null;

    if (!guestCartData) {
      console.log("[linkGuestConversationsToUser] No guest cart data found");
      return;
    }

    // Extract tracking tokens - handle both formats:
    // Old format: array of tokens [uuid, uuid, ...]
    // New format: { trackingTokens: [uuid, ...], mostRecent: uuid }
    let trackingTokens: string[] = [];
    if (Array.isArray(guestCartData)) {
      trackingTokens = guestCartData;
    } else if (guestCartData?.trackingTokens && Array.isArray(guestCartData.trackingTokens)) {
      trackingTokens = guestCartData.trackingTokens;
    } else if (guestCartData?.trackingToken || guestCartData?.token) {
      trackingTokens = [guestCartData.trackingToken || guestCartData.token];
    }

    if (trackingTokens.length === 0) {
      console.log("[linkGuestConversationsToUser] No valid tracking tokens found");
      return;
    }

    console.log("[linkGuestConversationsToUser] Linking conversations", {
      tokenCount: trackingTokens.length,
      userId: userId.slice(0, 8) + "...",
    });

    // Twin-table relational lookup: resolve conversation shells via guest token anchors
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("id, guest_tracking_token, participant_a, participant_b, context_order_id")
      .in("guest_tracking_token", trackingTokens);

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

    // Update all guest conversations: clear guest_tracking_token, set participant_a to new user
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        guest_tracking_token: null,
        participant_a: userId,
      })
      .in("guest_tracking_token", trackingTokens);

    if (updateError) {
      console.error("[linkGuestConversationsToUser] Conversation update failed:", updateError);
      throw updateError;
    }

    // Update messages: convert guest sender_ids (if any) to authenticated user_id
    // Note: Most guest messages are from SYSTEM_BOT_ID, but in case there are others
    const conversationIds = conversations.map((c) => c.id);
    const updatePromises = trackingTokens.map((token) => {
      const guestSenderId = `guest_${token}`;
      return supabase
        .from("messages")
        .update({ sender_id: userId })
        .eq("sender_id", guestSenderId)
        .in("conversation_id", conversationIds);
    });

    const results = await Promise.allSettled(updatePromises);
    const failedUpdates = results.filter(
      (r) => r.status === "rejected"
    );

    if (failedUpdates.length > 0) {
      console.warn(
        `[linkGuestConversationsToUser] ${failedUpdates.length} message updates failed (non-critical)`
      );
    }

    console.log("[linkGuestConversationsToUser] Successfully linked all conversations and messages", {
      conversationsMigrated: conversations.length,
      tokensProcessed: trackingTokens.length,
    });
  } catch (err) {
    console.error("[linkGuestConversationsToUser] Error:", err);
    throw err;
  }
}
