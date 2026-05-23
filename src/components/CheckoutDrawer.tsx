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
import { logCheckoutError, getUserFriendlyErrorMessage } from "@/utils/errorUtils";
import AuthGateModal from "./modals/AuthGateModal";

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
    // Validate before attempting checkout
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    if (state !== "idle") return; // hard-block duplicate clicks

    setState("submitting");

    const cleanedPhone = cleanZambianPhone(phone) || phone;
    const detailsForMsg = isService
      ? `${scheduledDate}${serviceNotes ? " · " + serviceNotes : ""}`
      : address.trim();

    // Call secure_place_order RPC to atomically validate & create order
    // Ensure all numeric values are properly typed (not strings)
    const { data, error } = await supabase.rpc("secure_place_order", {
      p_buyer_id: user?.id || null,
      p_item_id: Number(item.id),
      p_sme_id: item.sme_id ? Number(item.sme_id) : null,
      p_store_id: item.store_id ? Number(item.store_id) : Number(item.sme_id) || null,
      p_quantity: isService ? 1 : Number(quantity),
      p_customer_name: name.trim(),
      p_customer_phone: cleanedPhone,
      p_delivery_address: isService ? null : address.trim(),
      p_scheduled_date: isService ? scheduledDate : null,
      p_service_notes: isService ? serviceNotes : null,
      p_item_type: item.item_type || "product",
    });

    if (error) {
      logCheckoutError(error, {
        p_buyer_id: user?.id ?? null,
        p_item_id: item.id,
        p_sme_id: item.sme_id,
        p_quantity: isService ? 1 : quantity,
      });
      const userMessage = getUserFriendlyErrorMessage(error);
      toast.error(`⚠️ ${userMessage}`);
      setState("idle");
      return;
    }

    const result = data?.[0];
    if (!result || result.status !== "success") {
      toast.error(`⚠️ ${result?.message || "Order creation failed"}`);
      if (result?.status === "insufficient_stock") {
        toast.error("Not enough stock available. Please adjust quantity.");
      }
      setState("idle");
      return;
    }

    let orderId: any = result.order_id ?? "—";
    let trackingToken: any = result.tracking_token;
    const otp = result.otp_code;

    // ✅ For guests, save tracking session to localStorage
    // If we couldn't SELECT, we use the OTP as a fallback identifier
    if (!user?.id) {
      localStorage.setItem(
        "hive_guest_orders",
        JSON.stringify({
          orderId: orderId || "pending",
          otp: otp,
          timestamp: Date.now(),
        })
      );
    }

    // Brief success state
    setState("success");

    if (isService) {
      toast.success("✅ Funds Secured in Escrow. Notifying your Service Provider!", {
        action: {
          label: "View Booking",
          onClick: () => window.location.href = "/messages"
        }
      });
    } else {
      // ✅ For guests, redirect to tracking page (use token if available, else use OTP)
      if (!user?.id) {
        setTimeout(() => {
          const trackingPath = trackingToken
            ? `/track-order/${orderId}?token=${trackingToken}`
            : `/track-orders?otp=${otp}`;
          navigate(trackingPath, { replace: true });
          onOpenChange(false);
        }, 1000);
        return;
      }

      toast.success("✅ Funds Secured in Escrow. Notifying your Vendor!", {
        action: {
          label: "Track Order",
          onClick: () => window.location.href = "/track-orders"
        }
      });
    }

    const message = buildOrderMessage({
      orderId,
      itemName: item.item_name,
      quantity: isService ? 1 : quantity,
      totalAmount,
      customerName: name.trim(),
      customerPhone: cleanedPhone,
      details: detailsForMsg,
      otpCode: otp,
    });

    const targetPhone = cleanZambianPhone(item.store_whatsapp);

    setTimeout(() => {
      // If WhatsApp is available, redirect. If not, just close the drawer.
      if (targetPhone) {
        // Same-tab redirect, per spec
        window.location.href = buildWhatsAppUrl(targetPhone, message);
      } else {
        // WhatsApp is missing - gracefully close without blocking
        console.warn("[checkout] WhatsApp number missing for store:", item.store_name);
        onOpenChange(false);
      }
    }, 1000);
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
                  disabled={submitting || success}
                  className="btn-gold mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {success ? (
                    <>
                      <Check size={18} /> Confirmed
                    </>
                  ) : submitting ? (
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
