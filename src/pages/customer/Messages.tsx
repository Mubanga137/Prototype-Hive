import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, Send, Search, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuestTracking } from "@/hooks/useGuestTracking";
import { useDualStateMessaging } from "@/hooks/useDualStateMessaging";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import MessagingDebugPanel from "@/components/messaging/MessagingDebugPanel";

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

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  created_at: string;
}

interface ProfileSummary {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

const formatTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000)
    return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const initials = (name: string | null) =>
  (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const CustomerMessages = () => {
  const { user } = useAuth();
  const { isGuest, trackingToken } = useGuestTracking();
  const location = useLocation();
  const isMobile = useIsMobile();
  const dualState = useDualStateMessaging();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [convLoading, setConvLoading] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const realtimeChannelsRef = useRef<Map<string, any>>(new Map());

  const uid = user?.id;
  const isAuthenticated = !!uid;
  const authIdentifier = dualState.context.authIdentifier;
  const authMode = dualState.context.authMode;

  // Debug auth state
  useEffect(() => {
    console.log("[CustomerMessages] Auth State Debug:", {
      uid: uid?.slice(0, 8) + "..." || "null",
      isAuthenticated,
      authIdentifier: authIdentifier?.slice(0, 8) + "..." || "null",
      authMode,
      conversationCount: conversations.length,
      convLoading,
    });
  }, [uid, isAuthenticated, authIdentifier, authMode, conversations.length, convLoading]);

  // ========== DUAL-STATE: Load Conversations (REFACTORED) ==========
  const loadConversations = useCallback(async () => {
    setConvLoading(true);
    try {
      const result = await dualState.loadConversations();

      if (result.success) {
        console.log(
          `[CustomerMessages] Loaded ${result.conversations.length} conversations`
        );
        setConversations(result.conversations);
      } else {
        console.warn("[CustomerMessages] Failed to load conversations:", result.error);
        setConversations([]);
        if (result.error && !dualState.context.authIdentifier) {
          // Silent fail if no auth context (guest not set up yet)
          console.debug("[CustomerMessages] No auth identifier yet");
        } else if (result.error) {
          toast.error(`Failed to load conversations: ${result.error}`);
        }
      }
    } catch (err: any) {
      console.error("[CustomerMessages] Exception loading conversations:", err);
      setConversations([]);
      toast.error(`Failed to load conversations: ${err.message}`);
    } finally {
      setConvLoading(false);
    }
  }, [dualState]);

  // Load conversations when auth context changes
  useEffect(() => {
    if (authIdentifier && authMode) {
      loadConversations();
    } else {
      console.debug("[CustomerMessages] No auth identifier, skipping load");
      setConversations([]);
      setConvLoading(false);
    }
  }, [authIdentifier, authMode, loadConversations]);

  // Auto-select conversation from URL parameter (?c=conversationId)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convId = params.get("c");

    if (convId && conversations.length > 0) {
      const matchingConv = conversations.find((c) => c.id === convId);
      if (matchingConv && matchingConv.id !== activeConv?.id) {
        console.log("[CustomerMessages] Auto-selecting conversation from URL", {
          conversationId: convId.slice(0, 8) + "...",
        });
        setActiveConv(matchingConv);
      }
    }
  }, [location.search, conversations, activeConv]);

  // Auto-retry if loading fails after timeout
  useEffect(() => {
    if (!convLoading && conversations.length === 0 && authIdentifier && authMode) {
      const timer = setTimeout(() => {
        console.log("[CustomerMessages] Retrying conversations load after timeout...");
        loadConversations();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [convLoading, conversations.length, authIdentifier, authMode, loadConversations]);

  // ========== Load Messages for Active Conversation ==========
  const loadMessagesForConversation = useCallback(async (convId: string) => {
    try {
      console.debug(`[CustomerMessages] Loading messages for conversation: ${convId}`);
      // Use service-role RPC function to bypass guest RLS restrictions
      const { data, error } = await (supabase as any).rpc(
        "get_conversation_messages",
        { p_conversation_id: convId }
      );

      if (error) {
        console.error("[CustomerMessages] Load messages error:", {
          message: error.message,
          code: error.code,
          hint: error.hint,
          conversationId: convId,
        });
        toast.error(`Failed to load messages: ${error.message || "Unknown error"}`);
        setMessages([]);
      } else if (data) {
        console.log(`[CustomerMessages] Loaded ${data.length} messages for conversation`);
        setMessages(data as Message[]);
      } else {
        console.warn("[CustomerMessages] No data returned from messages query");
        setMessages([]);
      }
    } catch (err: any) {
      console.error("[CustomerMessages] Exception loading messages:", {
        message: err.message,
        stack: err.stack,
        conversationId: convId,
      });
      toast.error(`Failed to load messages: ${err.message}`);
      setMessages([]);
    }
  }, []);

  // ========== Load Profiles ==========
  const loadProfiles = useCallback(async () => {
    if (conversations.length === 0) {
      console.debug("[CustomerMessages] No conversations, skipping profile load");
      return;
    }

    try {
      const allUserIds = new Set<string>();
      conversations.forEach((c) => {
        if (c.participant_a) allUserIds.add(c.participant_a);
        if (c.participant_b) allUserIds.add(c.participant_b);
      });

      const userIds = Array.from(allUserIds);
      if (userIds.length === 0) {
        console.debug("[CustomerMessages] No user IDs to fetch profiles for");
        return;
      }

      console.debug(`[CustomerMessages] Loading profiles for ${userIds.length} users`);
      const { data, error } = await (supabase as any)
        .from("user_profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      if (error) {
        console.warn("[CustomerMessages] Load profiles error:", {
          message: error.message,
          code: error.code,
          userIdCount: userIds.length,
        });
        // Don't show error toast for profiles - it's non-critical
      } else if (data) {
        console.log(`[CustomerMessages] Loaded profiles for ${data.length} users`);
        const profileMap = data.reduce(
          (acc: Record<string, ProfileSummary>, p: ProfileSummary) => {
            acc[p.user_id] = p;
            return acc;
          },
          {}
        );
        setProfiles(profileMap);
      }
    } catch (err: any) {
      console.warn("[CustomerMessages] Exception loading profiles:", {
        message: err.message,
        stack: err.stack,
      });
      // Don't show error toast for profiles - it's non-critical
    }
  }, [conversations]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (activeConv) {
      loadMessagesForConversation(activeConv.id);
    }
  }, [activeConv, loadMessagesForConversation]);

  // ========== Auto-scroll to latest message ==========
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ========== REAL-TIME: Stream Message Bubbles ==========
  // Once conversation_id is resolved, set up active real-time subscription
  // targeting the public.messages table, filtering strictly by conversation_id
  useEffect(() => {
    if (!activeConv?.id) {
      console.debug("[CustomerMessages] No active conversation, skipping message subscription");
      return;
    }

    const conversationId = activeConv.id;
    const channelName = `messages:${conversationId}`;

    console.debug(`[CustomerMessages] Setting up real-time subscription for ${channelName}`);

    // Clean up old channel if exists
    const oldChannel = realtimeChannelsRef.current.get(channelName);
    if (oldChannel) {
      console.debug(`[CustomerMessages] Cleaning up previous channel for conversation`);
      supabase.removeChannel(oldChannel);
      realtimeChannelsRef.current.delete(channelName);
    }

    // Create new real-time subscription for this conversation
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          try {
            const newMsg = payload.new as Message;
            console.debug(`[CustomerMessages] Received new message from real-time: ${newMsg.id.slice(0, 8)}...`);
            setMessages((prev) => {
              const isDuplicate = prev.some((m) => m.id === newMsg.id);
              if (isDuplicate) {
                console.debug(`[CustomerMessages] Skipping duplicate message: ${newMsg.id.slice(0, 8)}...`);
                return prev;
              }
              console.log(`[CustomerMessages] Message appended to state`);
              return [...prev, newMsg];
            });
          } catch (err: any) {
            console.error("[CustomerMessages] Error processing real-time message:", {
              message: err.message,
              payloadId: payload.new?.id,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`[CustomerMessages] Real-time subscription status: ${status}`);
        if (status === "SUBSCRIBED") {
          console.log(`[CustomerMessages] ✅ Real-time subscribed to ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[CustomerMessages] ❌ Real-time channel error for ${channelName}`);
        } else if (status === "TIMED_OUT") {
          console.error(`[CustomerMessages] ❌ Real-time subscription timed out for ${channelName}`);
        }
      });

    realtimeChannelsRef.current.set(channelName, channel);

    return () => {
      if (realtimeChannelsRef.current.has(channelName)) {
        console.debug(`[CustomerMessages] Cleaning up real-time subscription for ${channelName}`);
        supabase.removeChannel(channel);
        realtimeChannelsRef.current.delete(channelName);
      }
    };
  }, [activeConv?.id]);

  // ========== REAL-TIME: Stream Conversation Updates ==========
  useEffect(() => {
    if (!authIdentifier || !authMode) return;

    const channelName = `conversations:${authMode}:${authIdentifier}`;

    // Clean up old channel if exists
    const oldChannel = realtimeChannelsRef.current.get(channelName);
    if (oldChannel) {
      supabase.removeChannel(oldChannel);
      realtimeChannelsRef.current.delete(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const conv = payload.new as Conversation;
            if (authMode === "user" && uid) {
              if (conv.participant_a === uid || conv.participant_b === uid) {
                setConversations((prev) => [conv, ...prev]);
              }
            } else if (authMode === "guest" && trackingToken) {
              if (conv.guest_tracking_token === trackingToken) {
                setConversations((prev) => [conv, ...prev]);
              }
            }
          } else if (payload.eventType === "UPDATE") {
            // Update existing conversation in list
            setConversations((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new : c))
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[CustomerMessages] Real-time subscribed to ${channelName}`);
        }
      });

    realtimeChannelsRef.current.set(channelName, channel);

    return () => {
      if (realtimeChannelsRef.current.has(channelName)) {
        supabase.removeChannel(channel);
        realtimeChannelsRef.current.delete(channelName);
      }
    };
  }, [uid, trackingToken, authMode, authIdentifier]);

  // ========== Get Other Participant Profile ==========
  const otherUserId = activeConv
    ? activeConv.participant_a === uid
      ? activeConv.participant_b
      : activeConv.participant_a
    : null;

  const otherProfile = otherUserId ? profiles[otherUserId] : null;

  // ========== Filter Conversations by Search ==========
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const otherId =
      c.participant_a === uid ? c.participant_b : c.participant_a;
    const otherProf = profiles[otherId];
    return (
      otherProf?.full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) || false ||
      c.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) || false
    );
  });

  // ========== Send Message Handler ==========
  const handleSendMessage = async () => {
    if (!draft.trim() || !activeConv || !authIdentifier) {
      console.warn("[CustomerMessages] Send message validation failed", {
        hasDraft: !!draft.trim(),
        hasConv: !!activeConv,
        hasAuth: !!authIdentifier,
      });
      return;
    }

    // For guests, use guest_[trackingToken] as sender_id
    const senderId = authMode === "user" ? uid : `guest_${trackingToken}`;
    const text = draft.trim();

    setSending(true);
    setDraft("");
    inputRef.current?.focus();

    try {
      console.debug(`[CustomerMessages] Sending message to conversation ${activeConv.id}`);
      const { error: insertError } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: activeConv.id,
          sender_id: senderId,
          content: text,
          message_type: "text",
        });

      if (insertError) {
        console.error("[CustomerMessages] Message insert error:", {
          message: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
          conversationId: activeConv.id,
          senderId: senderId.slice(0, 8) + "...",
        });
        toast.error(`Failed to send message: ${insertError.message || "Unknown error"}`);
        setDraft(text);
      } else {
        console.log("[CustomerMessages] Message sent successfully");
        // Update conversation's last_message
        const { error: updateError } = await (supabase as any)
          .from("conversations")
          .update({
            last_message: text,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", activeConv.id);

        if (updateError) {
          console.warn("[CustomerMessages] Conversation update warning:", {
            message: updateError.message,
            code: updateError.code,
          });
          // Don't show error to user - message was sent, just metadata update failed
        }
      }
    } catch (err: any) {
      console.error("[CustomerMessages] Exception sending message:", {
        message: err.message,
        stack: err.stack,
        conversationId: activeConv.id,
      });
      toast.error(`Failed to send message: ${err.message}`);
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <MessagingDebugPanel />
      <div className="min-h-screen bg-gradient-to-br from-[#FFFBF2] via-[#F9F6F0] to-[#F5F1ED]">
        <div className="max-w-6xl mx-auto h-full flex gap-4 p-4">
          {/* ========== CONVERSATIONS LIST PANEL ========== */}
          <div
            className={`${
              isMobile && activeConv ? "hidden" : "w-full md:w-80"
            } flex flex-col bg-white rounded-2xl shadow-lg border border-[#B37C1C]/10`}
          >
            {/* Search Bar */}
            <div className="p-4 border-b border-[#B37C1C]/10">
              <div className="flex items-center gap-2 bg-[#FFFBF2] rounded-lg px-3 py-2">
                <Search size={18} className="text-[#B37C1C]/60" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 text-sm"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              <div className="space-y-1 p-2">
                {loading ? (
                  <div className="p-8 text-center text-[#0F1A35]/40">
                    <p className="text-sm">Loading conversations...</p>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-[#0F1A35]/60 flex flex-col items-center gap-3">
                    <MessageSquare size={36} className="opacity-40" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const otherId =
                      conv.participant_a === uid
                        ? conv.participant_b
                        : conv.participant_a;
                    const profile = profiles[otherId];
                    const isActive = activeConv?.id === conv.id;

                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConv(conv)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isActive
                            ? "bg-[#B37C1C]/10 border border-[#B37C1C]/25"
                            : "hover:bg-[#FFFBF2] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarFallback className="bg-[#B37C1C]/10 text-[#B37C1C] font-bold text-xs">
                              {initials(profile?.full_name || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[#0F1A35] truncate">
                              {profile?.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-[#0F1A35]/60 truncate">
                              {conv.last_message || "Start a conversation"}
                            </p>
                          </div>
                          <p className="text-xs text-[#0F1A35]/40 whitespace-nowrap">
                            {formatTime(conv.last_message_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ========== CHAT PANEL ========== */}
          {activeConv ? (
            <div
              className={`${
                isMobile ? "w-full" : "flex-1"
              } flex flex-col bg-white rounded-2xl shadow-lg border border-[#B37C1C]/10`}
            >
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-[#B37C1C]/10 flex items-center justify-between bg-gradient-to-r from-[#FFFBF2] to-white">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <button
                      onClick={() => setActiveConv(null)}
                      className="p-2 hover:bg-[#FFFBF2] rounded-lg transition-colors"
                      title="Back to conversations"
                    >
                      <ArrowLeft size={20} className="text-[#0F1A35]" />
                    </button>
                  )}
                  <Avatar className="w-10 h-10 border border-[#B37C1C]/20">
                    <AvatarFallback className="bg-[#B37C1C]/10 text-[#B37C1C] font-bold text-sm">
                      {initials(otherProfile?.full_name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm text-[#0F1A35]">
                      {otherProfile?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-[#0F1A35]/60">
                      {otherProfile?.phone || "No phone"}
                    </p>
                  </div>
                </div>

                {/* WhatsApp Receipt Button with Transaction Token */}
                {otherProfile?.phone && activeConv?.context_order_id && (
                  <button
                    onClick={() => {
                      // RULE 3: Wire transaction verification token parameters securely
                      // Encode order tracking token and pass as URL query parameter
                      const orderTrackingToken = activeConv?.context_order_id?.toString() || "";
                      const message = encodeURIComponent(
                        `Hello Hive, send my receipt summary text for Token: ${orderTrackingToken}`
                      );
                      const phoneNumber = otherProfile.phone.replace(/\D/g, "");
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
                      window.open(whatsappUrl, "_blank");
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110 active:scale-95"
                    style={{ backgroundColor: "#25D366" }}
                    title="View WhatsApp Receipt"
                  >
                    <span className="text-lg">💬</span>
                  </button>
                )}
                {otherProfile?.phone && !activeConv?.context_order_id && (
                  <a
                    href={`https://wa.me/${otherProfile.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110"
                    style={{ backgroundColor: "#25D366" }}
                    title="Open on WhatsApp"
                  >
                    <span className="text-lg">💬</span>
                  </a>
                )}
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-3 max-w-2xl">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-[#0F1A35]/40">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.sender_id === uid || msg.sender_id === `guest_${trackingToken}`;
                      const isSystemAlert = msg.sender_id === dualState.SYSTEM_BOT_ID;

                      // System alerts render as centered neutral banners
                      if (isSystemAlert) {
                        return (
                          <div
                            key={msg.id}
                            className="flex justify-center py-3"
                          >
                            <div className="max-w-md px-4 py-3 rounded-lg bg-[#F0EDE6]/80 text-[#0F1A35]/70 border border-[#B37C1C]/15 italic text-center shadow-sm">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                              <p className="text-[10px] mt-2 text-[#0F1A35]/50">
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      // Peer-to-peer messages
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2.5 rounded-2xl shadow-sm ${
                              isOwn
                                ? "bg-[#B37C1C] text-[#FFFBF2] rounded-br-none"
                                : "bg-[#F0EDE6] text-[#0F1A35] rounded-bl-none border border-[#B37C1C]/10"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p
                              className={`text-[10px] mt-1 text-right ${
                                isOwn
                                  ? "text-[#FFFBF2]/70"
                                  : "text-[#0F1A35]/50"
                              }`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="px-4 py-3 border-t border-[#B37C1C]/10 bg-gradient-to-r from-[#FFFBF2] to-white flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                  className="flex-1 border-[#B37C1C]/20 focus-visible:ring-[#B37C1C]/40"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!draft.trim() || sending}
                  className="flex items-center justify-center w-10 h-10 rounded-lg transition-all disabled:opacity-40 hover:scale-105"
                  style={{
                    backgroundColor: draft.trim() && !sending ? "#B37C1C" : "#B37C1C",
                  }}
                  title="Send message"
                >
                  <Send size={18} color="#FFFBF2" />
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-2xl shadow-lg border border-[#B37C1C]/10">
              <div className="text-center text-[#0F1A35]/60 flex flex-col items-center gap-3">
                <MessageSquare size={48} className="opacity-30" />
                <p className="text-lg font-semibold">Select a conversation</p>
                <p className="text-sm">to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomerMessages;
