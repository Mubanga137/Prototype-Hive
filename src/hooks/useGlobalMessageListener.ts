import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuestTracking } from "@/hooks/useGuestTracking";
import { toast } from "sonner";

interface MessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  created_at: string;
}

export const useGlobalMessageListener = () => {
  const { user, profile } = useAuth();
  const { isGuest, trackingToken } = useGuestTracking();
  const channelRef = useRef<any>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const uid = user?.id;

    // Only set up if we have a valid auth context
    if (!uid && !trackingToken) return;

    let cancelled = false;

    const setup = async () => {
      const userRole = profile?.role || "customer";

      const channel = supabase
        .channel("global_message_alerts")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload: { new: MessagePayload }) => {
            if (cancelled) return;

            try {
              const msg = payload.new;
              const content = msg.content || "";

              // Skip if we've already processed this message
              if (processedMessagesRef.current.has(msg.id)) {
                return;
              }
              processedMessagesRef.current.add(msg.id);

              // CUSTOMER/GUEST: Check for order receipts
              if (isGuest && trackingToken) {
                // Check if this receipt message matches the guest's current tokens
                if (content.startsWith("🐝 Hive System Receipt")) {
                  const stored = localStorage.getItem("hive_guest_active_cart");
                  let tokenMatch = false;

                  if (stored) {
                    try {
                      const parsed = JSON.parse(stored);
                      let tokens: string[] = [];
                      if (Array.isArray(parsed)) {
                        tokens = parsed;
                      } else if (parsed?.trackingTokens) {
                        tokens = parsed.trackingTokens;
                      }
                      // Check if any guest token appears in the message content
                      tokenMatch = tokens.some((t) => content.includes(t));
                    } catch {
                      // Fallback: check if current tracking token is in message
                      tokenMatch = content.includes(trackingToken);
                    }
                  }

                  if (tokenMatch) {
                    toast.success("🐝 Order Confirmed! Check your receipt inbox details.", {
                      duration: 6000,
                    });
                    console.log("[useGlobalMessageListener] Guest order receipt toast shown");
                  }
                }
              }

              // VENDOR/MERCHANT: Check for retailer notifications
              if (uid && userRole === "vendor") {
                if (content.startsWith("📦 Retailer Notification")) {
                  // Play chime sound
                  try {
                    const audio = new Audio(
                      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBg=="
                    );
                    audio.play().catch(() => {});
                  } catch {}

                  toast.info("📦 New Hive Order Booked! Prepare item for fulfillment.", {
                    duration: 6000,
                  });
                  console.log("[useGlobalMessageListener] Vendor order notification toast shown");
                }
              }

              // RIDER: Check for delivery route claims
              if (uid && userRole === "gig_worker") {
                if (content.includes("🚀 Delivery Route Claimed")) {
                  toast.success("🚀 Delivery Route Claimed Successfully!", {
                    duration: 6000,
                  });
                  console.log("[useGlobalMessageListener] Rider delivery notification toast shown");
                }
              }
            } catch (err) {
              console.error("[useGlobalMessageListener] Error processing message:", err);
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log(
              `[useGlobalMessageListener] Global message listener active for ${
                isGuest ? "guest" : userRole
              }`
            );
          } else if (status === "CHANNEL_ERROR") {
            console.error("[useGlobalMessageListener] Channel error");
          }
        });

      channelRef.current = channel;
    };

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, trackingToken, profile?.role, isGuest]);
};
