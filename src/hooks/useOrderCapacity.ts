import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";

export interface CapacityState {
  capacity: number;
  statusColor: string;
  statusLabel: string;
  isAtCapacity: boolean;
}

export const useOrderCapacity = (): CapacityState => {
  const { profile, refreshProfile } = useAuth();
  const capacity = profile?.order_capacity ?? 50;

  const getStatusColor = (cap: number): string => {
    if (cap === 0) return "text-red-600";
    if (cap <= 15) return "text-orange-500";
    return "text-primary"; // Gold (#B37C1C)
  };

  const getStatusLabel = (cap: number): string => {
    if (cap === 0) return "No capacity";
    if (cap <= 15) return "Low capacity";
    return "Capacity available";
  };

  const getBgColor = (cap: number): string => {
    if (cap === 0) return "bg-red-50";
    if (cap <= 15) return "bg-orange-50";
    return "bg-amber-50"; // Light gold-ish
  };

  return {
    capacity,
    statusColor: getStatusColor(capacity),
    statusLabel: getStatusLabel(capacity),
    isAtCapacity: capacity === 0,
  };
};

export const getCapacityStyles = (capacity: number) => {
  if (capacity === 0) {
    return {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: "text-red-600",
    };
  }
  if (capacity <= 15) {
    return {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      icon: "text-orange-600",
    };
  }
  return {
    bg: "bg-amber-50",
    text: "text-primary",
    border: "border-primary/20",
    icon: "text-primary",
  };
};
