import { supabase } from "@/integrations/supabase/client";

export type GigStatus =
  | "pending"
  | "assigned"
  | "en_route_to_pickup"
  | "at_pickup"
  | "in_transit"
  | "delivered";

const statusProgression: Record<GigStatus, GigStatus | null> = {
  pending: "assigned",
  assigned: "en_route_to_pickup",
  en_route_to_pickup: "at_pickup",
  at_pickup: "in_transit",
  in_transit: "delivered",
  delivered: null,
};

export async function updateGigStatus(
  gigId: number,
  agentId: number,
  newStatus: GigStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", gigId)
      .eq("runner_id", agentId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function progressGigStatus(
  gigId: number,
  agentId: number,
  currentStatus: GigStatus
): Promise<{ success: boolean; newStatus?: GigStatus; error?: string }> {
  const nextStatus = statusProgression[currentStatus];

  if (!nextStatus) {
    return {
      success: false,
      error: `Cannot progress from status: ${currentStatus}`,
    };
  }

  const result = await updateGigStatus(gigId, agentId, nextStatus);

  if (result.success) {
    return { success: true, newStatus: nextStatus };
  }

  return { success: false, error: result.error };
}

export function getStatusDisplayName(status: GigStatus): string {
  const names: Record<GigStatus, string> = {
    pending: "Available",
    assigned: "Assigned",
    en_route_to_pickup: "Going to Pickup",
    at_pickup: "At Pickup",
    in_transit: "In Transit",
    delivered: "Delivered",
  };
  return names[status] || status;
}

export function getStatusIcon(status: GigStatus): string {
  const icons: Record<GigStatus, string> = {
    pending: "📍",
    assigned: "✅",
    en_route_to_pickup: "🚴",
    at_pickup: "📦",
    in_transit: "🚚",
    delivered: "✔️",
  };
  return icons[status] || "•";
}

export function getStatusColor(status: GigStatus): string {
  const colors: Record<GigStatus, string> = {
    pending: "hsl(38,73%,40%)",      // Gold
    assigned: "hsl(220,95%,60%)",    // Blue
    en_route_to_pickup: "hsl(280,95%,60%)", // Purple
    at_pickup: "hsl(30,95%,60%)",    // Orange
    in_transit: "hsl(30,95%,60%)",   // Orange
    delivered: "hsl(110,95%,60%)",   // Green
  };
  return colors[status] || "hsl(220,20%,46%)";
}

// Check if gig is still available (not claimed by another agent)
export async function checkGigAvailability(
  gigId: number
): Promise<{ available: boolean; assignedTo?: number }> {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("runner_id, status")
      .eq("id", gigId)
      .single();

    if (error || !data) {
      return { available: false };
    }

    // If it has a runner and status is not pending, it's not available
    if (data.runner_id && data.status !== "pending") {
      return { available: false, assignedTo: data.runner_id };
    }

    return { available: true };
  } catch (err) {
    return { available: false };
  }
}
