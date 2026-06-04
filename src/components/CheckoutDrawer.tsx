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

      // STEP 2: Invoke backend RPC with strict parameter type-casting
      // The browser acts as sterile input terminal only
      const { data, error } = await supabase.rpc("secure_place_order", {
        p_buyer_id: user?.id || null,                                      // UUID or null for guests
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
      const orderId = result.order_id;
      const trackingToken = result.tracking_token;  // UUID for guest ledger access
      const totalToPay = result.total_to_pay;      // NUMERIC: server-computed price
      const otpCode = result.otp_code;             // 4-digit OTP for verification

      // STEP 6: Secure guest continuity - persist tracking token to localStorage
      // Format: UNIFIED ARRAY ONLY for compatibility across all readers
      // [uuid1, uuid2, ...] - most recent is always at index 0
      if (!user?.id) {
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
          tokens = [trackingToken, ...tokens.filter((t) => t !== trackingToken)];

          // Keep only 10 most recent
          tokens = tokens.slice(0, 10);

          localStorage.setItem("hive_guest_active_cart", JSON.stringify(tokens));
          console.log("[Checkout] Guest tokens persisted (array format)", {
            tokenCount: tokens.length,
            mostRecent: trackingToken.slice(0, 8) + "...",
          });
        } catch (e) {
          console.warn("[Checkout] localStorage token persistence failed:", e);
          // Fallback: single token in array
          localStorage.setItem("hive_guest_active_cart", JSON.stringify([trackingToken]));
        }
      }

      // STEP 7: Update UI to success state
      setState("success");

      // STEP 7.5: ORCHESTRATION LAYER — Run all downstream messaging in parallel
      console.log("[Checkout] ORDER CREATED", {
        orderId,
        trackingToken,
        totalToPay,
        smeId: item.sme_id,
        storeId: item.store_id,
        customerName: name,
        isGuest: !user?.id,
        isService,
        timestamp: new Date().toISOString(),
      });

      // Prepare receipt details for customer
      const receiptDetails = `
Order #${orderId}
${item.item_name}
Quantity: ${isService ? "1 booking" : quantity}
Total: K${totalToPay.toFixed(2)}

${isService ? `Scheduled: ${scheduledDate}` : `Delivery to: ${address}`}

Your order is confirmed and will be processed shortly.
      `.trim();

      // Prepare vendor notification details
      const vendorNotificationDetails = `
📦 New Order Received
Order #${orderId}
Item: ${item.item_name}
Customer: ${name}
Phone: ${cleanedPhone}
Quantity: ${isService ? "1 booking" : quantity}
Total: K${totalToPay.toFixed(2)}
${isService ? `Scheduled: ${scheduledDate}` : `Delivery: ${address}`}
OTP: ${otpCode}

Customer will contact you via WhatsApp or phone.
      `.trim();

      // Run all messaging operations in parallel with Promise.allSettled
      const messagingPromises = [
        // 1. Customer receipt (always)
        (async () => {
          try {
            await sendOrderConfirmationReceipt(
              user?.id || orderId.toString(),
              orderId,
              receiptDetails,
              !user?.id,  // isGuest
              trackingToken  // guestToken (only used if guest)
            );
            console.log("[Checkout] CUSTOMER MESSAGE SENT", { orderId, recipientType: user?.id ? "authenticated" : "guest" });
          } catch (err) {
            console.error("[Checkout] Customer message failed:", err);
            throw err;
          }
        })(),

        // 2. Vendor notification (for products/services with store)
        (async () => {
          if (item.sme_id || item.store_id) {
            try {
              // CRITICAL FIX: Get the actual vendor/owner user ID from sme_stores
              // NOT the customer's user ID
              const storeId = item.store_id || item.sme_id;
              const { data: storeData } = await supabase
                .from("sme_stores")
                .select("owner_user_id")
                .eq("id", storeId)
                .maybeSingle();

              const vendorUserId = storeData?.owner_user_id || null;

              if (vendorUserId) {
                await sendRetailerOrderNotification(
                  vendorUserId,
                  orderId,
                  vendorNotificationDetails
                );
                console.log("[Checkout] VENDOR MESSAGE SENT", {
                  orderId,
                  vendorUserId,
                  smeId: item.sme_id,
                  storeId: item.store_id,
                });
              } else {
                console.warn("[Checkout] No vendor user ID found for order", {
                  orderId,
                  storeId,
                  smeId: item.sme_id,
                });
              }
            } catch (err) {
              console.error("[Checkout] Vendor notification failed:", err);
              throw err;
            }
          }
        })(),

        // 3. External webhook call (Make.com or equivalent)
        (async () => {
          try {
            const webhookUrl = import.meta.env.VITE_ORDER_WEBHOOK_URL;
            if (webhookUrl) {
              const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId,
                  trackingToken,
                  customerId: user?.id || null,
                  customerName: name,
                  customerPhone: cleanedPhone,
                  itemName: item.item_name,
                  smeId: item.sme_id,
                  storeId: item.store_id,
                  totalAmount: totalToPay,
                  otpCode,
                  itemType: isService ? "service" : "product",
                  deliveryAddress: isService ? null : address,
                  scheduledDate: isService ? scheduledDate : null,
                  timestamp: new Date().toISOString(),
                }),
              });
              if (response.ok) {
                console.log("[Checkout] WEBHOOK SENT", { orderId, status: "success" });
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

      // Execute all messaging in parallel, don't let one failure block others
      const results = await Promise.allSettled(messagingPromises);

      const successCount = results.filter(r => r.status === "fulfilled").length;
      const failureCount = results.filter(r => r.status === "rejected").length;

      console.log("[Checkout] MESSAGING ORCHESTRATION COMPLETE", {
        orderId,
        successCount,
        failureCount,
        results: results.map((r, i) => ({
          index: i,
          status: r.status,
          reason: r.status === "rejected" ? String(r.reason) : undefined,
        })),
      });

      // STEP 8a: Route service bookings to messages/communications channel
      if (isService) {
        toast.success("✅ Funds Secured in Escrow. Notifying your Service Provider!", {
          action: {
            label: "View Booking",
            onClick: () => window.location.href = "/messages"
          }
        });

        // Auto-redirect after brief delay for UX feedback
        setTimeout(() => {
          window.location.href = "/messages";
        }, 2000);
        return;
      }

      // STEP 8b: Route product orders - guests go to ledger, authenticated users to dashboard
      if (!user?.id) {
        // Guest user: redirect to secure parameterless ledger (token already in localStorage)
        setTimeout(() => {
          navigate("/ledger", { replace: true });
          onOpenChange(false);
        }, 1500);
        return;
      }

      // Authenticated user: show success and redirect to orders dashboard
      toast.success("✅ Funds Secured in Escrow. Notifying your Vendor!", {
        action: {
          label: "Track Order",
          onClick: () => window.location.href = "/track-orders"
        }
      });

      setTimeout(() => {
        navigate("/track-orders", { replace: true });
        onOpenChange(false);
      }, 2000);

    } catch (err) {
      console.error("[checkout] Unexpected error:", err);
      toast.error("⚠️ An unexpected error occurred. Please try again.");
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
                {success && (
                  <div className="mt-8 flex flex-col items-center justify-center gap-6 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl"
                    >
                      ✅
                    </motion.div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-foreground">Order Confirmed!</h2>
                      <p className="text-muted-foreground text-sm">
                        Your order has been placed successfully and is being processed.
                      </p>
                    </div>

                    <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 text-left space-y-2">
                      <p className="text-sm"><strong>Order ID:</strong> #{orderId}</p>
                      <p className="text-sm"><strong>Item:</strong> {item.item_name}</p>
                      <p className="text-sm"><strong>Total:</strong> ZMW {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      {otpCode && <p className="text-sm"><strong>OTP Code:</strong> {otpCode}</p>}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {isService
                        ? "Service provider will confirm your booking shortly."
                        : "Vendor is preparing your order."}
                    </p>
                  </div>
                )}
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

                {!success && (
                <>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || success}
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
                </>
                )}

                {success && (
                <>
                <a
                  href="/messages"
                  className="btn-gold mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-sm"
                >
                  🟢 VIEW RECEIPT
                </a>

                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                  Your order receipt and vendor notifications have been sent.
                </p>
                </>
                )}
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
