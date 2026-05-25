import { supabase } from "@/integrations/supabase/client";

/**
 * Reconciliation Hook: When a guest user signs up or logs in, 
 * link their historical localStorage orders to their account
 */
export async function linkGuestOrdersToAccount(userId: string): Promise<void> {
  try {
    // Retrieve guest tokens from localStorage
    const stored = localStorage.getItem("hive_guest_active_cart");
    const guestTokens = stored ? JSON.parse(stored) : [];

    if (!guestTokens || guestTokens.length === 0) {
      console.log("[linkGuestOrdersToAccount] No guest tokens to link");
      return;
    }

    console.log("[linkGuestOrdersToAccount] Linking tokens:", guestTokens);

    // Update orders table: set buyer_id for matching tracking_token rows
    const { error } = await supabase
      .from("orders")
      .update({ buyer_id: userId })
      .in("tracking_token", guestTokens)
      .is("buyer_id", null); // Only update if currently null (guest)

    if (error) {
      console.error("[linkGuestOrdersToAccount] Update failed:", error);
      throw error;
    }

    // Clear localStorage to transition to permanent account state
    localStorage.removeItem("hive_guest_active_cart");
    console.log("[linkGuestOrdersToAccount] Successfully linked and cleared local cart");
  } catch (err) {
    console.error("[linkGuestOrdersToAccount] Error:", err);
    throw err;
  }
}
