/**
 * SMART VARIANT GENERATOR
 * Intelligently transforms 1 Product/Service into 4+ high-converting variants
 * Based on buyer psychology and value laddering
 */

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  description: string;
  valueProposition: string;
  tag?: "Best Value" | "Most Popular" | "Premium" | "Starter";
  features: string[];
}

export interface GeneratedVariants {
  baseTitle: string;
  variants: ProductVariant[];
}

/**
 * Intelligent variant generation based on product/service type
 */
export const generateVariants = (
  productName: string,
  basePrice: number,
  itemType: "product" | "service",
  category?: string,
  description?: string
): GeneratedVariants => {
  // Normalize inputs
  const nameLower = productName.toLowerCase();
  const categoryLower = category?.toLowerCase() || "";
  const descLower = description?.toLowerCase() || "";

  // Infer product type
  const productType = inferProductType(nameLower, categoryLower, descLower, itemType);

  // Generate variants based on type
  let variants: ProductVariant[] = [];

  switch (productType) {
    case "food":
      variants = generateFoodVariants(productName, basePrice);
      break;
    case "fashion":
      variants = generateFashionVariants(productName, basePrice);
      break;
    case "service":
      variants = generateServiceVariants(productName, basePrice);
      break;
    case "subscription":
      variants = generateSubscriptionVariants(productName, basePrice);
      break;
    case "digital":
      variants = generateDigitalVariants(productName, basePrice);
      break;
    case "consultation":
      variants = generateConsultationVariants(productName, basePrice);
      break;
    default:
      variants = generateGenericVariants(productName, basePrice);
  }

  return {
    baseTitle: productName,
    variants,
  };
};

const inferProductType = (
  name: string,
  category: string,
  desc: string,
  itemType: string
): string => {
  const text = `${name} ${category} ${desc}`.toLowerCase();

  // Food keywords
  if (
    /food|meal|plate|dish|pizza|burger|chicken|soup|salad|juice|coffee|drink|cake|bread/.test(
      text
    )
  ) {
    return "food";
  }

  // Fashion keywords
  if (/fashion|dress|shirt|pants|shoes|bag|watch|jewelry|accessory|scarf|coat/.test(text)) {
    return "fashion";
  }

  // Subscription keywords
  if (
    /subscription|monthly|annual|netflix|spotify|plan|membership|package|account/.test(text)
  ) {
    return "subscription";
  }

  // Service keywords
  if (
    /service|consult|tutorial|training|lesson|class|coaching|consulting|design|cleaning/.test(
      text
    )
  ) {
    if (/consult|coaching|advice|mentor/.test(text)) {
      return "consultation";
    }
    return "service";
  }

  // Digital keywords
  if (
    /template|course|ebook|pdf|software|app|tool|plugin|script|video|guide|tutorial/.test(
      text
    )
  ) {
    return "digital";
  }

  return "generic";
};

/**
 * FOOD VARIANTS
 * Single → Combo → Family → Bulk
 */
const generateFoodVariants = (productName: string, basePrice: number): ProductVariant[] => {
  return [
    {
      id: "food-single",
      title: `Single ${productName}`,
      price: basePrice,
      description: `One serving of ${productName} — perfect for individuals`,
      valueProposition: "Quick & Convenient",
      tag: "Starter",
      features: [
        "1 serving",
        "Fast delivery",
        "Perfect for one",
      ],
    },
    {
      id: "food-combo",
      title: `${productName} Combo Meal`,
      price: Math.round(basePrice * 1.8),
      originalPrice: Math.round(basePrice * 2),
      description: `${productName} with sides and drink`,
      valueProposition: "Complete meal experience",
      tag: "Most Popular",
      features: [
        "Main + 2 sides",
        "Free beverage",
        "Better value",
      ],
    },
    {
      id: "food-family",
      title: `Family Pack (${productName} × 4)`,
      price: Math.round(basePrice * 3.2),
      originalPrice: Math.round(basePrice * 4),
      description: `Perfect for family gatherings and group meals`,
      valueProposition: "Best value for families",
      tag: "Best Value",
      features: [
        "4 servings",
        "Share & save 20%",
        "Feeds 4 people",
      ],
    },
    {
      id: "food-catering",
      title: `Catering Package (${productName})`,
      price: Math.round(basePrice * 8),
      originalPrice: Math.round(basePrice * 10),
      description: `Bulk order for events, parties, or corporate orders`,
      valueProposition: "Maximum savings for bulk",
      tag: "Premium",
      features: [
        "10+ servings",
        "Event-ready",
        "Custom packaging",
      ],
    },
  ];
};

/**
 * FASHION VARIANTS
 * Single → Bundle → Seasonal → Premium
 */
