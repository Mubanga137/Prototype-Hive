// Multi-item guest cart drawer for a single storefront.
// On checkout: collects shopper details, INSERTs one orders row per cart line
// (sharing one OTP), then opens WhatsApp once with a combined order summary.

import { motion, AnimatePresence } from "framer-motion";
import {
  X, Minus, Plus, Trash2, MapPin, User as UserIcon, Phone,
  Check, Loader2, ShoppingCart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildWhatsAppUrl, cleanZambianPhone, generateOtpCode,
} from "@/lib/whatsapp";
import { useStoreCart, type CartLine } from "@/hooks/useStoreCart";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: number | null;
  smeId: number | null;
  storeName: string;
  storeWhatsapp: string | null;
}

type SubmitState = "idle" | "submitting" | "success";

const isZambianPhone = (raw: string) => {
  const digits = raw.replace(/\D+/g, "");
  return /^(0\d{9}|260\d{9}|\d{9})$/.test(digits);
};

const buildCartMessage = (
  orderIds: (string | number)[],
  lines: CartLine[],
  totals: { subtotal: number },
  shopper: { name: string; phone: string; address: string; otp: string }
) => {
  const refLabel = orderIds.length === 1
    ? `#${orderIds[0]}`
    : `#${orderIds[0]}–${orderIds[orderIds.length - 1]} (${orderIds.length} items)`;

  const lineItems = lines
    .map(
      (l, i) =>
        `${i + 1}. ${l.item_name} × ${l.quantity} — ZMW ${(l.unit_price * l.quantity).toFixed(2)}`
    )
    .join("\n");

  return [
    "🐝 HIVE ORDER CONFIRMATION",
    "",
    `Order: ${refLabel}`,
    "",
    "Items:",
    lineItems,
    "",
    `Total: ZMW ${totals.subtotal.toFixed(2)}`,
    "",
    `Customer: ${shopper.name} | ${shopper.phone}`,
    `Delivery: ${shopper.address}`,
    `Drop-Off Code: ${shopper.otp}`,
  ].join("\n");
};

const CartDrawer = ({
  open, onOpenChange, storeId, smeId, storeName, storeWhatsapp,
}: CartDrawerProps) => {
  const { lines, setQuantity, removeItem, clear, subtotal, itemCount } =
    useStoreCart(storeId);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState<SubmitState>("idle");

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (open) setState("idle");
  }, [open]);

  const validate = (): string | null => {
    if (lines.length === 0) return "Your cart is empty.";
    if (!name.trim()) return "Please enter your name.";
    if (!phone.trim() || !isZambianPhone(phone)) return "Enter a valid Zambian phone number.";
    if (!address.trim()) return "Please enter a delivery address.";
    return null;
  };

  const handleCheckout = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (state !== "idle") return;

    setState("submitting");

    const otp = generateOtpCode();
    const cleanedPhone = cleanZambianPhone(phone) || phone;

    // Insert one row per line (shared OTP). Cast to any — see the
    // 2026-04-17 migration that adds the new columns.
    const payload = lines.map((l) => ({
      store_id: storeId,
      sme_id: smeId,
      offer_id: l.offer_id,
      item_id: l.offer_id,
      item_type: l.item_type ?? "physical",
      quantity: l.quantity,
      total_amount: l.unit_price * l.quantity,
      total_price: l.unit_price * l.quantity,
      customer_name: name.trim(),
      customer_phone: cleanedPhone,
      delivery_address: address.trim(),
      status: "pending",
      otp_code: otp,
    }));

    const { data, error } = await (supabase.from("orders") as any)
      .insert(payload)
      .select("id");

    if (error) {
      console.error("[cart-checkout] insert failed:", error);
      toast.error(error.message || "Could not place your order.");
      setState("idle");
      return;
    }

    const orderIds = ((data as any[]) || []).map((r) => r.id);
    setState("success");
    toast.success("Order placed — opening WhatsApp…");

    const targetPhone = cleanZambianPhone(storeWhatsapp);
    const message = buildCartMessage(
      orderIds.length ? orderIds : ["—"],
      lines,
      { subtotal },
      { name: name.trim(), phone: cleanedPhone, address: address.trim(), otp }
    );

    setTimeout(() => {
      clear();
      if (!targetPhone) {
        toast.error("This store hasn't set a WhatsApp number yet.");
        setState("idle");
        onOpenChange(false);
        return;
      }
      window.location.href = buildWhatsAppUrl(targetPhone, message);
    }, 1000);
  };

  const submitting = state === "submitting";
  const success = state === "success";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !submitting && !success && onOpenChange(false)}
            className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[90] flex max-h-[92vh] flex-col rounded-t-3xl border-t border-primary/20 bg-background shadow-2xl"
          >
            <div className="mx-auto flex w-full max-w-lg flex-col overflow-hidden px-5 pb-6 pt-3">
              <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-border" />

              <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {storeName}
                  </p>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    Your Cart ({itemCount})
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

              <div className="flex-1 overflow-y-auto pr-1">
                {lines.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
                    Your cart is empty.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {lines.map((l) => (
                      <li
                        key={l.offer_id}
                        className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-2.5"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {l.image_url ? (
                            <img src={l.image_url} alt={l.item_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg">🛍️</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{l.item_name}</p>
                          <p className="text-xs text-primary">ZMW {l.unit_price.toFixed(2)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQuantity(l.offer_id, l.quantity - 1)}
                            disabled={submitting || success}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary disabled:opacity-40"
                            aria-label="Decrease"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{l.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(l.offer_id, l.quantity + 1)}
                            disabled={submitting || success}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary disabled:opacity-40"
                            aria-label="Increase"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(l.offer_id)}
                            disabled={submitting || success}
                            className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                            aria-label="Remove"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {lines.length > 0 && (
                  <div className="mt-5 space-y-3">
                    <Field icon={<UserIcon size={13} />} label="Full Name" value={name} onChange={setName}
                      placeholder="e.g. Bwalya Mulenga" disabled={submitting || success} maxLength={80} />
                    <Field icon={<Phone size={13} />} label="Phone Number" value={phone} onChange={setPhone}
                      placeholder="0977 123 456" disabled={submitting || success} inputMode="tel" maxLength={20} />
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <MapPin size={13} /> Delivery Address
                      </label>
                      <textarea
                        value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={250}
                        disabled={submitting || success} placeholder="Plot, street, suburb, city"
                        className="w-full resize-none rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}
              </div>

              {lines.length > 0 && (
                <div className="shrink-0 border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Total</span>
                    <span className="font-display text-2xl font-bold text-primary">
                      ZMW {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    onClick={handleCheckout} disabled={submitting || success}
                    className="btn-gold flex w-full items-center justify-center gap-2 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                  >
                    {success ? (<><Check size={18} /> Confirmed</>) :
                     submitting ? (<><Loader2 size={16} className="animate-spin" /> Placing order…</>) :
                     (<><ShoppingCart size={16} /> Checkout via WhatsApp</>)}
                  </button>
                  <p className="mt-3 text-center text-[10px] text-muted-foreground">
                    We'll open WhatsApp with your full order so you can finalise with the store.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Local field — same look as CheckoutDrawer
interface FieldProps {
  icon: React.ReactNode; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; inputMode?: "tel" | "text" | "email" | "numeric"; maxLength?: number;
}
const Field = ({ icon, label, value, onChange, placeholder, disabled, inputMode, maxLength }: FieldProps) => (
  <div>
    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
      {icon} {label}
    </label>
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled} inputMode={inputMode} maxLength={maxLength}
      className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
    />
  </div>
);

export default CartDrawer;
