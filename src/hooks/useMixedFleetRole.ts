import { useAuth } from "@/hooks/useAuth";

export type WorkerRole = "runner" | "rider" | "node_operator" | "unknown";

interface FleetRoleConfig {
  role: WorkerRole;
  isRunner: boolean;
  isRider: boolean;
  isNode: boolean;
  commissionRate: number; // Percentage (10% for riders, 0% for runners/nodes)
  usesCapacity: boolean; // true for runners/nodes, false for riders
  capacityLabel: string;
  capacityEmoji: string;
  commissionLabel: string;
}

/**
 * Mixed-Fleet Economic Logic Hook
 *
 * Determines worker role and calculates commission/capacity behavior:
 * - Riders (motorbikes): 10% commission, DO NOT use capacity units, always can accept jobs
 * - Runners (on-foot): 0% commission, consume -1 pulse_credits per job, must have capacity > 0
 * - Nodes (hub operators): 0% commission, consume -1 pulse_credits per job, must have capacity > 0
 */
export const useMixedFleetRole = (): FleetRoleConfig => {
  const { profile } = useAuth();

  // Derive worker type from profile.gig_role or profile.role
  // Note: gig_role is stored in profiles.role via "vendor" | "customer" | "wholesaler" | "gig_worker"
  const gigRole = (profile as any)?.gig_role?.toLowerCase() || "unknown";
  const appRole = profile?.role?.toLowerCase() || "";

  let role: WorkerRole = "unknown";

  // Priority: gig_role > role-based detection
  if (gigRole === "rider" || gigRole === "motorbike") {
    role = "rider";
  } else if (gigRole === "runner") {
    role = "runner";
  } else if (gigRole === "node_operator" || gigRole === "hub_owner") {
    role = "node_operator";
  } else if (appRole === "gig_worker") {
    // Fallback: if no gig_role, default to runner for gig_workers
    role = "runner";
  }

  const isRunner = role === "runner";
  const isRider = role === "rider";
  const isNode = role === "node_operator";

  // Commission rates: Riders pay 10%, Runners/Nodes pay 0%
  const commissionRate = isRider ? 10 : 0;

  // Capacity consumption: Runners and Nodes use capacity, Riders do not
  const usesCapacity = isRunner || isNode;

  const capacityLabel = isRider ? "" : "Pulse Credits";
  const capacityEmoji = isRider ? "🚴" : "📦";
  const commissionLabel = isRider
    ? "Commission Rate: 10% per run"
    : "0% Commission (capacity-based)";

  return {
    role,
    isRunner,
    isRider,
    isNode,
    commissionRate,
    usesCapacity,
    capacityLabel,
    capacityEmoji,
    commissionLabel,
  };
};

/**
 * Calculate payout based on worker role
 *
 * - Runner/Node: payout = fee (100%), deduct -1 from pulse_credits
 * - Rider: payout = fee * 0.90 (The Hive keeps 10%), no capacity deduction
 */
export const calculatePayout = (
  baseFee: number,
  workerRole: WorkerRole
): { payout: number; hiveCut: number; capacityDeduction: number } => {
  const isRider = workerRole === "rider";

  return {
    payout: isRider ? baseFee * 0.9 : baseFee,
    hiveCut: isRider ? baseFee * 0.1 : 0,
    capacityDeduction: isRider ? 0 : -1, // Runners/Nodes: -1 capacity unit
  };
};

/**
 * Check if worker can accept a job
 *
 * - Riders: ALWAYS can accept (no capacity limit)
 * - Runners/Nodes: Only if pulse_credits > 0
 */
export const canAcceptJob = (
  workerRole: WorkerRole,
  pulseCredits: number
): { canAccept: boolean; reason?: string } => {
  if (workerRole === "rider") {
    return { canAccept: true };
  }

  if ((workerRole === "runner" || workerRole === "node_operator") && pulseCredits > 0) {
    return { canAccept: true };
  }

  return {
    canAccept: false,
    reason: "Insufficient pulse credits. Visit Recharge to top up your bounty capacity.",
  };
};
