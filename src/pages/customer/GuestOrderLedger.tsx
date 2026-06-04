import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, CheckCircle, Clock, Package, Phone, MapPin, ArrowLeft } from "lucide-react";

interface GuestOrder {
  order_id: number;
  tracking_token: string;
  customer_phone: string;
  customer_name: string;
  total_price: number;
  total_amount?: number;
  otp_code: string;
  status: string;
  item_name?: string;
  delivery_address?: string;
  scheduled_date?: string;
  item_type?: string;
  created_at?: string;
  item_count?: number;
  brand_name?: string;
  whatsapp_number?: string;
}

export default function GuestOrderLedger() {
  const navigate = useNavigate();
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  useEffect(() => {
    initializeFromLocalStorage();
  }, []);

  const initializeFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem("hive_guest_active_cart");

      console.log("[GuestOrderLedger] localStorage check:", {
        key: "hive_guest_active_cart",
        stored,
        allKeys: Object.keys(localStorage),
      });

      const tokens = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(tokens) || tokens.length === 0) {
        console.warn("[GuestOrderLedger] No tokens found in localStorage");
        setLoading(false);
        return;
      }

      // Get the most recent token (last in array)
      const mostRecentToken = tokens[tokens.length - 1];
      console.log("[GuestOrderLedger] Found tracking token:", {
        token: mostRecentToken,
        totalTokens: tokens.length,
      });

      setTrackingToken(mostRecentToken);
      fetchOrder(mostRecentToken);
    } catch (e) {
      console.error("[GuestOrderLedger] localStorage initialization failed:", e);
      setLoading(false);
    }
  };

  const fetchOrder = async (token: string) => {
    if (!token) {
      console.error("[GuestOrderLedger] No token provided");
      return;
    }

    try {
      setLoading(true);

      console.log("[GuestOrderLedger] Fetching order with token:", token);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `id, tracking_token, customer_phone, customer_name, total_price,
           total_amount, otp_code, status, item_type, delivery_address,
           scheduled_date, created_at, item_id, sme_id`
        )
        .eq("tracking_token", token)
        .maybeSingle();

      if (error) {
        console.error("[GuestOrderLedger] Fetch error:", {
          message: error.message,
          code: (error as any).code,
          status: (error as any).status,
          hint: (error as any).hint,
          token,
        });
        toast.error("Failed to load order details");
        return;
      }

      if (!data) {
        console.warn("[GuestOrderLedger] No order found for token:", {
          token,
          dataReceived: data,
        });
        toast.error("Order not found. Please check your link and try again.");
        return;
      }

      console.log("[GuestOrderLedger] Order fetched successfully:", {
        orderId: data.id,
        status: data.status,
      });

      // Fetch item details
      let itemName = "Order Item";
      if (data.item_id) {
        const { data: itemData } = await supabase
          .from("hive_catalogue")
          .select("product_name")
          .eq("id", data.item_id)
          .maybeSingle();

        if (itemData?.product_name) {
          itemName = itemData.product_name;
        }
      }

      // Fetch store details
      let brandName = "Unknown Vendor";
      let whatsappNumber = null;
      if (data.sme_id) {
        const { data: storeData } = await supabase
          .from("sme_stores")
          .select("brand_name, whatsapp_number")
          .eq("id", data.sme_id)
          .maybeSingle();

        if (storeData) {
          brandName = storeData.brand_name || brandName;
          whatsappNumber = storeData.whatsapp_number || null;
        }
      }

      setOrder({
        order_id: data.id,
        tracking_token: data.tracking_token,
        customer_phone: data.customer_phone,
        customer_name: data.customer_name,
        total_price: data.total_price || data.total_amount || 0,
        total_amount: data.total_amount,
        otp_code: data.otp_code,
        status: data.status,
        item_name: itemName,
        delivery_address: data.delivery_address,
        scheduled_date: data.scheduled_date,
        item_type: data.item_type,
        created_at: data.created_at,
        item_count: 1,
        brand_name: brandName,
        whatsapp_number: whatsappNumber,
      });
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

  const maskToken = (token: string): string => {
    if (!token || token.length < 7) return token;
    const suffix = token.slice(-7);
    return `HIVE-TOKEN-...${suffix}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-flex animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your receipt...</p>
        </div>
      </div>
    );
  }

  if (!order || !trackingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📭</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">No Active Receipt Found</h1>
          <p className="text-muted-foreground mb-4">
            No active receipt found in this session.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left text-sm">
            <p className="text-amber-900 font-semibold mb-2">💡 What to do:</p>
            <ul className="text-amber-800 space-y-1 text-xs">
              <li>• Check your email or WhatsApp for order confirmation</li>
              <li>• Your order data is saved under the tracking token</li>
              <li>• Contact support if you need order details</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="btn-gold px-6 py-2 inline-flex items-center gap-2 flex-1"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/track-orders")}
              className="flex-1 px-6 py-2 border border-border rounded-lg font-medium text-foreground hover:bg-slate-50 transition"
            >
              Track Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-primary hover:opacity-80 transition font-medium mb-6"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="text-center">
            <div className="inline-block p-3 bg-primary/10 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed</h1>
            <p className="text-muted-foreground">Your order has been received and is being processed</p>
          </div>
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

          {/* Order Details */}
          <div className="space-y-4 mb-6 pb-6 border-b border-border">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Item
              </p>
              <p className="text-base font-semibold text-foreground">{order.item_name}</p>
            </div>

            {order.brand_name && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Vendor
                </p>
                <p className="text-foreground">{order.brand_name}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Total Amount
              </p>
              <p className="text-2xl font-bold text-primary">
                ZMW {Number(order.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Ordered By
              </p>
              <p className="text-foreground">{order.customer_name}</p>
            </div>

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
                {maskToken(order.tracking_token)}
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
              Stored securely in your session
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
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          <button
            onClick={() => navigate("/")}
            className="btn-gold w-full py-3"
          >
            Continue Shopping
          </button>
          <button
            onClick={() => navigate("/customer-dash?section=My Orders")}
            className="w-full py-3 font-medium text-foreground hover:bg-opacity-80 transition rounded-lg"
            style={{
              backgroundColor: "#FFFBF2",
              color: "#1a1a1a",
              border: "1px solid #FFFBF2"
            }}
          >
            View My Orders
          </button>
          <button
            onClick={() => navigate("/customer-dash?section=Messages")}
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
