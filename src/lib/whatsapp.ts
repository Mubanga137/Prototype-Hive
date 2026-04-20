// Utilities for routing checkout confirmations to a SME's WhatsApp.
// Zambian numbers are normalised to international (260…) format and
// stripped of any leading zero, spaces, plus signs or dashes.

export function cleanZambianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Strip everything that isn't a digit
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;

  // Already international (Zambia = 260, 12 digits total)
  if (digits.startsWith("260")) return digits;

  // Local 0XXXXXXXXX → 260XXXXXXXXX
  if (digits.startsWith("0")) return "260" + digits.slice(1);

  // Bare 9XXXXXXXX (9 digits) → prepend 260
  if (digits.length === 9) return "260" + digits;

  // Fallback — return as-is, wa.me will reject if unusable
  return digits;
}

export interface OrderHandoffPayload {
  orderId: string | number;
  itemName: string;
  quantity: number;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  details: string;     // Address (product) or "Date · Notes" (service)
  otpCode: string;
}

export function buildOrderMessage(p: OrderHandoffPayload): string {
  // %0A = newline. Build raw, then encodeURIComponent — wa.me accepts both
  // styles, but encodeURIComponent is the safer canonical form.
  const lines = [
    "🐝 HIVE ORDER CONFIRMATION",
    "",
    `Order ID: #${p.orderId}`,
    `Item: ${p.itemName}`,
    `Qty: ${p.quantity}`,
    `Total: ZMW ${p.totalAmount.toFixed(2)}`,
    "",
    `Customer: ${p.customerName} | ${p.customerPhone}`,
    `Details: ${p.details}`,
    `Drop-Off Code: ${p.otpCode}`,
  ];
  return lines.join("\n");
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function generateOtpCode(): string {
  // 4-digit code, zero-padded
  return Math.floor(1000 + Math.random() * 9000).toString();
}
