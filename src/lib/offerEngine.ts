/**
 * Offer Auto-Generation Engine
 * Automatically generates minimum 4 variants per base item
 */

export interface OfferVariant {
  id: string;
  name: string;
  price: number;
  description: string;
  type: 'single' | 'bundle' | 'bulk' | 'preorder' | 'family' | 'subscription';
  quantity?: number;
  duration?: string;
  discount?: number;
}

export interface AutoGenOffers {
  baseItem: {
    id: number;
    name: string;
    basePrice: number;
    category: string;
    itemType: 'physical' | 'digital' | 'service';
  };
  variants: OfferVariant[];
}

/**
 * Generate minimum 4 automatic variants from a base item
 */
export function generateOfferVariants(
  itemId: number,
  itemName: string,
  basePrice: number,
  category: string,
  itemType: 'physical' | 'digital' | 'service'
): OfferVariant[] {
  const variants: OfferVariant[] = [];

  if (itemType === 'physical' || itemType === 'digital') {
    // Single unit
    variants.push({
      id: `${itemId}-single`,
      name: `${itemName}`,
      price: basePrice,
      description: 'Single unit',
      type: 'single',
      quantity: 1,
    });

    // Bundle with related item (themed variant)
    variants.push({
      id: `${itemId}-bundle`,
      name: `${itemName} + Accessory Pack`,
      price: Math.round(basePrice * 1.45),
      description: 'Bundle includes main item + complementary items',
      type: 'bundle',
      quantity: 1,
      discount: 10,
    });

    // Family/Bulk pack
    variants.push({
      id: `${itemId}-family`,
      name: `${itemName} (Family Pack x3)`,
      price: Math.round(basePrice * 2.7),
      description: 'Set of 3 units for families or teams',
      type: 'family',
      quantity: 3,
      discount: 10,
    });

    // Bulk order
    variants.push({
      id: `${itemId}-bulk`,
      name: `${itemName} (Wholesale x10)`,
      price: Math.round(basePrice * 8.5),
      description: 'Bulk quantity for businesses',
      type: 'bulk',
      quantity: 10,
      discount: 15,
    });

    // Pre-order for next batch
    variants.push({
      id: `${itemId}-preorder`,
      name: `${itemName} (Pre-Order - Next Batch)`,
      price: Math.round(basePrice * 0.9),
      description: 'Reserve now for next stock arrival',
      type: 'preorder',
      duration: 'Delivery in 3-5 days',
    });
  } else if (itemType === 'service') {
    // One-time service
    variants.push({
      id: `${itemId}-single`,
      name: `${itemName} (One-Time)`,
      price: basePrice,
      description: 'Single service session',
      type: 'single',
      duration: '1 hour',
    });

    // Package (3 sessions)
    variants.push({
      id: `${itemId}-package`,
      name: `${itemName} (3-Session Package)`,
      price: Math.round(basePrice * 2.7),
      description: 'Three sessions with 10% discount',
      type: 'bundle',
      quantity: 3,
      discount: 10,
      duration: '1 hour each',
    });

    // Monthly subscription
    variants.push({
      id: `${itemId}-monthly`,
      name: `${itemName} (Monthly Subscription)`,
      price: Math.round(basePrice * 3.5),
      description: '4 sessions per month with priority booking',
      type: 'subscription',
      quantity: 4,
      discount: 15,
      duration: '1 month',
    });

    // Unlimited monthly
    variants.push({
      id: `${itemId}-unlimited`,
      name: `${itemName} (Unlimited Monthly)`,
      price: Math.round(basePrice * 5),
      description: 'Unlimited sessions throughout the month',
      type: 'subscription',
      discount: 20,
      duration: '1 month',
    });

    // Corporate package
    variants.push({
      id: `${itemId}-corporate`,
      name: `${itemName} (Corporate Package)`,
      price: Math.round(basePrice * 15),
      description: 'Customized for up to 10 team members',
      type: 'bulk',
      quantity: 10,
      discount: 25,
      duration: '1 month',
    });
  }

  return variants;
}

/**
 * Get smart autofill content for various sections
 */
export function generateSmartSectionContent(
  businessType: string,
  storeName: string
): {
  howItWorks: string[];
  whatYouGet: string[];
  availabilityStatus: string;
} {
  const baseHowItWorks = [
    'Browse available offers',
    'Select quantity and options',
    'Checkout securely',
    'Receive instantly or as scheduled',
  ];

  const baseWhatYouGet = [
    '✓ High-quality ' + (businessType?.toLowerCase() || 'products'),
    '✓ Fast and reliable delivery',
    '✓ 24/7 customer support',
    '✓ Secure payment guarantee',
  ];

  const businessTypeMap: Record<string, string[]> = {
    food: [
      'Browse fresh daily menu',
      'Select dishes and portions',
      'Pay securely online',
      'Pick up or get delivered hot and fresh',
    ],
    fashion: [
      'Browse trending collections',
      'Select size and color',
      'Checkout with secure payment',
      'Receive packaged in 2-3 days',
    ],
    services: [
      'Browse service options',
      'Select date and time',
      'Confirm booking',
      'Service delivered as scheduled',
    ],
    digital: [
      'Browse digital products',
      'Add to cart',
      'Complete checkout',
      'Instant download or access',
    ],
  };

  const businessTypeMapWhatYouGet: Record<string, string[]> = {
    food: [
      '✓ Fresh, quality ingredients',
      '✓ Hot and fast delivery',
      '✓ Hygienic food handling',
      '✓ Satisfaction guarantee',
    ],
    fashion: [
      '✓ Premium quality fabrics',
      '✓ Latest styles and trends',
      '✓ Perfect fit assurance',
      '✓ Free returns within 7 days',
    ],
    services: [
      '✓ Professional service providers',
      '✓ Flexible scheduling',
      '✓ Quality workmanship',
      '✓ Customer satisfaction promise',
    ],
    digital: [
      '✓ Instant access',
      '✓ Lifetime downloads',
      '✓ Money-back guarantee',
      '✓ Premium support',
    ],
  };

  const matchedType = Object.keys(businessTypeMap).find((key) =>
    businessType?.toLowerCase().includes(key)
  );

  return {
    howItWorks: matchedType ? businessTypeMap[matchedType] : baseHowItWorks,
    whatYouGet: matchedType ? businessTypeMapWhatYouGet[matchedType] : baseWhatYouGet,
    availabilityStatus: '🔥 Available Today | Next batch arriving tomorrow',
  };
}