const generateFashionVariants = (productName: string, basePrice: number): ProductVariant[] => {
  return [
    {
      id: "fashion-single",
      title: `${productName} (Single)`,
      price: basePrice,
      description: `One classic ${productName}`,
      valueProposition: "Timeless style",
      tag: "Starter",
      features: [
        "Premium quality",
        "Classic design",
        "Easy styling",
      ],
    },
    {
      id: "fashion-bundle",
      title: `${productName} Bundle (2-Pack)`,
      price: Math.round(basePrice * 1.9),
      originalPrice: Math.round(basePrice * 2),
      description: `Get two colors or styles`,
      valueProposition: "Save with a pair",
      tag: "Most Popular",
      features: [
        "2 pieces",
        "Mix & match colors",
        "5% savings",
      ],
    },
    {
      id: "fashion-collection",
      title: `Complete Collection (3-Piece)`,
      price: Math.round(basePrice * 2.7),
      originalPrice: Math.round(basePrice * 3),
      description: `Mix and match with seasonal pieces`,
      valueProposition: "Complete your wardrobe",
      tag: "Best Value",
      features: [
        "3 coordinating pieces",
        "10% savings",
        "Seasonal styles",
      ],
    },
    {
      id: "fashion-premium",
      title: `Premium Collection + Styling`,
      price: Math.round(basePrice * 4),
      originalPrice: Math.round(basePrice * 5),
      description: `Deluxe items with personalized styling service`,
      valueProposition: "Complete package with expert guidance",
      tag: "Premium",
      features: [
        "Premium materials",
        "Style consultation",
        "Gift packaging",
      ],
    },
  ];
};

/**
 * SERVICE VARIANTS
 * Basic → Standard → Deluxe → VIP
 */
const generateServiceVariants = (productName: string, basePrice: number): ProductVariant[] => {
  return [
    {
      id: "service-basic",
      title: `${productName} — Basic`,
      price: basePrice,
      description: `Core ${productName} service`,
      valueProposition: "Get started affordably",
      tag: "Starter",
      features: [
        "Essential features",
        "Standard delivery",
        "Email support",
      ],
    },
    {
      id: "service-standard",
      title: `${productName} — Standard (Most Popular)`,
      price: Math.round(basePrice * 1.7),
      originalPrice: Math.round(basePrice * 2),
      description: `Full-featured ${productName} service`,
      valueProposition: "Best value for most users",
      tag: "Most Popular",
      features: [
        "All features included",
        "Priority support",
        "Custom options",
      ],
    },
    {
      id: "service-deluxe",
      title: `${productName} — Deluxe (Best Value)`,
      price: Math.round(basePrice * 2.4),
      originalPrice: Math.round(basePrice * 3),
      description: `Premium service with all bells and whistles`,
      valueProposition: "Comprehensive solution",
      tag: "Best Value",
      features: [
        "Everything + extras",
        "24/7 phone support",
        "Unlimited revisions",
      ],
    },
    {
      id: "service-vip",
      title: `${productName} — VIP Experience`,
      price: Math.round(basePrice * 3.8),
      description: `Exclusive, white-glove ${productName} service`,
      valueProposition: "Premium, personalized attention",
      tag: "Premium",
      features: [
        "Dedicated account manager",
        "Priority scheduling",
        "Bespoke customization",
      ],
    },
  ];
};

/**
 * SUBSCRIPTION VARIANTS
 * Monthly → Quarterly → Annual → Annual + Bonus
 */
const generateSubscriptionVariants = (
  productName: string,
  basePrice: number
): ProductVariant[] => {
  return [
    {
      id: "sub-monthly",
      title: `${productName} — Monthly`,
      price: basePrice,
      description: `Full access for one month`,
      valueProposition: "Try it out",
      tag: "Starter",
      features: [
        "Full access",
        "Cancel anytime",
        "No commitment",
      ],
    },
    {
      id: "sub-quarterly",
      title: `${productName} — 3 Months (Most Popular)`,
      price: Math.round(basePrice * 2.8),
      originalPrice: Math.round(basePrice * 3),
      description: `Get 3 months of access with 6% savings`,
      valueProposition: "Best balance of value & flexibility",
      tag: "Most Popular",
      features: [
        "3 months access",
        "Save 6%",
        "Better value",
      ],
    },
    {
      id: "sub-annual",
      title: `${productName} — Annual (Best Value)`,
      price: Math.round(basePrice * 10.8),
      originalPrice: Math.round(basePrice * 12),
      description: `Full year of access with 10% savings`,
      valueProposition: "Maximum savings on annual commitment",
      tag: "Best Value",
      features: [
        "12 months access",
        "Save 10%",
        "Lowest cost per month",
      ],
    },
    {
      id: "sub-annual-bonus",
      title: `${productName} — Annual + Bonus Perks`,
      price: Math.round(basePrice * 13),
      originalPrice: Math.round(basePrice * 15),
      description: `Full year + exclusive bonuses and extras`,
      valueProposition: "Premium yearly package",
      tag: "Premium",
      features: [
        "12 months access",
        "Exclusive bonuses",
        "Priority support",
      ],
    },
  ];
};

/**
 * DIGITAL VARIANTS
 * Basic → Standard → Premium → Lifetime
 */
