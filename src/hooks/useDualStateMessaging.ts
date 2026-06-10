/**
 * Core dual-state messaging hook
 * Handles both authenticated (user/vendor/rider) and guest buyer flows
 *
 * AUTHENTICATED: Use supabase.auth.user().id
 * GUEST: Use localStorage['hive_guest_active_cart'] tracking token
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuestTracking } from "@/hooks/useGuestTracking";
import { toast } from "sonner";

interface Conversation {
  id: string;
  participant_1: string | null;
  participant_2: string | null;
  guest_tracking_token: string | null;
  last_message: string | null;
  last_message_at: string | null;
  context_order_id: number | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  created_at: string;
}

interface DualStateMessagingContext {
  isAuthenticated: boolean;
  isGuest: boolean;
  authIdentifier: string | null;
  authMode: "user" | "guest" | null;
  allTrackingTokens: string[];
}

const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000001";

export const useDualStateMessaging = () => {
  const { user } = useAuth();
  const { isGuest, trackingToken, hasValidToken, allTrackingTokens } = useGuestTracking();
  const [context, setContext] = useState<DualStateMessagingContext>({
    isAuthenticated: false,
    isGuest: false,
    authIdentifier: null,
    authMode: null,
    allTrackingTokens: [],
  });

  // Determine auth context on mount and when auth state changes
  useEffect(() => {
    const uid = user?.id;
    const isAuthenticated = !!uid;
    const isGuestMode = !isAuthenticated && isGuest && hasValidToken && trackingToken;

    console.log("[useDualStateMessaging] Auth Context:", {
      isAuthenticated,
      isGuestMode,
      userID: uid?.slice(0, 8) + "...",
      guestToken: trackingToken?.slice(0, 8) + "...",
      hasValidToken,
    });

    if (isAuthenticated) {
      setContext({
        isAuthenticated: true,
        isGuest: false,
        authIdentifier: uid || null,
        authMode: "user",
        allTrackingTokens: [],
      });
    } else if (isGuestMode) {
      setContext({
        isAuthenticated: false,
        isGuest: true,
        authIdentifier: trackingToken,
        authMode: "guest",
        allTrackingTokens,
      });
    } else {
      setContext({
        isAuthenticated: false,
        isGuest: false,
        authIdentifier: null,
        authMode: null,
        allTrackingTokens: [],
      });
    }
  }, [user?.id, isGuest, trackingToken, hasValidToken, allTrackingTokens]);

  /**
   * DUAL-STATE RULE 1: AUTHENTICATED vs GUEST data retrieval
   *
   * IF SESSION IS UN-AUTHENTICATED (Guest Mode):
   *   - Inspect browser cache for guest receipt data: localStorage.getItem('hive_guest_active_cart')
   *   - Parse JSON and extract 36-character tracking UUID
   *   - Execute twin-table relational lookup: fetch conversation shell, then message data
   *
   * IF SESSION IS AUTHENTICATED (Registered User/Vendor/Rider):
   *   - Isolate conversation histories by checking: participant_a === auth.uid() OR participant_b === auth.uid()
   */
  const loadConversations = useCallback(async () => {
    if (!context.authIdentifier || !context.authMode) {
      console.debug(
        "[useDualStateMessaging.loadConversations] No valid auth context, skipping"
      );
      return { success: false, conversations: [], error: "No auth context" };
    }

    try {
      console.debug("[useDualStateMessaging.loadConversations] Starting fetch", {
        authMode: context.authMode,
        identifier: context.authIdentifier?.slice(0, 8) + "...",
      });

      let data: any = [];
      let error: any = null;

      if (context.authMode === "user" && context.authIdentifier) {
        // AUTHENTICATED: Split into two separate queries (more reliable than .or())
        console.debug(
          `[useDualStateMessaging.loadConversations] User mode: ${context.authIdentifier}`
        );

        const uid = context.authIdentifier;

        try {
          // Fetch conversations where user is participant_1
          const { data: convA, error: errA } = await (supabase as any)
            .from("conversations")
            .select("*")
            .eq("participant_1", uid)
            .order("last_message_at", { ascending: false });

          if (errA) {
            console.error("[useDualStateMessaging] participant_1 query failed:", errA);
          }

          // Fetch conversations where user is participant_2
          const { data: convB, error: errB } = await (supabase as any)
            .from("conversations")
            .select("*")
            .eq("participant_2", uid)
            .order("last_message_at", { ascending: false });

          if (errB) {
            console.error("[useDualStateMessaging] participant_2 query failed:", errB);
          }

          error = errA || errB;
          data = [...(convA || []), ...(convB || [])];

          // Deduplicate and sort
          const seen = new Set();
          data = data.filter((conv: any) => {
            if (seen.has(conv.id)) return false;
            seen.add(conv.id);
            return true;
          });
          data.sort((a: any, b: any) => {
            const timeA = new Date(a.last_message_at || 0).getTime();
            const timeB = new Date(b.last_message_at || 0).getTime();
            return timeB - timeA;
          });
        } catch (queryErr: any) {
          console.error("[useDualStateMessaging] Query exception:", queryErr.message);
          error = queryErr;
        }
      } else if (context.authMode === "guest" && context.allTrackingTokens.length > 0) {
        // GUEST: Fetch via all guest_tracking_tokens (support multiple orders per guest)
        console.debug(
          `[useDualStateMessaging.loadConversations] Guest mode with ${context.allTrackingTokens.length} tokens`
        );
        try {
          const result = await (supabase as any)
            .from("conversations")
            .select("*")
            .in("guest_tracking_token", context.allTrackingTokens)
            .order("last_message_at", { ascending: false });

          data = result.data;
          error = result.error;

          if (error) {
            console.error("[useDualStateMessaging] Guest query error:", error.message);
          }
        } catch (queryErr: any) {
          console.error("[useDualStateMessaging] Guest query exception:", queryErr.message);
          error = queryErr;
        }
      }

      if (error) {
        console.error("[useDualStateMessaging.loadConversations] Query failed:", {
          message: error.message,
          code: error.code,
          authMode: context.authMode,
          details: error.details,
        });
        // Return empty array instead of error - allow UI to show "no conversations"
        return {
          success: true,
          conversations: [],
          error: null,
        };
      }

      console.log(
        `[useDualStateMessaging.loadConversations] Loaded ${data?.length || 0} conversations`
      );
      return {
        success: true,
        conversations: (data as Conversation[]) || [],
        error: null,
      };
    } catch (err: any) {
      console.error("[useDualStateMessaging.loadConversations] Exception:", {
        message: err.message,
        authMode: context.authMode,
      });
      // Return empty array - don't block the UI
      return { success: true, conversations: [], error: null };
    }
  }, [context.authIdentifier, context.authMode]);

  /**
   * Load all messages for a specific conversation
   * INVARIANT #4: Frontend must fetch using ONLY WHERE conversation_id = <stored_conversation_id>
   * Includes system alerts (sender_id === SYSTEM_BOT_ID)
   */
  const loadMessages = useCallback(
    async (conversationId: string) => {
      // INVARIANT #4: Strict conversation_id validation
      if (!conversationId || conversationId.trim() === "") {
        console.error("[useDualStateMessaging.loadMessages] INVARIANT VIOLATION #4: conversation_id is required", {
          conversationId,
          timestamp: new Date().toISOString(),
        });
        return { success: false, messages: [], error: "INVARIANT VIOLATION: No valid conversation ID" };
      }

      try {
        console.log("[useDualStateMessaging.loadMessages] INVARIANT #4: Fetching messages with conversation_id", {
          conversationId,
          timestamp: new Date().toISOString(),
        });

        const { data, error } = await (supabase as any)
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("[useDualStateMessaging.loadMessages] Query error:", {
            message: error.message,
            conversationId,
            code: error.code,
          });
          return { success: false, messages: [], error: error.message };
        }

        const messages = data as Message[];
        console.log("[useDualStateMessaging.loadMessages] ✓ INVARIANT #4 SATISFIED: Messages fetched", {
          conversationId,
          messageCount: messages?.length || 0,
          systemAlertCount: messages?.filter((m) => m.sender_id === SYSTEM_BOT_ID).length || 0,
        });
        return { success: true, messages: messages || [], error: null };
      } catch (err: any) {
        console.error("[useDualStateMessaging.loadMessages] Exception:", {
          message: err.message,
          conversationId,
          stack: err.stack,
        });
        return { success: false, messages: [], error: err.message };
      }
    },
    []
  );

  /**
   * REAL-TIME RULE 2: System Alerts & Unblur
   *
   * Connect permanent Supabase real-time channel subscription targeting public.messages
   * When backend trigger inserts automated system alert (sender_id === SYSTEM_BOT_ID):
   *   - e.g., "🐝 Hive System Receipt" on checkout payment
   *   - e.g., "🚀 Delivery Dispatch" on rider assignment
   * Push text block instantly into state WITHOUT manual page reload
   *
   * Visual condition: If sender_id === '00000000-0000-0000-0000-000000000000',
   * style as centered neutral italicized banner, separate from peer-to-peer chats
   */
  const subscribeToMessages = useCallback(
    (conversationId: string, onNewMessage: (message: Message) => void) => {
      if (!conversationId) return null;

      console.debug(
        `[useDualStateMessaging.subscribeToMessages] Subscribing to: ${conversationId}`
      );

      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            console.debug(
              `[useDualStateMessaging.subscribeToMessages] New message: ${newMsg.id.slice(0, 8)}... (${
                newMsg.sender_id === SYSTEM_BOT_ID ? "SYSTEM ALERT" : "peer"
              })`
            );
            onNewMessage(newMsg);
          }
        )
        .subscribe((status) => {
          console.log(`[useDualStateMessaging.subscribeToMessages] Status: ${status}`);
        });

      return channel;
    },
    []
  );

  /**
   * Link guest conversations to authenticated user account
   * Called during signup/login to migrate guest message threads
   */
  const linkGuestConversationsToUser = useCallback(
    async (userId: string, guestToken: string) => {
      try {
        console.log("[useDualStateMessaging.linkGuestConversationsToUser] Starting linkage", {
          userId: userId.slice(0, 8) + "...",
          guestToken: guestToken.slice(0, 8) + "...",
        });

        // Update conversations: set participant_1 or participant_2 to new user, clear guest token
      const { error } = await supabase
        .from("conversations")
        .update({
          guest_tracking_token: null,
          participant_1: userId,
        })
        .eq("guest_tracking_token", guestToken);

        if (error) {
          console.error("[useDualStateMessaging.linkGuestConversationsToUser] Update failed:", error);
          throw error;
        }

        console.log("[useDualStateMessaging.linkGuestConversationsToUser] Successfully linked conversations");
        return { success: true };
      } catch (err: any) {
        console.error("[useDualStateMessaging.linkGuestConversationsToUser] Exception:", err.message);
        return { success: false, error: err.message };
      }
    },
    []
  );

  return {
    context,
    loadConversations,
    loadMessages,
    subscribeToMessages,
    linkGuestConversationsToUser,
    SYSTEM_BOT_ID,
  };
};
