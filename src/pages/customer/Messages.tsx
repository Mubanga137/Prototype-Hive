import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Send, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGuestTracking } from "@/hooks/useGuestTracking";
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
  const isMobile = useIsMobile();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const uid = user?.id;
  const isAuthenticated = !!uid;
  const authIdentifier = isAuthenticated ? uid : trackingToken;
  const authMode: "user" | "guest" = isAuthenticated ? "user" : "guest";

  const loadConversations = useCallback(async () => {
    if (isAuthenticated && !uid) return;
    if (!isAuthenticated && !trackingToken) return;

    let query = (supabase as any).from("conversations").select("*");

    if (isAuthenticated) {
      // For auth users: fetch conversations where they are a participant
      query = query.or(`participant_a.eq.${uid},participant_b.eq.${uid}`);
    } else {
      // For guests: fetch conversations with their tracking token
      query = query.eq("guest_tracking_token", trackingToken);
    }

    const { data, error } = await query.order("last_message_at", { ascending: false });
    if (data) setConversations(data as Conversation[]);
    if (error) console.log("Load conversations:", error);
  }, [uid, trackingToken, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && uid) loadConversations();
    if (!isAuthenticated && trackingToken) loadConversations();
  }, [uid, trackingToken, isAuthenticated, loadConversations]);

  const loadMessagesForConversation = useCallback(async (convId: string) => {
    const { data, error } = await (supabase as any)
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    if (error) console.log("Load messages:", error);
  }, []);

  const loadProfiles = useCallback(async () => {
    if (conversations.length === 0) return;
    const allUserIds = new Set<string>();
    conversations.forEach((c) => {
      allUserIds.add(c.participant_a);
      allUserIds.add(c.participant_b);
    });
    const userIds = Array.from(allUserIds);
    if (userIds.length === 0) return;

    const { data } = await (supabase as any)
      .from("user_profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    if (data) {
      const profileMap = data.reduce(
        (acc: Record<string, ProfileSummary>, p: ProfileSummary) => {
          acc[p.user_id] = p;
          return acc;
        },
        {}
      );
      setProfiles(profileMap);
    }
  }, [conversations]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (activeConv) loadMessagesForConversation(activeConv.id);
  }, [activeConv, loadMessagesForConversation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!authIdentifier || !authMode) return;

    const channelName = `messages_${authMode}_${authIdentifier}`;
    const channel = (supabase as any)
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          if (activeConv && payload.new.conversation_id === activeConv.id) {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload: any) => {
          const conv = payload.new as Conversation;
          if (authMode === "user") {
            if (conv.participant_a === uid || conv.participant_b === uid) {
              setConversations((prev) => [conv, ...prev]);
            }
          } else {
            if (conv.guest_tracking_token === trackingToken) {
              setConversations((prev) => [conv, ...prev]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [uid, trackingToken, authMode, authIdentifier, activeConv]);

  const otherUserId = activeConv
    ? activeConv.participant_a === uid
      ? activeConv.participant_b
      : activeConv.participant_a
    : null;

  const otherProfile = otherUserId ? profiles[otherUserId] : null;

  const filteredConversations = conversations.filter((c) =>
    otherProfile
      ? profiles[c.participant_a === uid ? c.participant_b : c.participant_a]?.full_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) || false
      : true
  );

  const handleSendMessage = async () => {
    if (!draft.trim() || !activeConv || !authIdentifier) return;

    // For guests, use a system-generated UUID as sender_id
    const senderId = authMode === "user" ? uid : `guest_${trackingToken}`;

    setSending(true);
    const { error } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: activeConv.id,
        sender_id: senderId,
        content: draft,
        message_type: "text",
      });
    if (error) {
      toast.error("Failed to send message");
    } else {
      setDraft("");
      loadMessagesForConversation(activeConv.id);
    }
    setSending(false);
  };

  return (
    <>
      <MessagingDebugPanel />
      <div className="min-h-screen bg-gradient-to-br from-[#FFFBF2] via-[#F9F6F0] to-[#F5F1ED]">
      <div className="max-w-6xl mx-auto h-full flex gap-4 p-4">
        {/* Conversations List */}
        <div
          className={`${
            isMobile && activeConv ? "hidden" : "w-full md:w-80"
          } flex flex-col bg-white rounded-2xl shadow-lg border border-[#B37C1C]/10`}
        >
          {/* Search */}
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

          {/* Conversations */}
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-[#0F1A35]/60">
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other =
                    conv.participant_a === uid
                      ? conv.participant_b
                      : conv.participant_a;
                  const profile = profiles[other];
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
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-[#B37C1C]/10 text-[#B37C1C] font-bold">
                            {initials(profile?.full_name || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#0F1A35] truncate">
                            {profile?.full_name || "Unknown"}
                          </p>
                          <p className="text-xs text-[#0F1A35]/60 truncate">
                            {conv.last_message || "No messages"}
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

        {/* Chat Area */}
        {activeConv ? (
          <div
            className={`${
              isMobile ? "w-full" : "flex-1"
            } flex flex-col bg-white rounded-2xl shadow-lg border border-[#B37C1C]/10`}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#B37C1C]/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <button
                    onClick={() => setActiveConv(null)}
                    className="p-2 hover:bg-[#FFFBF2] rounded-lg"
                  >
                    <ArrowLeft size={20} className="text-[#0F1A35]" />
                  </button>
                )}
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-[#B37C1C]/10 text-[#B37C1C] font-bold">
                    {initials(otherProfile?.full_name || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-[#0F1A35]">
                    {otherProfile?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-[#0F1A35]/60">
                    {otherProfile?.phone || "No phone"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          isOwn
                            ? "bg-[#B37C1C] text-white rounded-br-none"
                            : "bg-[#FFFBF2] text-[#0F1A35] rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? "text-white/70" : "text-[#0F1A35]/60"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-[#B37C1C]/10 flex gap-2">
              <Input
                ref={React.useRef(null)}
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1"
              />
              <button
                onClick={handleSendMessage}
                disabled={!draft.trim() || sending}
                className="p-3 bg-[#B37C1C] text-white rounded-lg hover:bg-[#9b6816] disabled:opacity-50 transition"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-2xl shadow-lg border border-[#B37C1C]/10">
            <div className="text-center text-[#0F1A35]/60">
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
