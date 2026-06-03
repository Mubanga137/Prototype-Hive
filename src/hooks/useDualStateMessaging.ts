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
  participant_a: string | null;
  participant_b: string | null;
  guest_tracking_token: string | null;
  last_message: string | null;
  last_message_at: string | null;
  context_order_id: number | null;
  created_at: string;
}

interface DualStateMessagingContext {
  isAuthenticated: boolean;
  isGuest: boolean;
  authIdentifier: string | null;
  authMode: "user" | "guest" | null;
}

export const useDualStateMessaging = () => {
  const { user } = useAuth();
  const { isGuest, trackingToken, hasValidToken } = useGuestTracking();
  const [context, setContext] = useState<DualStateMessagingContext>({
    isAuthenticated: false,
    isGuest: false,
    authIdentifier: null,
    authMode: null,
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
      });
    } else if (isGuestMode) {
      setContext({
        isAuthenticated: false,
        isGuest: true,
        authIdentifier: trackingToken,
        authMode: "guest",
      });
    } else {
      setContext({
        isAuthenticated: false,
        isGuest: false,
        authIdentifier: null,
        authMode: null,
      });
    }
  }, [user?.id, isGuest, trackingToken, hasValidToken]);

  /**
   * AUTHENTICATED: Fetch conversations where user is participant_a or participant_b
   * GUEST: Fetch conversations where guest_tracking_token matches
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

      let query = (supabase as any)
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (context.authMode === "user" && context.authIdentifier) {
        // Authenticated user: fetch where participant_a OR participant_b === uid
        console.debug(
          `[useDualStateMessaging.loadConversations] User mode: ${context.authIdentifier}`
        );
        query = query.or(
          `participant_a.eq.${context.authIdentifier},participant_b.eq.${context.authIdentifier}`
        );
      } else if (context.authMode === "guest" && context.authIdentifier) {
        // Guest: fetch where guest_tracking_token === token
        console.debug(
          `[useDualStateMessaging.loadConversations] Guest mode: ${context.authIdentifier.slice(
            0,
            8
          )}...`
        );
        query = query.eq("guest_tracking_token", context.authIdentifier);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[useDualStateMessaging.loadConversations] Query error:", {
          message: error.message,
          code: error.code,
          authMode: context.authMode,
        });
        return { success: false, conversations: [], error: error.message };
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
      return { success: false, conversations: [], error: err.message };
    }
  }, [context.authIdentifier, context.authMode]);

  /**
   * Load all messages for a specific conversation
   */
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return { success: false, messages: [], error: "No conversation ID" };

      try {
        console.debug(
          `[useDualStateMessaging.loadMessages] Loading for conversation: ${conversationId}`
        );

        const { data, error } = await (supabase as any)
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("[useDualStateMessaging.loadMessages] Query error:", {
            message: error.message,
            conversationId,
          });
          return { success: false, messages: [], error: error.message };
        }

        console.log(
          `[useDualStateMessaging.loadMessages] Loaded ${data?.length || 0} messages`
        );
        return { success: true, messages: data || [], error: null };
      } catch (err: any) {
        console.error("[useDualStateMessaging.loadMessages] Exception:", err.message);
        return { success: false, messages: [], error: err.message };
      }
    },
    []
  );

  /**
   * Set up real-time listener for new messages in a conversation
   */
  const subscribeToMessages = useCallback(
    (conversationId: string, onNewMessage: (message: any) => void) => {
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
            console.debug(
              `[useDualStateMessaging.subscribeToMessages] New message: ${payload.new.id}`
            );
            onNewMessage(payload.new);
          }
        )
        .subscribe((status) => {
          console.log(`[useDualStateMessaging.subscribeToMessages] Status: ${status}`);
        });

      return channel;
    },
    []
  );

  return {
    context,
    loadConversations,
    loadMessages,
    subscribeToMessages,
  };
};
