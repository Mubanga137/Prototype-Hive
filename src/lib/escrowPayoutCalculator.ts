import type { WorkerRole } from "@/hooks/useMixedFleetRole";

interface PayoutCalculation {
  baseFee: number;
  workerRole: WorkerRole;
  workerPayout: number;
  hiveCut: number;
  capacityDeduction: number;
  summary: string;
}

/**
 * Calculate escrow payout splits for mixed-fleet workers
 *
 * RUNNER/NODE Logic:
 * - Payout: 100% of fee (no commission)
 * - Hive Cut: 0%
 * - Capacity: -1 pulse_credits deducted
 * - Summary: "Earned ZMW {fee} + completed order counts toward weekly quotas"
 *
 * RIDER Logic:
 * - Payout: 90% of fee (The Hive keeps 10%)
 * - Hive Cut: 10% commission
 * - Capacity: 0 (no capacity deduction)
 * - Summary: "Earned ZMW {payout} (after 10% Hive commission)"
 */
export const calculateEscrowPayout = (
  baseFee: number,
  workerRole: WorkerRole
): PayoutCalculation => {
  const isRider = workerRole === "rider";
  const isRunner = workerRole === "runner";
  const isNode = workerRole === "node_operator";

  let workerPayout: number;
  let hiveCut: number;
  let capacityDeduction: number;
  let summary: string;

  if (isRider) {
    // Rider: 90% payout, 10% commission, no capacity impact
    workerPayout = baseFee * 0.9;
    hiveCut = baseFee * 0.1;
    capacityDeduction = 0;
    summary = `Earned ZMW ${workerPayout.toFixed(2)} (after 10% Hive commission)`;
  } else if (isRunner || isNode) {
    // Runner/Node: 100% payout, 0% commission, -1 capacity
    workerPayout = baseFee;
    hiveCut = 0;
    capacityDeduction = -1;
    summary = `Earned ZMW ${workerPayout.toFixed(2)} + bounty capacity restored on weekly refresh`;
  } else {
    // Unknown role: treat as runner (safe default)
    workerPayout = baseFee;
    hiveCut = 0;
    capacityDeduction = -1;
    summary = `Earned ZMW ${workerPayout.toFixed(2)}`;
  }

  return {
    baseFee,
    workerRole,
    workerPayout,
    hiveCut,
    capacityDeduction,
    summary,
  };
};

/**
 * Format payout summary for UI display
 */
export const formatPayoutSummary = (calculation: PayoutCalculation): string => {
  return calculation.summary;
};

/**
 * Get color scheme based on worker role for UI display
 */
export const getPayoutColorScheme = (
  workerRole: WorkerRole
): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} => {
  switch (workerRole) {
    case "rider":
      return {
        bg: "hsl(38,73%,40%,0.1)",
        border: "hsl(38,73%,40%,0.3)",
        text: "hsl(38,73%,40%)",
        icon: "🏍️",
      };
    case "runner":
      return {
        bg: "hsl(220,55%,13%,0.08)",
        border: "hsl(220,55%,13%,0.2)",
        text: "hsl(220,55%,13%)",
        icon: "🏃",
      };
    case "node_operator":
      return {
        bg: "hsl(220,80%,50%,0.1)",
        border: "hsl(220,80%,50%,0.3)",
        text: "hsl(220,80%,50%)",
        icon: "🏢",
      };
    default:
      return {
        bg: "hsl(220,20%,46%,0.1)",
        border: "hsl(220,20%,46%,0.3)",
        text: "hsl(220,20%,46%)",
        icon: "📦",
      };
  }
};
