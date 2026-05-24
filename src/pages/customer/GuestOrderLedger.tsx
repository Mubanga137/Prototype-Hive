import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, CheckCircle, Clock, Package, Phone, MapPin } from "lucide-react";

interface GuestOrder {
  order_id: number;
  tracking_token: string;
  customer_phone: string;
  customer_name: string;
  total_to_pay: number;
  otp_code: string;
  status: string;
  item_name?: string;
  delivery_address?: string;
  scheduled_date?: string;
  item_type?: string;
  created_at?: string;
}

export default function GuestOrderLedger() {
  const { trackingToken } = useParams<{ trackingToken: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!trackingToken) {
      toast.error("Invalid tracking token");
      navigate("/");
      return;
    }

    fetchOrder();
  }, [trackingToken]);

  const fetchOrder = async () => {
    try {
      setLoading(true);

      // Query orders table using the tracking token (public read access)
      // RLS policy allows reading non-pending orders created within 30 days
      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, tracking_token, customer_phone, customer_name, total_to_pay,
           total_price, otp_code, status, item_type, delivery_address,
           scheduled_date, created_at, item_id,
           hive_catalogue!orders_item_id_fkey(product_name)`
        )
        .eq("tracking_token", trackingToken)
        .maybeSingle();

      if (error) {
        console.error("[GuestOrderLedger] Fetch error:", {
          message: error.message,
          code: (error as any).code,
          status: (error as any).status,
          details: (error as any).details,
          hint: (error as any).hint,
          fullError: error,
        });

        // Distinguish between "not found" and other errors
        if ((error as any).code === "PGRST116" || error.message?.includes("not found")) {
          toast.error("Order not found. Check your tracking token and try again.");
        } else if ((error as any).status === 403) {
          toast.error("Access denied. Order may have expired.");
        } else {
          toast.error(`Error: ${error.message || "Failed to load order"}`);
        }
        navigate("/");
        return;
      }

      if (data) {
        const itemData = (data as any).hive_catalogue;
        setOrder({
          order_id: data.id,
          tracking_token: data.tracking_token,
          customer_phone: data.customer_phone,
          customer_name: data.customer_name,
          total_to_pay: data.total_to_pay || data.total_price,
          otp_code: data.otp_code,
          status: data.status,
          item_name: itemData?.product_name || "Order Item",
          delivery_address: data.delivery_address,
          scheduled_date: data.scheduled_date,
          item_type: data.item_type,
          created_at: data.created_at,
        });
      } else {
        // No data returned (order not found or filtered by RLS)
        console.warn("[GuestOrderLedger] No order found for token:", trackingToken);
        toast.error("Order not found. Check your tracking token and try again.");
        navigate("/");
      }
    } catch (err) {
      console.error("[GuestOrderLedger] Error:", err);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_payment":
        return "text-amber-600 bg-amber-50";
      case "in_transit":
        return "text-blue-600 bg-blue-50";
      case "delivered":
        return "text-green-600 bg-green-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <Clock className="w-5 h-5" />;
      case "in_transit":
        return <Package className="w-5 h-5" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-flex animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📭</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This order link may have expired or doesn't exist.
          </p>
          <button
            onClick={() => navigate("/")}
            className="btn-gold px-6 py-2"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed</h1>
          <p className="text-muted-foreground">Your order has been received and is being processed</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-border">
          {/* Order Status */}
          <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-slate-50">
            {getStatusIcon(order.status)}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Order Status
              </p>
              <p className={`text-lg font-bold ${getStatusColor(order.status)}`}>
                {formatStatus(order.status)}
              </p>
            </div>
          </div>

          {/* Order ID & Token */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-border">
            {/* Order ID */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Order ID
              </p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-slate-50 px-3 py-2 rounded-lg flex-1 break-all">
                  {order.order_id}
                </code>
                <button
                  onClick={() => copyToClipboard(String(order.order_id), "Order ID")}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                  aria-label="Copy order ID"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* OTP Code */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Verification Code
              </p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-primary/10 px-3 py-2 rounded-lg flex-1 text-primary font-bold text-center">
                  {order.otp_code}
                </code>
                <button
                  onClick={() => copyToClipboard(order.otp_code, "OTP Code")}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                  aria-label="Copy OTP code"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this with the vendor to complete the transaction
              </p>
            </div>
          </div>

          {/* Customer & Item Details */}
          <div className="space-y-4 mb-6 pb-6 border-b border-border">
            {/* Item */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Item
              </p>
              <p className="text-base font-semibold text-foreground">{order.item_name}</p>
            </div>

            {/* Total Amount */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Total Amount
              </p>
              <p className="text-2xl font-bold text-primary">
                ZMW {Number(order.total_to_pay).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Customer Name */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Ordered By
              </p>
              <p className="text-foreground">{order.customer_name}</p>
            </div>

            {/* Delivery Address or Scheduled Date */}
            {order.item_type === "service" ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Scheduled Date
                  </p>
                </div>
                <p className="text-foreground">
                  {order.scheduled_date
                    ? new Date(order.scheduled_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Not specified"}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Delivery Address
                  </p>
                </div>
                <p className="text-foreground whitespace-pre-wrap">{order.delivery_address || "Not provided"}</p>
              </div>
            )}

            {/* Customer Phone */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Contact Number
                </p>
              </div>
              <p className="text-foreground">{order.customer_phone}</p>
            </div>
          </div>

          {/* Tracking Token (for recovery) */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Tracking Token (Keep Safe)
            </p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs bg-white px-2 py-1 rounded flex-1 break-all text-muted-foreground">
                {order.tracking_token}
              </code>
              <button
                onClick={() => copyToClipboard(order.tracking_token, "Tracking Token")}
                className="p-2 hover:bg-white rounded transition"
                aria-label="Copy tracking token"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Save this token to retrieve your order later
            </p>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-blue-900 mb-3">What Happens Next?</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>The vendor has been notified of your order via WhatsApp</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>They will contact you to confirm details and arrange delivery</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Share your verification code when they arrive for secure handoff</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Order status will update as it's processed and delivered</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate("/")}
            className="btn-gold w-full py-3"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => navigate("/messages")}
            className="w-full py-3 border border-border rounded-lg font-medium text-foreground hover:bg-slate-50 transition"
          >
            View Messages
          </button>
        </div>

        {/* Support Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Need help? Contact us at{" "}
            <a href="https://wa.me/260977000000" className="text-primary font-semibold hover:underline">
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
