/**
 * VARIANT VALIDATION SYSTEM
 * Ensures products/services meet variant requirements
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a product/service has minimum required variants
 */
export const validateVariants = (variants: any[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // HARD REQUIREMENT: Minimum 4 variants
  if (!variants || variants.length < 4) {
    errors.push(
      `Each product/service must have at least 4 variants. Currently has ${variants?.length || 0}.`
    );
  }

  // Check for duplicates (warning)
  const uniqueTitles = new Set(variants?.map((v: any) => v.title) || []);
  if (uniqueTitles.size !== (variants?.length || 0)) {
    warnings.push("Some variants have duplicate titles. Consider making them more distinct.");
  }

  // Check for meaningful price differentiation
  if (variants && variants.length >= 2) {
    const prices = variants.map((v: any) => v.price).sort((a: number, b: number) => a - b);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];

    // If all prices are the same, that's a problem
    if (firstPrice === lastPrice) {
      errors.push("All variants have the same price. Variants should have different price tiers.");
    }

    // If there's less than 20% price difference, warn
    const priceDiff = ((lastPrice - firstPrice) / firstPrice) * 100;
    if (priceDiff < 20) {
      warnings.push(
        `Price differentiation is low (${priceDiff.toFixed(1)}% difference). Consider larger tiers.`
      );
    }
  }

  // Check for value differentiation
  const hasMostPopular = variants?.some((v: any) => v.tag === "Most Popular");
  const hasBestValue = variants?.some((v: any) => v.tag === "Best Value");

  if (!hasMostPopular) {
    warnings.push('No "Most Popular" variant found. Consider marking one as such.');
  }
  if (!hasBestValue) {
    warnings.push('No "Best Value" variant found. Consider marking one as such.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Check if a product can be published
 */
export const canPublish = (variants: any[]): boolean => {
  const result = validateVariants(variants);
  return result.isValid;
};

/**
 * Get user-friendly error message
 */
export const getValidationMessage = (result: ValidationResult): string => {
  if (result.isValid) {
    return "Product is ready to publish!";
  }

  const errorText = result.errors
    .map((e) => `• ${e}`)
    .join("\n");

  return `Cannot publish product:\n\n${errorText}`;
};

/**
 * Ensure a variant array has at least 4 items
 * If not, this will be flagged as invalid and block publishing
 */
export const enforceMinimumVariants = (variants: any[]): { 
  isValid: boolean; 
  minVariantsRequired: number; 
  currentCount: number;
  message: string;
} => {
  const MIN_VARIANTS = 4;
  const currentCount = variants?.length || 0;
  const isValid = currentCount >= MIN_VARIANTS;

  return {
    isValid,
    minVariantsRequired: MIN_VARIANTS,
    currentCount,
    message: isValid
      ? `✓ Product has ${currentCount} variants (minimum ${MIN_VARIANTS})`
      : `✗ Product needs at least ${MIN_VARIANTS} variants (currently has ${currentCount})`,
  };
};
