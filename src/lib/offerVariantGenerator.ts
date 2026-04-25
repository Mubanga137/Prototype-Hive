/**
 * Offer Variant Auto-Generation Engine
 * Automatically generates minimum 4 variants per base offer item
 */

export interface GeneratedVariant {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  description?: string;
}

/**
 * Generate variants for a service-type offer
 * Creates time/duration-based variants
 */
function generateServiceVariants(
  baseName: string,
  basePrice: number,
  quantity: number = 1
): GeneratedVariant[] {
  const variants: GeneratedVariant[] = [];
  const baseId = baseName.toLowerCase().replace(/\s+/g, "-");

  // Duration variants: Quick, Standard, Extended
  variants.push({
    id: `${baseId}-quick`,
    name: `${baseName} - Quick (30 min)`,
    sku: `${baseId}-30`,
    quantity: quantity,
    price: Math.round(basePrice * 0.7), // 30% discount for quick
    description: "Express service - 30 minutes",
  });

  variants.push({
    id: `${baseId}-standard`,
    name: `${baseName} - Standard (1 hour)`,
    sku: `${baseId}-60`,
    quantity: quantity,
    price: basePrice, // Standard rate
    description: "Regular service - 1 hour",
  });

  variants.push({
    id: `${baseId}-extended`,
    name: `${baseName} - Extended (2 hours)`,
    sku: `${baseId}-120`,
    quantity: quantity,
    price: Math.round(basePrice * 1.8), // 80% premium for extended
    description: "Extended service - 2 hours",
  });

  variants.push({
    id: `${baseId}-vip`,
    name: `${baseName} - VIP (Full Day)`,
    sku: `${baseId}-full`,
    quantity: quantity,
    price: Math.round(basePrice * 4), // Full day rate
    description: "Full-day VIP service",
  });

  return variants;
}

/**
 * Generate variants for a physical product
 * Creates quantity/bundle-based variants
 */
function generatePhysicalVariants(
  baseName: string,
  basePrice: number,
  stockQuantity: number = 10
): GeneratedVariant[] {
  const variants: GeneratedVariant[] = [];
  const baseId = baseName.toLowerCase().replace(/\s+/g, "-");

  // Single unit
  variants.push({
    id: `${baseId}-single`,
    name: `${baseName} - Single Unit`,
    sku: `${baseId}-1x`,
    quantity: Math.min(stockQuantity, 50),
    price: basePrice,
    description: "Buy 1 unit",
  });

  // Bundle: 3 units with discount
  variants.push({
    id: `${baseId}-bundle3`,
    name: `${baseName} - Pack of 3`,
    sku: `${baseId}-3x`,
    quantity: Math.min(stockQuantity, 30),
    price: Math.round(basePrice * 3 * 0.85), // 15% bundle discount
    description: "Buy 3 units - Save 15%",
  });

  // Bundle: 6 units with bigger discount
  variants.push({
    id: `${baseId}-bundle6`,
    name: `${baseName} - Bundle of 6`,
    sku: `${baseId}-6x`,
    quantity: Math.min(stockQuantity, 20),
    price: Math.round(basePrice * 6 * 0.75), // 25% bundle discount
    description: "Buy 6 units - Save 25%",
  });

  // Bulk: 12 units wholesale
  variants.push({
    id: `${baseId}-bulk12`,
    name: `${baseName} - Wholesale (12+)`,
    sku: `${baseId}-bulk`,
    quantity: Math.min(stockQuantity, 10),
    price: Math.round(basePrice * 12 * 0.65), // 35% wholesale discount
    description: "Bulk order - 12+ units at 35% off",
  });

  return variants;
}

/**
 * Generate variants for a digital product
 * Creates license/access level variants
 */
function generateDigitalVariants(
  baseName: string,
  basePrice: number
): GeneratedVariant[] {
  const variants: GeneratedVariant[] = [];
  const baseId = baseName.toLowerCase().replace(/\s+/g, "-");

  // Personal license
  variants.push({
    id: `${baseId}-personal`,
    name: `${baseName} - Personal License`,
    sku: `${baseId}-personal`,
    quantity: 1,
    price: basePrice,
    description: "Personal use only",
  });

  // Commercial license
  variants.push({
    id: `${baseId}-commercial`,
    name: `${baseName} - Commercial License`,
    sku: `${baseId}-commercial`,
    quantity: 1,
    price: Math.round(basePrice * 3), // 3x for commercial
    description: "Commercial use rights",
  });

  // Team license (up to 5 users)
  variants.push({
    id: `${baseId}-team`,
    name: `${baseName} - Team License (5 users)`,
    sku: `${baseId}-team`,
    quantity: 1,
    price: Math.round(basePrice * 2.5),
    description: "For 5 team members",
  });

  // Enterprise license (unlimited)
  variants.push({
    id: `${baseId}-enterprise`,
    name: `${baseName} - Enterprise License`,
    sku: `${baseId}-enterprise`,
    quantity: 1,
    price: Math.round(basePrice * 5),
    description: "Unlimited company-wide use",
  });

  return variants;
}

/**
 * Main function: Generate 4+ variants for any offer
 */
export function generateOfferVariants(
  itemName: string,
  itemType: "physical" | "digital" | "service",
  basePrice: number,
  stockQuantity: number = 10
): GeneratedVariant[] {
  switch (itemType) {
    case "service":
      return generateServiceVariants(itemName, basePrice, stockQuantity);
    case "physical":
      return generatePhysicalVariants(itemName, basePrice, stockQuantity);
    case "digital":
      return generateDigitalVariants(itemName, basePrice);
    default:
      return generatePhysicalVariants(itemName, basePrice, stockQuantity);
  }
}

/**
 * Check if variants need to be generated (empty or missing)
 */
export function shouldAutoGenerateVariants(variants?: Array<any> | null): boolean {
  return !variants || variants.length === 0;
}
