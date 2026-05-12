import { haversineDistance } from "./haversineDistance";

export interface OrderClusterItem {
  id: number;
  sme_id: number | null;
  total_price: number | null;
  status: string | null;
}

export interface LocationData {
  lat: number;
  lng: number;
}

export interface BatchedOrder {
  clusterId: string;
  pickupSmeId: number;
  pickupSmeNam: string;
  orderIds: number[];
  orders: OrderClusterItem[];
  pickupLoc: LocationData | null;
  dropoffs: Array<{ orderId: number; customer: string; phone: string; loc: LocationData }>;
  totalEstimate: number;
  orderCount: number;
}

const CLUSTER_RADIUS_KM = 2;

/**
 * Cluster orders by SME and geographically nearby drop-offs.
 * Groups orders with the same sme_id, then sub-groups drop-offs within CLUSTER_RADIUS_KM.
 */
export function clusterOrders(
  orders: OrderClusterItem[],
  smeLocations: Map<number, LocationData>,
  deliveryLocationEstimates: Map<number, LocationData>
): BatchedOrder[] {
  // Group by sme_id
  const bySme = new Map<number, OrderClusterItem[]>();
  orders.forEach((order) => {
    if (!order.sme_id) return;
    if (!bySme.has(order.sme_id)) {
      bySme.set(order.sme_id, []);
    }
    bySme.get(order.sme_id)!.push(order);
  });

  const batches: BatchedOrder[] = [];

  // For each SME, cluster orders by dropoff proximity
  bySme.forEach((ordersForSme, smeId) => {
    const pickupLoc = smeLocations.get(smeId) || null;

    // Group dropoffs by geographic proximity
    const dropoffClusters: OrderClusterItem[][] = [];

    ordersForSme.forEach((order) => {
      const orderLoc = deliveryLocationEstimates.get(order.id);
      if (!orderLoc) {
        dropoffClusters[0] = dropoffClusters[0] || [];
        dropoffClusters[0].push(order);
        return;
      }

      // Find if this dropoff is near any existing cluster
      let found = false;
      for (let cluster of dropoffClusters) {
        const ref = deliveryLocationEstimates.get(cluster[0].id);
        if (ref) {
          const dist = haversineDistance(orderLoc.lat, orderLoc.lng, ref.lat, ref.lng);
          if (dist <= CLUSTER_RADIUS_KM) {
            cluster.push(order);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        dropoffClusters.push([order]);
      }
    });

    // Convert each dropoff cluster into a BatchedOrder
    dropoffClusters.forEach((dropoffGroup, clusterIdx) => {
      const clusterId = `${smeId}-${clusterIdx}`;
      const dropoffs = dropoffGroup.map((order) => ({
        orderId: order.id,
        customer: `Order #${order.id}`,
        phone: "",
        loc: deliveryLocationEstimates.get(order.id) || { lat: 0, lng: 0 },
      }));

      const totalEstimate = dropoffGroup.reduce((sum, o) => sum + (o.total_price || 0), 0);

      batches.push({
        clusterId,
        pickupSmeId: smeId,
        pickupSmeNam: `SME #${smeId}`, // Will be hydrated with real name
        orderIds: dropoffGroup.map((o) => o.id),
        orders: dropoffGroup,
        pickupLoc,
        dropoffs,
        totalEstimate,
        orderCount: dropoffGroup.length,
      });
    });
  });

  return batches;
}

/**
 * Generate a route waypoint sequence from batched order.
 * [Rider] → [SME Pickup] → [Dropoff 1] → [Dropoff 2] → ...
 */
export function generateRouteWaypoints(batch: BatchedOrder, riderLoc: LocationData) {
  const waypoints = [riderLoc];

  if (batch.pickupLoc) {
    waypoints.push(batch.pickupLoc);
  }

  batch.dropoffs.forEach((dropoff) => {
    waypoints.push(dropoff.loc);
  });

  return waypoints;
}
