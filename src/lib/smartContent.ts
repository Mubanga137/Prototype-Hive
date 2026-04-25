/**
 * Smart Content Auto-Generation System
 * Generates content for store sections to eliminate empty states
 */

export interface SmartContent {
  howItWorks: HowItWorksStep[];
  whatYouGet: string[];
  availability: AvailabilityStatus;
}

export interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
  icon: string;
}

export interface AvailabilityStatus {
  status: "Open" | "Busy" | "Closing Soon" | "Closed";
  message: string;
  badge: string;
}

/**
 * Generate "How It Works" steps based on store type
 */
export function generateHowItWorks(
  storeType?: string | null,
  hasPhysicalProducts?: boolean,
  hasServices?: boolean
): HowItWorksStep[] {
  const steps: HowItWorksStep[] = [];

  if (hasServices) {
    steps.push(
      {
        number: 1,
        title: "Browse Services",
        description: "Explore our wide range of professional services",
        icon: "search",
      },
      {
        number: 2,
        title: "Select & Book",
        description: "Choose your preferred service and pick a time",
        icon: "calendar",
      },
      {
        number: 3,
        title: "Confirm Payment",
        description: "Secure checkout with multiple payment options",
        icon: "credit-card",
      },
      {
        number: 4,
        title: "Enjoy Service",
        description: "Get professional service delivered on time",
        icon: "check-circle",
      }
    );
  } else {
    steps.push(
      {
        number: 1,
        title: "Browse Products",
        description: "Explore our carefully curated collection",
        icon: "shopping-bag",
      },
      {
        number: 2,
        title: "Select Items",
        description: "Add your favorite products to cart",
        icon: "plus-circle",
      },
      {
        number: 3,
        title: "Checkout",
        description: "Secure payment and delivery details",
        icon: "credit-card",
      },
      {
        number: 4,
        title: "Receive & Enjoy",
        description: "Get your order delivered to your door",
        icon: "box",
      }
    );
  }

  return steps;
}

/**
 * Generate "What You Get" benefits
 */
export function generateWhatYouGet(
  description?: string | null,
  hasPhysicalProducts?: boolean,
  hasServices?: boolean,
  hasDigitalProducts?: boolean
): string[] {
  const benefits: string[] = [];

  // Always include these core benefits
  benefits.push("Quality guaranteed products and services");
  benefits.push("Fast and reliable delivery");

  // Add type-specific benefits
  if (hasServices) {
    benefits.push("Professional service delivery");
    benefits.push("Flexible booking and rescheduling");
  }

  if (hasPhysicalProducts) {
    benefits.push("Secure packaging and handling");
    benefits.push("Track your orders in real-time");
  }

  if (hasDigitalProducts) {
    benefits.push("Instant access to digital products");
    benefits.push("Lifetime access and support");
  }

  benefits.push("24/7 customer support");
  benefits.push("Money-back guarantee");

  return benefits;
}

/**
 * Generate availability status based on current time and store hours
 */
export function generateAvailabilityStatus(): AvailabilityStatus {
  const hour = new Date().getHours();
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

  // Business hours: 8 AM - 6 PM on weekdays, 9 AM - 4 PM on weekends
  const opening = isWeekend ? 9 : 8;
  const closing = isWeekend ? 16 : 18;

  if (hour < opening) {
    return {
      status: "Closed",
      message: `Opens at ${opening}:00 AM`,
      badge: "Opens Soon",
    };
  } else if (hour >= closing - 2 && hour < closing) {
    return {
      status: "Closing Soon",
      message: `Closing at ${closing}:00 PM`,
      badge: "Closing Soon",
    };
  } else if (hour >= closing) {
    return {
      status: "Closed",
      message: `Opens at ${opening}:00 AM tomorrow`,
      badge: "Closed",
    };
  } else if (hour >= opening + 6 && hour < closing - 4) {
    return {
      status: "Busy",
      message: "High demand - expect longer wait times",
      badge: "Busy",
    };
  }

  return {
    status: "Open",
    message: `Open until ${closing}:00 PM`,
    badge: "Open Now",
  };
}

/**
 * Generate complete smart content for a store
 */
export function generateSmartContent(
  storeDescription?: string | null,
  hasPhysicalProducts?: boolean,
  hasServices?: boolean,
  hasDigitalProducts?: boolean
): SmartContent {
  return {
    howItWorks: generateHowItWorks(null, hasPhysicalProducts, hasServices),
    whatYouGet: generateWhatYouGet(
      storeDescription,
      hasPhysicalProducts,
      hasServices,
      hasDigitalProducts
    ),
    availability: generateAvailabilityStatus(),
  };
}