const generateDigitalVariants = (productName: string, basePrice: number): ProductVariant[] => {
  return [
    {
      id: "digital-single",
      title: `${productName} — Single License`,
      price: basePrice,
      description: `Personal use license for one user`,
      valueProposition: "Start small",
      tag: "Starter",
      features: [
        "1 user",
        "Lifetime access",
        "Email support",
      ],
    },
    {
      id: "digital-team",
      title: `${productName} — Team License (Most Popular)`,
      price: Math.round(basePrice * 2.5),
      originalPrice: Math.round(basePrice * 3),
      description: `Up to 5 team members`,
      valueProposition: "Perfect for small teams",
      tag: "Most Popular",
      features: [
        "Up to 5 users",
        "Cloud sync",
        "Priority support",
      ],
    },
    {
      id: "digital-business",
      title: `${productName} — Business License (Best Value)`,
      price: Math.round(basePrice * 4),
      originalPrice: Math.round(basePrice * 5),
      description: `Up to 20 users with admin controls`,
      valueProposition: "Enterprise features at mid-market price",
      tag: "Best Value",
      features: [
        "Up to 20 users",
        "Advanced analytics",
        "24/7 support",
      ],
    },
    {
      id: "digital-enterprise",
      title: `${productName} — Enterprise + Support`,
      price: Math.round(basePrice * 6),
      description: `Unlimited users with dedicated support`,
      valueProposition: "Complete solution for large teams",
      tag: "Premium",
      features: [
        "Unlimited users",
        "Dedicated support",
        "Custom integrations",
      ],
    },
  ];
};

/**
 * CONSULTATION VARIANTS
 * Brief → Standard → Deep Dive → Ongoing
 */
const generateConsultationVariants = (
  productName: string,
  basePrice: number
): ProductVariant[] => {
  return [
    {
      id: "consult-brief",
      title: `${productName} — Quick Call (30 min)`,
      price: basePrice,
      description: `Quick consultation to get started`,
      valueProposition: "Low-cost entry point",
      tag: "Starter",
      features: [
        "30 minutes",
        "Initial assessment",
        "Action plan outline",
      ],
    },
    {
      id: "consult-standard",
      title: `${productName} — Standard Session (1 hour) (Most Popular)`,
      price: Math.round(basePrice * 2),
      originalPrice: Math.round(basePrice * 2.5),
      description: `Full consultation with recommendations`,
      valueProposition: "Most popular choice",
      tag: "Most Popular",
      features: [
        "1 hour session",
        "Detailed analysis",
        "Written recommendations",
      ],
    },
    {
      id: "consult-deep",
      title: `${productName} — Deep Dive (90 min) (Best Value)`,
      price: Math.round(basePrice * 2.7),
      originalPrice: Math.round(basePrice * 3.5),
      description: `Comprehensive consultation with detailed plan`,
      valueProposition: "Complete solution with implementation plan",
      tag: "Best Value",
      features: [
        "90 minutes",
        "Complete strategy",
        "Implementation roadmap",
      ],
    },
    {
      id: "consult-ongoing",
      title: `${productName} — Ongoing Support (Monthly)`,
      price: Math.round(basePrice * 4),
      description: `Continuous consultation and guidance`,
      valueProposition: "Long-term partnership",
      tag: "Premium",
      features: [
        "4 sessions/month",
        "Ongoing support",
        "Priority access",
      ],
    },
  ];
};

/**
 * GENERIC FALLBACK
 * Tier-based variants for unknown types
 */
const generateGenericVariants = (productName: string, basePrice: number): ProductVariant[] => {
  return [
    {
      id: "generic-starter",
      title: `${productName} — Starter`,
      price: basePrice,
      description: `Entry-level option for ${productName}`,
      valueProposition: "Affordable way to get started",
      tag: "Starter",
      features: [
        "Basic access",
        "Standard support",
        "Essential features",
      ],
    },
    {
      id: "generic-standard",
      title: `${productName} — Standard (Most Popular)`,
      price: Math.round(basePrice * 1.8),
      originalPrice: Math.round(basePrice * 2),
      description: `Full-featured ${productName}`,
      valueProposition: "Best value option",
      tag: "Most Popular",
      features: [
        "Complete features",
        "Priority support",
        "Premium extras",
      ],
    },
    {
      id: "generic-professional",
      title: `${productName} — Professional (Best Value)`,
      price: Math.round(basePrice * 2.7),
      originalPrice: Math.round(basePrice * 3),
      description: `Advanced ${productName} with extras`,
      valueProposition: "Professional-grade solution",
      tag: "Best Value",
      features: [
        "Advanced features",
        "24/7 support",
        "Premium quality",
      ],
    },
    {
      id: "generic-premium",
      title: `${productName} — Premium Edition`,
      price: Math.round(basePrice * 4),
      description: `Ultimate ${productName} experience`,
      valueProposition: "Top-tier solution",
      tag: "Premium",
      features: [
        "All features included",
        "Exclusive access",
        "VIP treatment",
      ],
    },
  ];
};
