/**
 * VARIANT TAG STYLING
 * Provides styling and visual treatment for variant tags
 */

export const getTagStyles = (tag?: "Best Value" | "Most Popular" | "Premium" | "Starter") => {
  switch (tag) {
    case "Most Popular":
      return {
        backgroundColor: "bg-blue-100",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        emoji: "⭐",
        label: "Most Popular",
      };
    case "Best Value":
      return {
        backgroundColor: "bg-green-100",
        textColor: "text-green-700",
        borderColor: "border-green-200",
        emoji: "💚",
        label: "Best Value",
      };
    case "Premium":
      return {
        backgroundColor: "bg-purple-100",
        textColor: "text-purple-700",
        borderColor: "border-purple-200",
        emoji: "👑",
        label: "Premium",
      };
    case "Starter":
      return {
        backgroundColor: "bg-gray-100",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
        emoji: "🚀",
        label: "Starter",
      };
    default:
      return {
        backgroundColor: "bg-gray-100",
        textColor: "text-gray-700",
        borderColor: "border-gray-200",
        emoji: "📦",
        label: "Standard",
      };
  }
};

/**
 * Get priority order for sorting variants (for featured display)
 */
export const getTagPriority = (tag?: string): number => {
  switch (tag) {
    case "Most Popular":
      return 1;
    case "Best Value":
      return 2;
    case "Premium":
      return 3;
    case "Starter":
      return 4;
    default:
      return 5;
  }
};

/**
 * Get recommended ribbon/badge text for UI
 */
export const getTagBadgeText = (tag?: string): string | null => {
  if (!tag) return null;
  return tag === "Most Popular"
    ? "⭐ Most Popular"
    : tag === "Best Value"
      ? "💚 Best Value"
      : tag === "Premium"
        ? "👑 Premium"
        : tag === "Starter"
          ? "🚀 Starter"
          : null;
};
