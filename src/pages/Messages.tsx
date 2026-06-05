import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Paperclip, Send, Search, MessageSquare, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDualStateMessaging } from "@/hooks/useDualStateMessaging";
import RetailerStudioSidebar from "@/components/RetailerStudioSidebar";
import hiveLogo from "@/assets/hive-logo.jpeg"
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SystemMessage from "@/components/messaging/SystemMessage";
import OrderStateOverlay from "@/components/messaging/OrderStateOverlay";
import AttachProductModal from "@/components/messaging/AttachProductModal";

// ---------- Types ----------

interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message: string | null;
  last_message_at: string | null;
  context_order_id: number | null;
  context_item_id: number | null;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  product_data: Record<string, any> | null;
  created_at: string;
  channel?: string;
}

interface ProfileSummary {
  user_id: string;
  full_name: string | null;
  phone: string | null;
}

// ---------- Helpers ----------

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

// ---------- Component ----------

const SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000000";

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const {
    context,
    loadConversations: dualLoadConversations,
    loadMessages: dualLoadMessages,
    subscribeToMessages: dualSubscribeToMessages
  } = useDualStateMessaging();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [orderState, setOrderState] = useState<"waiting" | "success" | "dispatch" | null>(null);
  const [sharingOrder, setSharingOrder] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = user?.id;

  // ---- Fetch conversations using dual-state logic ----
  const loadConversations = useCallback(async () => {
    if (!context.authMode || !context.authIdentifier) {
      console.debug("[Messages] No auth context yet");
      return;
    }
    const result = await dualLoadConversations();
    if (result.success) {
      setConversations(result.conversations);
      console.log("[Messages] Loaded", result.conversations.length, "conversations");
    }
  }, [context.authMode, context.authIdentifier, dualLoadConversations]);

  // Load conversations on mount, then auto-select conversation from ?c= parameter
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-select conversation from URL parameter (?c=conversationId)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const convId = params.get("c");

    if (convId && conversations.length > 0) {
      const matchingConv = conversations.find((c) => c.id === convId);
      if (matchingConv && matchingConv.id !== activeConv?.id) {
        console.log("[Messages] Auto-selecting conversation from URL", {
          conversationId: convId.slice(0, 8) + "...",
        });
        setActiveConv(matchingConv);
      }
    }
  }, [location.search, conversations, activeConv]);

  // ---- Resolve profiles (only for authenticated users) ----
  useEffect(() => {
    if (!conversations.length || !uid || context.authMode === "guest") return;
    const ids = new Set<string>();
    conversations.forEach((c) => {
      if (c.participant_a) ids.add(c.participant_a);
      if (c.participant_b) ids.add(c.participant_b);
    });
    ids.delete(uid);
    const missing = [...ids].filter((id) => !profiles[id]);
    if (!missing.length) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles").select("user_id, full_name, phone").in("user_id", missing);
      if (data) {
        const map: Record<string, ProfileSummary> = { ...profiles };
        (data as ProfileSummary[]).forEach((p) => (map[p.user_id] = p));
        setProfiles(map);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, uid, context.authMode]);

  // ---- Fetch messages using dual-state logic ----
  useEffect(() => {
    if (!activeConv) return;
    (async () => {
      const result = await dualLoadMessages(activeConv.id);
      if (result.success) {
        setMessages(result.messages);
        console.log("[Messages] Loaded", result.messages.length, "messages");
      }
    })();
  }, [activeConv, dualLoadMessages]);

  // ---- Real-time: messages using dual-state subscription ----
  useEffect(() => {
    if (!activeConv) return;

    const channel = dualSubscribeToMessages(activeConv.id, (newMsg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
      );
      // Auto-scroll to new message
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeConv, dualSubscribeToMessages]);

  // ---- Real-time: conversations list (handles both user and guest modes) ----
  useEffect(() => {
    // Only subscribe if we have auth context
    if (!context.authIdentifier || !context.authMode) return;

    const channel = supabase
      .channel("conversations-list-realtime")
      .on("postgres_changes" as any, {
        event: "*",
        schema: "public",
        table: "conversations",
      }, () => {
        console.log("[Messages] Conversation list changed, reloading");
        loadConversations();
      })
      .subscribe((status) => {
        console.log("[Messages] Conversations realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [context.authIdentifier, context.authMode, loadConversations]);

  // ---- Auto-scroll ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Send message ----
  const handleSend = async () => {
    if (!draft.trim() || !activeConv || !uid || sending) return;

    // INVARIANT #2, #3: Enforce conversation_id validation
    if (!activeConv.id || activeConv.id.trim() === "") {
      console.error("[Messages] INVARIANT VIOLATION: activeConv.id is missing or empty", {
        activeConv,
        uid,
        timestamp: new Date().toISOString(),
      });
      toast.error("Cannot send message: conversation is invalid");
      return;
    }

    setSending(true);
    const text = draft.trim();
    setDraft("");

    try {
      console.log("[Messages] INVARIANT #3: Inserting message with conversation_id", {
        conversationId: activeConv.id,
        senderId: uid,
        messageType: "text",
        contentLength: text.length,
        timestamp: new Date().toISOString(),
      });

      const { error: insertError } = await (supabase as any)
        .from("messages")
        .insert({
          conversation_id: activeConv.id,
          sender_id: uid,
          content: text,
          message_type: "text",
        });

      if (insertError) {
        console.error("[Messages] CRITICAL: Message insert failed", {
          error: insertError,
          conversationId: activeConv.id,
          messageType: "text",
        });
        toast.error("Failed to send message");
        setSending(false);
        return;
      }

      console.log("[Messages] ✓ INVARIANT #3 SATISFIED: Message inserted", {
        conversationId: activeConv.id,
      });

      await (supabase as any)
        .from("conversations")
        .update({ last_message: text, last_message_at: new Date().toISOString() })
        .eq("id", activeConv.id);

      inputRef.current?.focus();
    } catch (err) {
      console.error("[Messages] EXCEPTION sending message:", {
        error: err,
        conversationId: activeConv.id,
        errorString: String(err),
      });
      toast.error("Error sending message");
    } finally {
      setSending(false);
    }
  };

  // ---- Attach product handler ----
  const handleAttachProduct = async (product: { id: number; product_name: string | null; price: number | null; image_url: string | null }) => {
    if (!activeConv || !uid) return;

    // INVARIANT #2, #3: Enforce conversation_id validation
    if (!activeConv.id || activeConv.id.trim() === "") {
      console.error("[Messages] INVARIANT VIOLATION: activeConv.id is missing for product attach", {
        activeConv,
        product,
      });
      toast.error("Cannot attach product: conversation is invalid");
      return;
    }

    const productData = {
      product_id: product.id,
      product_name: product.product_name,
      price: product.price,
      image_url: product.image_url,
    };

    console.log("[Messages] INVARIANT #3: Inserting product message with conversation_id", {
      conversationId: activeConv.id,
      senderId: uid,
      messageType: "product",
      productId: product.id,
      timestamp: new Date().toISOString(),
    });

    const { error: insertError } = await (supabase as any)
      .from("messages")
      .insert({
        conversation_id: activeConv.id,
        sender_id: uid,
        content: null,
        message_type: "product",
        product_data: productData,
      });

    if (insertError) {
      console.error("[Messages] CRITICAL: Product message insert failed", {
        error: insertError,
        conversationId: activeConv.id,
        messageType: "product",
      });
      toast.error("Failed to attach product");
      return;
    }

    console.log("[Messages] ✓ INVARIANT #3 SATISFIED: Product message inserted", {
      conversationId: activeConv.id,
    });

    const preview = `🛍️ ${product.product_name || "Product"}`;
    await (supabase as any)
      .from("conversations")
      .update({ last_message: preview, last_message_at: new Date().toISOString() })
      .eq("id", activeConv.id);
  };

  // ---- Derived ----
  const getOtherProfile = (conv: Conversation): ProfileSummary | undefined => {
    if (!uid) return undefined;
    const otherId = conv.participant_a === uid ? conv.participant_b : conv.participant_a;
    return profiles[otherId];
  };

  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true;
    const p = getOtherProfile(c);
    return p?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last_message?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // ---- INBOX PANEL ----
  const InboxPanel = () => (
    <div className="flex flex-col h-full bg-card/80 backdrop-blur-xl">
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <img src={hiveLogo} alt="The Hive" className="w-8 h-8 rounded-full object-cover border border-primary/20" />
          <h1 className="font-display font-bold text-foreground text-lg">Messages</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search conversations…" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-secondary/60 border-border/40 text-sm" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
            <MessageSquare size={40} className="opacity-40" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const other = getOtherProfile(conv);
            const isSelected = activeConv?.id === conv.id;
            return (
              <button key={conv.id} onClick={() => setActiveConv(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/30 transition-colors text-left ${
                  isSelected ? "bg-primary/8" : "hover:bg-secondary/50"}`}>
                <Avatar className="h-11 w-11 shrink-0 border border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {initials(other?.full_name ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground truncate">{other?.full_name || "Unknown"}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.last_message || "Start a conversation"}
                  </p>
                  <div className="flex gap-1.5 mt-1">
                    {conv.context_order_id && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-0"
                        style={{ backgroundColor: "#0F1A35", color: "#FFFBF2" }}>
                        📦 Order #{conv.context_order_id}
                      </Badge>
                    )}
                    {conv.context_item_id && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-0"
                        style={{ backgroundColor: "#B37C1C", color: "#FFFBF2" }}>
                        🛍️ Product Inquiry
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );

  // ---- CHAT PANEL ----
  const ChatPanel = () => {
    if (!activeConv) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-secondary/20 text-muted-foreground gap-3">
          <MessageSquare size={56} className="opacity-30" />
          <p className="text-base font-medium">Select a conversation</p>
          <p className="text-xs">Choose from the inbox to start chatting</p>
        </div>
      );
    }

    const other = getOtherProfile(activeConv);

    return (
      <div className="flex-1 flex flex-col h-full bg-background/60 relative">
        {/* Order state overlay */}
        <OrderStateOverlay state={orderState} />

        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm">
          {isMobile && (
            <button onClick={() => setActiveConv(null)} className="p-1.5 rounded-lg hover:bg-secondary text-foreground mr-1">
              <ArrowLeft size={20} />
            </button>
          )}
          <Avatar className="h-10 w-10 border border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {initials(other?.full_name ?? null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{other?.full_name || "Unknown"}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <p className="text-[10px] text-muted-foreground">Online</p>
            </div>
          </div>
          {other?.phone && (
            <a href={`tel:${other.phone}`}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
              style={{ backgroundColor: "#B37C1C" }}>
              <Phone size={18} color="#FFFBF2" />
            </a>
          )}
        </div>

        {/* Messages body */}
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-2 max-w-2xl mx-auto">
            {messages.length === 0 && (
              <div className="h-64 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MessageSquare className="mx-auto mb-3 opacity-30" size={40} />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs opacity-70 mt-1">Your order activity will appear here</p>
                </div>
              </div>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_id === uid;
              const isSystemMessage = msg.sender_id === SYSTEM_BOT_ID || msg.message_type === "system" || msg.message_type === "system_receipt" || msg.message_type === "retailer_notification";

              // System / bot message
              if (isSystemMessage) {
                return <SystemMessage key={msg.id} content={msg.content || ""} />;
              }

              // Product card
              if (msg.message_type === "product" && msg.product_data) {
                const pd = msg.product_data;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className="rounded-2xl overflow-hidden border border-border/40 max-w-[260px] shadow-sm"
                      style={{ backgroundColor: isMine ? "#B37C1C" : "#FFFFFF" }}>
                      {pd.image_url && (
                        <img src={pd.image_url as string} alt="" className="w-full h-32 object-cover" />
                      )}
                      <div className="p-3">
                        <p className="font-semibold text-sm"
                          style={{ color: isMine ? "#FFFBF2" : "#0F1A35" }}>
                          {pd.product_name as string}
                        </p>
                        <p className="text-xs mt-0.5"
                          style={{ color: isMine ? "rgba(255,251,242,0.8)" : "rgba(15,26,53,0.6)" }}>
                          K{pd.price as number}
                        </p>
                        <button className="mt-2 w-full text-xs font-bold py-1.5 rounded-lg"
                          style={{
                            backgroundColor: isMine ? "#FFFBF2" : "#B37C1C",
                            color: isMine ? "#B37C1C" : "#FFFBF2",
                          }}>
                          ⚡ View Item
                        </button>
                      </div>
                      <div className="px-3 pb-1.5 text-right">
                        <span className="text-[9px]"
                          style={{ color: isMine ? "rgba(255,251,242,0.6)" : "rgba(15,26,53,0.4)" }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Text bubble
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm"
                    style={{
                      backgroundColor: isMine ? "#B37C1C" : "#FFFFFF",
                      color: isMine ? "#FFFBF2" : "#0F1A35",
                      borderBottomRightRadius: isMine ? 4 : 16,
                      borderBottomLeftRadius: isMine ? 16 : 4,
                    }}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[9px] mt-1 text-right" style={{ opacity: 0.6 }}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-border bg-card/90 backdrop-blur-sm px-3 py-3">
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            <button onClick={() => setAttachOpen(true)}
              className="p-2.5 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
              title="Attach Product">
              <Paperclip size={20} />
            </button>
            <Input ref={inputRef} placeholder="Type a message…" value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              className="flex-1 bg-secondary/50 border-border/40 text-sm" />
            <button onClick={handleSend} disabled={!draft.trim() || sending}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-all disabled:opacity-40"
              style={{ backgroundColor: "#B37C1C" }}>
              <Send size={18} color="#FFFBF2" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ---- Mobile: list or chat ----
  if (isMobile) {
    return (
      <RetailerStudioSidebar>
        <div className="h-screen flex flex-col relative">
        <AnimatePresence mode="wait">
          {activeConv ? (
            <motion.div key="chat" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-0 z-20 flex flex-col">
              <ChatPanel />
            </motion.div>
          ) : (
            <motion.div key="inbox" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-0 z-10 flex flex-col">
              <InboxPanel />
            </motion.div>
          )}
        </AnimatePresence>
        <AttachProductModal open={attachOpen} onClose={() => setAttachOpen(false)} onSelect={handleAttachProduct} />
        </div>
      </RetailerStudioSidebar>
    );
  }

  // ---- Check if being rendered inside customer dashboard ----
  const isInsideDashboard = location.pathname.includes("customer-dash");

  // ---- Desktop: two-panel ----
  const content = (
    <div className="h-screen flex relative">
      <div className="relative z-10 w-[360px] shrink-0 border-r border-border flex flex-col">
        <InboxPanel />
      </div>
      <div className="relative z-10 flex-1 flex flex-col">
        <ChatPanel />
      </div>
      <AttachProductModal open={attachOpen} onClose={() => setAttachOpen(false)} onSelect={handleAttachProduct} />
    </div>
  );

  // If inside dashboard, don't wrap in RetailerStudioSidebar
  if (isInsideDashboard) {
    return content;
  }

  return (
    <RetailerStudioSidebar>
      {content}
    </RetailerStudioSidebar>
  );
};

export default Messages;
