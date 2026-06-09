// Public-storefront Checkout Drawer.
// - Sleek bottom-sheet (mobile-first), Ivory + Gold design tokens.
// - Conditional form: Product (qty + address) vs Service (date + notes).
// - On submit: validate → INSERT into orders → success tick → wa.me handoff.

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Minus,
  Plus,
  Calendar,
  FileText,
  MapPin,
  User as UserIcon,
  Phone,
  Check,
  Loader2,
  ShoppingCart,
  CalendarCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  cleanZambianPhone,
  generateOtpCode,
} from "@/lib/whatsapp";
import { logCheckoutError, getUserFriendlyErrorMessage, serializeError } from "@/utils/errorUtils";
import AuthGateModal from "./modals/AuthGateModal";
import {
  sendOrderConfirmationReceipt,
  sendRetailerOrderNotification
} from "@/lib/systemMessaging";

export interface CheckoutItem {
  id: number;
  item_name: string;
  price: number;
  image_url?: string | null;
  store_name?: string | null;
  sme_id?: number | null;
  store_id?: number | null;
  store_whatsapp?: string | null;
  item_type?: string | null;          // "service" | "physical" | "digital" | …
  duration?: string | null;
  location_type?: string | null;
}

interface CheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CheckoutItem | null;
}

type SubmitState = "idle" | "submitting" | "success";

const isZambianPhone = (raw: string) => {
  const digits = raw.replace(/\D+/g, "");
  // Accept 0XXXXXXXXX (10), 9XXXXXXXX (9), or 260XXXXXXXXX (12)
  return /^(0\d{9}|260\d{9}|\d{9})$/.test(digits);
};

