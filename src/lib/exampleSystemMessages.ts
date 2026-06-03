/**
 * Example implementations for system message triggers
 * These show how to integrate system messages with your order processing flows
 */

import {
  sendOrderConfirmationReceipt,
  sendRetailerOrderNotification,
  sendDeliveryClaimedNotification,
} from "./systemMessaging";

/**
 * Example: Call this when an order payment is confirmed
 * Trigger: Order.payment_status changes to 'paid'
 */
export const handleOrderPaid = async (
  orderId: number,
  customerId: string,
  orderDetails: {
    items: string[];
    total: number;
    deliveryTime: string;
  },
  isGuest: boolean = false,
  guestToken?: string
) => {
  const receiptText = `
Order #${orderId}
${orderDetails.items.map((item) => `• ${item}`).join("\n")}

Total: K${orderDetails.total.toFixed(2)}
Estimated Delivery: ${orderDetails.deliveryTime}

Your order is confirmed and will be prepared shortly.
  `.trim();

  await sendOrderConfirmationReceipt(
    customerId,
    orderId,
    receiptText,
    isGuest,
    guestToken
  );
};

/**
 * Example: Call this when an order is assigned to a vendor
 * Trigger: Order created OR vendor accepts order
 */
export const handleVendorOrderAssigned = async (
  vendorId: string,
  orderId: number,
  orderDetails: {
    customerName: string;
    items: string[];
    total: number;
    pickupAddress: string;
  }
) => {
  const notificationText = `
New order from ${orderDetails.customerName}
Order #${orderId}

Items:
${orderDetails.items.map((item) => `• ${item}`).join("\n")}

Total: K${orderDetails.total.toFixed(2)}

Pickup: ${orderDetails.pickupAddress}
  `.trim();

  await sendRetailerOrderNotification(vendorId, orderId, notificationText);
};

/**
 * Example: Call this when a rider accepts a delivery
 * Trigger: Rider.status changes to 'in_transit'
 */
export const handleDeliveryRouteClaimed = async (
  riderId: string,
  orderId: number,
  riderDetails?: {
    name: string;
    phone: string;
    vehicle: string;
  }
) => {
  await sendDeliveryClaimedNotification(riderId, orderId);
};

/**
 * Example usage in an order creation/payment flow:
 *
 * async function completeOrderPayment(order: Order, customer: Customer) {
 *   try {
 *     // Process payment...
 *     const result = await chargeCard(customer.paymentMethod);
 *
 *     if (result.success) {
 *       // Mark order as paid
 *       await updateOrder(order.id, { payment_status: 'paid' });
 *
 *       // Send confirmation receipt (system message)
 *       await handleOrderPaid(
 *         order.id,
 *         customer.user_id,
 *         {
 *           items: order.items.map(i => `${i.quantity}x ${i.name}`),
 *           total: order.total,
 *           deliveryTime: "2-3 hours"
 *         },
 *         customer.isGuest,
 *         customer.guestToken
 *       );
 *
 *       // Assign to vendor and notify them
 *       const vendor = await assignVendor(order);
 *       await handleVendorOrderAssigned(
 *         vendor.user_id,
 *         order.id,
 *         {
 *           customerName: customer.full_name,
 *           items: order.items.map(i => `${i.quantity}x ${i.name}`),
 *           total: order.total,
 *           pickupAddress: order.vendor_address
 *         }
 *       );
 *
 *       return { success: true };
 *     }
 *   } catch (error) {
 *     console.error('Order payment failed:', error);
 *     throw error;
 *   }
 * }
 */
