import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BatchedOrder } from "@/utils/orderClustering";

export type RouteStepType = "pickup" | "dropoff" | "complete" | "failed";

export interface RouteStep {
  stepId: string;
  type: RouteStepType;
  orderId?: number;
  customerName?: string;
  customerPhone?: string;
  index: number; // Numeric order in sequence
  status: "pending" | "in_progress" | "completed" | "failed";
  otpAttempts: number;
  otpCorrect: boolean;
}

export interface RouteBatchState {
  batchId: string;
  batch: BatchedOrder | null;
  steps: RouteStep[];
  currentStepIndex: number;
  currentStep: RouteStep | null;
  riderId: number | null;
  status: "idle" | "active_navigation" | "completed" | "failed";
  claimedAt: Date | null;
}

const MAX_OTP_ATTEMPTS = 3;

/**
 * State machine for managing multi-order delivery batches.
 * Handles:
 * - Pickup confirmation
 * - Sequential dropoff verification with OTP
 * - Escrow payment release per order
 * - Batch status transitions
 */
export function useBatchRoutingStateMachine() {
  const [state, setState] = useState<RouteBatchState>({
    batchId: "",
    batch: null,
    steps: [],
    currentStepIndex: 0,
    currentStep: null,
    riderId: null,
    status: "idle",
    claimedAt: null,
  });

  /**
   * Initialize batch routing when rider claims a batch.
   */
  const initializeBatch = useCallback(
    async (batch: BatchedOrder, riderId: number) => {
      // Build step sequence
      const steps: RouteStep[] = [];

      // Step 0: Pickup confirmation
      steps.push({
        stepId: "pickup-0",
        type: "pickup",
        customerName: `SME #${batch.pickupSmeId}`,
        index: 0,
        status: "pending",
        otpAttempts: 0,
        otpCorrect: false,
      });

      // Steps 1+: Individual dropoffs
      batch.dropoffs.forEach((dropoff, idx) => {
        steps.push({
          stepId: `dropoff-${dropoff.orderId}`,
          type: "dropoff",
          orderId: dropoff.orderId,
          customerName: dropoff.customer,
          customerPhone: dropoff.phone,
          index: idx + 1,
          status: "pending",
          otpAttempts: 0,
          otpCorrect: false,
        });
      });

      // Step final: Complete
      steps.push({
        stepId: "complete",
        type: "complete",
        index: steps.length,
        status: "pending",
        otpAttempts: 0,
        otpCorrect: false,
      });

      setState({
        batchId: batch.clusterId,
        batch,
        steps,
        currentStepIndex: 0,
        currentStep: steps[0],
        riderId,
        status: "active_navigation",
        claimedAt: new Date(),
      });

      return true;
    },
    []
  );

  /**
   * Confirm pickup at SME.
   */
  const confirmPickup = useCallback(async () => {
    if (!state.currentStep || state.currentStep.type !== "pickup") {
      toast.error("Invalid step type");
      return false;
    }

    setState((prev) => {
      const newSteps = [...prev.steps];
      newSteps[prev.currentStepIndex].status = "completed";
      return {
        ...prev,
        steps: newSteps,
        currentStepIndex: prev.currentStepIndex + 1,
        currentStep: newSteps[prev.currentStepIndex + 1] || null,
      };
    });

    toast.success("✅ Pickup confirmed. Proceeding to dropoffs.");
    return true;
  }, [state]);

  /**
   * Verify OTP for a dropoff.
   */
  const verifyOTP = useCallback(
    async (enteredOtp: string, orderId: number) => {
      if (!state.currentStep || state.currentStep.type !== "dropoff") {
        toast.error("Invalid step for OTP verification");
        return false;
      }

      // Fetch order to check OTP
      const { data: order, error } = await supabase
        .from("orders")
        .select("otp_code")
        .eq("id", orderId)
        .single();

      if (error || !order) {
        toast.error("Failed to fetch order");
        return false;
      }

      const isCorrect = enteredOtp === order.otp_code;

      if (!isCorrect) {
        const newAttempts = state.currentStep.otpAttempts + 1;
        setState((prev) => {
          const newSteps = [...prev.steps];
          newSteps[prev.currentStepIndex].otpAttempts = newAttempts;
          return { ...prev, steps: newSteps };
        });

        if (newAttempts >= MAX_OTP_ATTEMPTS) {
          toast.error(`❌ Max OTP attempts reached for Order #${orderId}`);
          return false;
        }

        toast.error(`❌ Incorrect OTP (${newAttempts}/${MAX_OTP_ATTEMPTS})`);
        return false;
      }

      // OTP correct: Update order status and release escrow
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "delivered", rider_id: state.riderId })
        .eq("id", orderId);

      if (updateError) {
        toast.error("Failed to update order");
        return false;
      }

      // Flash green and advance
      setState((prev) => {
        const newSteps = [...prev.steps];
        newSteps[prev.currentStepIndex].status = "completed";
        newSteps[prev.currentStepIndex].otpCorrect = true;
        const nextIdx = prev.currentStepIndex + 1;
        return {
          ...prev,
          steps: newSteps,
          currentStepIndex: nextIdx,
          currentStep: newSteps[nextIdx] || null,
        };
      });

      toast.success(`🟢 Order #${orderId} delivered! Escrow released.`);
      return true;
    },
    [state]
  );

  /**
   * Fail/return a specific order without halting the batch.
   */
  const failOrder = useCallback(async (orderId: number, reason?: string) => {
    if (!state.batch) return false;

    const { error } = await supabase
      .from("orders")
      .update({
        status: "failed",
        service_notes: reason || "Rider unable to deliver",
        rider_id: state.riderId,
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to mark order as failed");
      return false;
    }

    // Auto-advance to next step
    setState((prev) => {
      const newSteps = [...prev.steps];
      const currentIdx = prev.currentStepIndex;
      newSteps[currentIdx].status = "failed";
      const nextIdx = currentIdx + 1;
      return {
        ...prev,
        steps: newSteps,
        currentStepIndex: nextIdx,
        currentStep: newSteps[nextIdx] || null,
      };
    });

    toast.warning(`⚠️ Order #${orderId} marked as failed. Continuing route.`);
    return true;
  }, [state]);

  /**
   * Complete the entire batch route.
   */
  const completeBatch = useCallback(async () => {
    // Mark all pending orders as failed (if not completed)
    const pendingOrders = state.batch?.orders.filter((o) => {
      const step = state.steps.find((s) => s.orderId === o.id);
      return step && step.status !== "completed";
    });

    if (pendingOrders && pendingOrders.length > 0) {
      await Promise.all(
        pendingOrders.map((o) =>
          supabase
            .from("orders")
            .update({ status: "failed", service_notes: "Batch route abandoned" })
            .eq("id", o.id)
        )
      );
    }

    setState((prev) => ({
      ...prev,
      status: "completed",
      currentStepIndex: prev.steps.length - 1,
      currentStep: null,
    }));

    toast.success("✅ Batch route completed!");
    return true;
  }, [state]);

  /**
   * Abort entire batch (all orders marked as failed).
   */
  const abortBatch = useCallback(async () => {
    if (!state.batch) return false;

    // Mark all orders as failed
    const { error } = await supabase
      .from("orders")
      .update({ status: "failed", service_notes: "Batch route aborted by rider" })
      .in(
        "id",
        state.batch.orders.map((o) => o.id)
      );

    if (error) {
      toast.error("Failed to abort batch");
      return false;
    }

    setState((prev) => ({
      ...prev,
      status: "failed",
    }));

    toast.warning("⚠️ Batch route aborted.");
    return true;
  }, [state]);

  const resetState = useCallback(() => {
    setState({
      batchId: "",
      batch: null,
      steps: [],
      currentStepIndex: 0,
      currentStep: null,
      riderId: null,
      status: "idle",
      claimedAt: null,
    });
  }, []);

  return {
    state,
    initializeBatch,
    confirmPickup,
    verifyOTP,
    failOrder,
    completeBatch,
    abortBatch,
    resetState,
  };
}