const CheckoutDrawer = ({ open, onOpenChange, item }: CheckoutDrawerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<SubmitState>("idle");
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [totalToPay, setTotalToPay] = useState<number>(0);

  const isService = item?.item_type === "service";

  // Reset form whenever the drawer opens for a new item
  useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
      setAddress("");
      setScheduledDate("");
      setServiceNotes("");
      setQuantity(1);
      setState("idle");
      setShowAuthGate(false);
      setGuestMode(false);
      setOrderId(null);
      setTrackingToken(null);
      setOtpCode(null);
      setTotalToPay(0);
    }
  }, [open, item?.id]);

  // Hard-lock the page while checkout is open so mobile scrolling and
  // rubber-banding can never reveal the storefront behind the overlay.
  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [open]);

  const totalAmount = useMemo(
    () => (item?.price ?? 0) * (isService ? 1 : quantity),
    [item?.price, isService, quantity]
  );

  const validate = (): string | null => {
    if (!name.trim()) return "Please enter your name.";
    if (name.trim().length > 80) return "Name is too long.";
    if (!phone.trim()) return "Please enter your phone number.";
    if (!isZambianPhone(phone)) return "Enter a valid Zambian phone number.";
    if (isService) {
      if (!scheduledDate) return "Pick a date for your booking.";
    } else {
      if (!address.trim()) return "Please enter a delivery address.";
      if (quantity < 1) return "Quantity must be at least 1.";
    }
    return null;
  };

  const handleSubmit = async () => {
    // Guard: Ensure item exists before proceeding
    if (!item || !item.id) {
      console.error("[checkout] item is null or missing id", item);
      toast.error("⚠️ Item data missing. Please close and reopen.");
      return;
    }

    // STEP 1: Input validation (client-side only - no business logic)
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    // Hard-block duplicate concurrent submissions
    if (state !== "idle") return;

    setState("submitting");

    try {
      const cleanedPhone = cleanZambianPhone(phone) || phone;

      // STEP 2A: Resolve customer actor UUID
      // For authenticated users: query actors table for customer actor record
      // For guests: call get_or_create_guest_actor RPC
      let customerActorId: string | null = null;

      if (user?.id) {
        // Authenticated user: find or create customer actor
        const { data: actorData, error: actorError } = await supabase
          .from("actors")
          .select("id")
          .eq("profile_id", user.id)
          .eq("type", "customer")
          .maybeSingle();

        if (actorError) {
          console.error("[Checkout] Error querying actors table:", actorError);
          toast.error("Failed to verify customer account. Please try again.");
          setState("idle");
          return;
        }

        if (actorData?.id) {
          customerActorId = actorData.id;
        } else {
          // No customer actor found for this profile; customer may need to be set up
          console.warn("[Checkout] No customer actor found for profile", { profileId: user.id });
          toast.error("Customer account setup incomplete. Please contact support.");
          setState("idle");
          return;
        }
      } else {
        // Guest user: call get_or_create_guest_actor RPC
        const { data: guestActorData, error: guestActorError } = await supabase.rpc(
          "get_or_create_guest_actor",
          {
            p_phone: cleanedPhone,
            p_display_name: name.trim(),
          }
        );

        if (guestActorError) {
          console.error("[Checkout] Error creating guest actor:", guestActorError);
          toast.error("Failed to set up guest checkout. Please try again.");
          setState("idle");
          return;
        }

        customerActorId = guestActorData;

        if (!customerActorId) {
          console.error("[Checkout] Guest actor RPC returned null");
          toast.error("Guest checkout setup failed. Please try again.");
          setState("idle");
          return;
        }
      }

      // STEP 2B: Invoke backend RPC with actor-based customer identification
      // The browser acts as sterile input terminal only
      const { data, error } = await supabase.rpc("secure_place_order", {
        p_customer_actor_id: customerActorId,                              // UUID: resolved actor
        p_item_id: parseInt(String(item.id), 10),                          // BIGINT: explicit int cast
        p_sme_id: item.sme_id ? parseInt(String(item.sme_id), 10) : null,  // BIGINT or null
        p_store_id: item.store_id
          ? parseInt(String(item.store_id), 10)
          : (item.sme_id ? parseInt(String(item.sme_id), 10) : null),     // BIGINT fallback to sme_id
        p_quantity: isService ? 1 : parseInt(String(quantity), 10),        // INT: explicit cast
        p_customer_name: name.trim(),                                      // TEXT: sterile string
        p_customer_phone: cleanedPhone,                                    // TEXT: sterile string
        p_delivery_address: isService ? null : address.trim(),             // TEXT or null
        p_scheduled_date: isService ? scheduledDate : null,                // DATE or null
        p_service_notes: isService ? serviceNotes : null,                  // TEXT or null
        p_item_type: item.item_type || "product",                          // TEXT: product|service
      });

      // STEP 3: Handle network/authentication errors from Supabase
      if (error) {
        logCheckoutError(error, {
          p_item_id: item.id,
          p_sme_id: item.sme_id,
          p_quantity: isService ? 1 : quantity,
        });

        // CRITICAL: Log full error details for debugging network issues
        console.error("[Checkout] RPC Error Details:", {
          message: error.message,
          code: error.code,
          status: (error as any).status,
          details: error.details,
          hint: error.hint,
          cause: (error as any).cause,
          timestamp: new Date().toISOString(),
          context: {
            hostname: window.location.hostname,
            builderPreview: window.location.hostname.includes("builder"),
          },
        });

        // Display server's sterile error message
        toast.error(`⚠️ ${error.message || "Order submission failed"}`);
        setState("idle");
        return;
      }

      // STEP 4: Parse RPC response (direct JSON object, not table array)
      // The RPC returns a single result object due to SECURITY DEFINER
      const result = data?.[0] || data;

      // Debug logging to diagnose response issues
      if (!result) {
        console.error("[Checkout] Empty RPC response", {
          rawData: data,
          dataArray: data?.[0],
          timestamp: new Date().toISOString(),
        });
      }

      if (!result || result.status !== "success") {
        const errorMsg = result?.message || "Order creation failed. Please try again.";

        // Enhanced error logging
        console.error("[Checkout] Order creation failed", {
          result,
          status: result?.status,
          message: result?.message,
          orderId: result?.order_id,
          rawResponse: data,
          timestamp: new Date().toISOString(),
        });

        toast.error(`⚠️ ${errorMsg}`);

        if (result?.status === "insufficient_stock") {
          toast.error("Not enough stock available. Please reduce quantity.");
        }
        setState("idle");
        return;
      }

      // STEP 5: Extract response payload (all computed server-side)
      const extractedOrderId = result.order_id;
      let extractedConversationId = result.conversation_id;  // INVARIANT #1: Atomic conversation creation
      const extractedTrackingToken = result.tracking_token;    // UUID for guest ledger access

      // Guard: Validate total_to_pay is a number
      const rawTotal = result?.total_to_pay ?? result?.totalAmount ?? 0;
      const extractedTotalToPay = typeof rawTotal === "number"
        ? rawTotal
        : parseFloat(String(rawTotal)) || 0;

      // Guard: Validate OTP code exists
      const extractedOtpCode = result.otp_code;                // 4-digit OTP for verification
      const safeOtpCode = extractedOtpCode ?? "----";

      // Guard: Verify orderId exists (INVARIANT #6)
      if (!extractedOrderId) {
        console.error("[Checkout] FATAL: orderId missing after checkout", {
          result,
          timestamp: new Date().toISOString(),
        });
        toast.error("⚠️ Order ID missing. Please contact support.");
        setState("idle");
        return;
      }

      // STEP 5B: Fetch conversation_id from orders table
      // The database trigger handle_order_created() automatically created the conversation
      // when the order was inserted. We just fetch the conversation_id from the order record.
      if (!extractedConversationId) {
        try {
          const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .select("conversation_id")
            .eq("id", extractedOrderId)
            .single();

          if (orderError) {
            console.warn("[Checkout] Error fetching order conversation_id:", orderError);
          } else if (orderData?.conversation_id) {
            extractedConversationId = orderData.conversation_id;
            console.log("[Checkout] Fetched conversation from order record", {
              orderId: extractedOrderId,
              conversationId: extractedConversationId,
            });
          } else {
            console.warn("[Checkout] Order conversation_id is null (trigger may not have executed yet)", {
              orderId: extractedOrderId,
            });
          }
        } catch (e) {
          console.warn("[Checkout] Exception fetching order conversation_id:", e);
        }
      }

      // If conversationId is still null, that's OK - the order succeeded.
      // The conversation will be accessible from My Orders.
      // Don't block the user or throw an error.
      if (extractedConversationId) {
        console.log("[Checkout] Order and conversation ready", {
          orderId: extractedOrderId,
          conversationId: extractedConversationId,
          trackingToken: extractedTrackingToken?.slice(0, 8) + "...",
          timestamp: new Date().toISOString(),
        });
      } else {
        console.warn("[Checkout] Order succeeded but conversation_id unavailable (will be in My Orders)", {
          orderId: extractedOrderId,
          timestamp: new Date().toISOString(),
        });
      }

      // Store in component state for persistence across renders
      setOrderId(extractedOrderId);
      setTrackingToken(extractedTrackingToken);
      setTotalToPay(extractedTotalToPay);
      setOtpCode(extractedOtpCode);

      // Auto-send customer intro message to vendor
      try {
        // Get the conversation_id from the order
        const { data: orderData } = await supabase
          .from('orders')
          .select('conversation_id, customer_actor_id, vendor_actor_id')
          .eq('id', extractedOrderId)
          .single();

        if (orderData?.conversation_id &&
            orderData?.customer_actor_id) {

          // Build the auto-message text
          const itemName = item?.item_name ||
                           item?.name ||
                           'your item';
          const autoMessage =
            `Hi! I just placed an order for ${itemName}` +
            ` (Order #${extractedOrderId}).` +
            ` Looking forward to receiving it! 🛒`;

          // Insert the auto-message as the customer
          await supabase
            .from('messages')
            .insert({
              conversation_id: orderData.conversation_id,
              sender_actor_id: orderData.customer_actor_id,
              content: autoMessage,
              created_at: new Date().toISOString()
            });
        }
      } catch (autoMsgError) {
        // Never block checkout for this
        console.warn('[Checkout] Auto-message failed:',
          autoMsgError);
      }

      // STEP 6: Secure guest continuity - persist tracking token to localStorage
      // Format: UNIFIED ARRAY ONLY for compatibility across all readers
      // [uuid1, uuid2, ...] - most recent is always at index 0
      if (!user?.id && extractedTrackingToken) {
        try {
          const stored = localStorage.getItem("hive_guest_active_cart");
          let tokens: string[] = [];

          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              // Normalize: handle object format (migration), array format, or string
              if (Array.isArray(parsed)) {
                tokens = parsed.filter((t) => typeof t === "string" && t.length >= 36);
              } else if (parsed?.trackingTokens && Array.isArray(parsed.trackingTokens)) {
                tokens = parsed.trackingTokens.filter((t: any) => typeof t === "string" && t.length >= 36);
              } else if (typeof parsed === "string" && parsed.length >= 36) {
                tokens = [parsed];
              }
            } catch {
              // Malformed JSON, start fresh
            }
          }

          // Add new token at front (most recent first)
          tokens = [extractedTrackingToken, ...tokens.filter((t) => t !== extractedTrackingToken)];

          // Keep only 10 most recent
          tokens = tokens.slice(0, 10);

          localStorage.setItem("hive_guest_active_cart", JSON.stringify(tokens));
          console.log("[Checkout] Guest tokens persisted (array format)", {
            tokenCount: tokens.length,
            mostRecent: extractedTrackingToken.slice(0, 8) + "...",
          });
        } catch (e) {
          console.warn("[Checkout] localStorage token persistence failed:", e);
          // Fallback: single token in array
          localStorage.setItem("hive_guest_active_cart", JSON.stringify([extractedTrackingToken]));
        }
      }

      // STEP 7: Update UI to success state
      setState("success");

      // STEP 7.5: ORCHESTRATION LAYER — Run all downstream messaging in parallel
      console.log("[Checkout] ORDER CREATED", {
        orderId: extractedOrderId,
        trackingToken: extractedTrackingToken,
        totalToPay: extractedTotalToPay,
        smeId: item.sme_id,
        storeId: item.store_id,
        customerName: name,
        isGuest: !user?.id,
        isService,
        timestamp: new Date().toISOString(),
      });

      // Prepare receipt details for customer
      const receiptDetails = `
Order #${extractedOrderId}
${item.item_name}
Quantity: ${isService ? "1 booking" : quantity}
Total: K${extractedTotalToPay.toFixed(2)}

${isService ? `Scheduled: ${scheduledDate}` : `Delivery to: ${address}`}

Your order is confirmed and will be processed shortly.
      `.trim();

      // Prepare vendor notification details
      const vendorNotificationDetails = `
📦 New Order Received
Order #${extractedOrderId}
Item: ${item.item_name}
Customer: ${name}
Phone: ${cleanedPhone}
Quantity: ${isService ? "1 booking" : quantity}
Total: K${extractedTotalToPay.toFixed(2)}
${isService ? `Scheduled: ${scheduledDate}` : `Delivery: ${address}`}
OTP: ${safeOtpCode}

Customer will contact you via WhatsApp or phone.
      `.trim();

      // STEP 7.5: Fire messaging tasks without blocking navigation
      // Database trigger handle_order_created() handles all post-order events:
      // - Conversation creation
      // - System message generation
      // - Vendor notifications
      // Frontend must NOT replicate this work
      const messagingPromises = [
        Promise.resolve(),  // Customer receipt (handled by trigger)
        Promise.resolve(),  // Vendor notification (handled by trigger)
        // 3. External webhook call (Make.com or equivalent)
        (async () => {
          try {
            const webhookUrl = import.meta.env.VITE_ORDER_WEBHOOK_URL;
            if (webhookUrl) {
              const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: extractedOrderId,
                  trackingToken: extractedTrackingToken,
                  customerId: user?.id || null,
                  customerName: name,
                  customerPhone: cleanedPhone,
                  itemName: item.item_name,
                  smeId: item.sme_id,
                  storeId: item.store_id,
                  totalAmount: extractedTotalToPay,
                  otpCode: safeOtpCode,
                  itemType: isService ? "service" : "product",
                  deliveryAddress: isService ? null : address,
                  scheduledDate: isService ? scheduledDate : null,
                  timestamp: new Date().toISOString(),
                }),
              });
              if (response.ok) {
                console.log("[Checkout] WEBHOOK SENT", { orderId: extractedOrderId, status: "success" });
              } else {
                console.warn("[Checkout] Webhook returned non-OK status:", response.status);
              }
            }
          } catch (err) {
            console.error("[Checkout] Webhook call failed:", err);
            // Don't throw - webhook failures are non-critical
          }
        })(),
      ];

      // Fire messaging tasks without blocking navigation
      Promise.allSettled(messagingPromises)
        .then(results => {
          const successCount = results.filter(r => r.status === "fulfilled").length;
          const failureCount = results.filter(r => r.status === "rejected").length;
          console.log("[Checkout] Messaging done", { successCount, failureCount });
        })
        .catch(err => console.error("[Checkout] Messaging error:", err));

      // STEP 8: Route to ledger immediately with order context
      // Ledger page handles both guest and authenticated users
      // Use query params to pass order context
      const ledgerUrl = `/ledger?orderId=${extractedOrderId}&trackingToken=${extractedTrackingToken}`;

      // INSTANT redirect - no delays, no intermediate UI
      navigate(ledgerUrl, { replace: true });
      onOpenChange(false);

    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || "Unknown error";
      const errorStack = err?.stack || "No stack trace";
      console.error("[checkout] FULL ERROR DETAILS:", {
        message: errorMessage,
        stack: errorStack,
        type: typeof err,
        raw: err
      });
      toast.error(`⚠️ Debug: ${errorMessage}`);
      setState("idle");
    }
  };

  const submitting = state === "submitting";
  const success = state === "success";

  if (typeof document === "undefined" || !item) return null;

  return (
    <>
      <AuthGateModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        onContinueAsGuest={() => setGuestMode(true)}
        onSignIn={() => navigate("/login")}
        title="Continue to Order"
        description="Please choose how you'd like to proceed"
      />

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: "6%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="fixed inset-0 z-[200] overflow-hidden bg-background"
            >
              <div className="absolute inset-0 bg-background" />

              <div className="relative flex h-full flex-col bg-background">
            <div className="shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
              <div className="mx-auto max-w-lg px-5 pb-4 pt-3">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {isService ? "Book a service" : "Quick checkout"}
                    </p>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {isService ? "Book Order" : "Buy Now"}
                    </h3>
                  </div>
                  <button
                    onClick={() => !submitting && !success && onOpenChange(false)}
                    disabled={submitting || success}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-40"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto w-full max-w-lg px-5 py-4">
                <div className="mb-5 flex gap-3 rounded-2xl border border-border bg-secondary/40 p-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{isService ? "📅" : "🛍️"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.item_name}
                    </p>
                    {item.store_name && (
                      <p className="truncate text-xs text-muted-foreground">{item.store_name}</p>
                    )}
                    <p className="mt-1 text-lg font-bold text-primary">
                      {isService && "From "}ZMW {Number(item.price ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pb-6">
                  <Field
                    icon={<UserIcon size={13} />}
                    label="Full Name"
                    value={name}
                    onChange={setName}
                    placeholder="e.g. Bwalya Mulenga"
                    disabled={submitting || success}
                    maxLength={80}
                  />
                  <Field
                    icon={<Phone size={13} />}
                    label="Phone Number"
                    value={phone}
                    onChange={setPhone}
                    placeholder="0977 123 456"
                    disabled={submitting || success}
                    inputMode="tel"
                    maxLength={20}
                  />

                  {isService ? (
                    <>
                      <Field
                        icon={<Calendar size={13} />}
                        label="Booking Date"
                        type="date"
                        value={scheduledDate}
                        onChange={setScheduledDate}
                        disabled={submitting || success}
                        min={new Date().toISOString().split("T")[0]}
                      />
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <FileText size={13} /> Service Notes
                        </label>
                        <textarea
                          value={serviceNotes}
                          onChange={(e) => setServiceNotes(e.target.value)}
                          rows={2}
                          maxLength={500}
                          disabled={submitting || success}
                          placeholder="Anything the provider should know…"
                          className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <MapPin size={13} /> Delivery Address
                        </label>
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                          maxLength={250}
                          disabled={submitting || success}
                          placeholder="Plot, street, suburb, city"
                          className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
                        <span className="text-sm font-medium text-foreground">Quantity</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={submitting || success}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-40"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-foreground">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                            disabled={submitting || success}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary disabled:opacity-40"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
              <div className="mx-auto max-w-lg px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <span className="font-display text-2xl font-bold text-primary">
                    ZMW {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-gold mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Placing order…
                    </>
                  ) : isService ? (
                    <>
                      <CalendarCheck size={16} /> Confirm Booking
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} /> Place Order
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                  After confirming we'll open WhatsApp so you can finalise with the store.
                </p>
              </div>
            </div>
          </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  inputMode?: "tel" | "text" | "email" | "numeric";
  maxLength?: number;
  min?: string;
}

const Field = ({
  icon,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  inputMode,
  maxLength,
  min,
}: FieldProps) => (
  <div>
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
      {icon} {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      maxLength={maxLength}
      min={min}
      className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
    />
  </div>
);

export default CheckoutDrawer;
