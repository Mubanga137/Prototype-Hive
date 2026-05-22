import { useEffect, useState, useMemo } from 'react';
import HeroSectionEditorial from './HeroSectionEditorial';
import { generateVariants } from '@/lib/variantGenerator';
import {
  TrustBar,
  ActivityFeed,
  HowItWorks,
  WhatYouGet,
  AvailabilityStatus,
  FeaturedOffers,
  ReviewsSection,
  FullOfferGrid,
} from './StorefrontSections';

export interface StorefrontPreviewLiveEditorialProps {
  storeId: number;
  storeName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl?: string;
  logoUrl?: string;
  description?: string;
  whatsappNumber?: string;
  businessType?: string;
  offers?: any[];
  isVerified?: boolean;
}

const StorefrontPreviewLiveEditorial = ({
  storeId,
  storeName,
  heroTitle,
  heroSubtitle,
  heroImageUrl,
  logoUrl,
  description,
  whatsappNumber,
  businessType,
  offers = [],
  isVerified = false,
}: StorefrontPreviewLiveEditorialProps) => {
  const [previewKey, setPreviewKey] = useState(0);

  // Ensure all offers have variants
  const offersWithVariants = useMemo(() => {
    return (offers || []).map((offer: any) => {
      if (offer.variants && offer.variants.length > 0) {
        return offer;
      }

      const generated = generateVariants(
        offer.product_name,
        offer.price || 1000,
        offer.item_type === "service" ? "service" : "product",
        offer.category,
        offer.description
      );

      return {
        ...offer,
        variants: generated.variants,
      };
    });
  }, [offers]);

  // Force re-render when key props change (including heroImageUrl changes)
  useEffect(() => {
    setPreviewKey((prev) => prev + 1);
  }, [storeName, heroImageUrl, logoUrl, heroTitle, heroSubtitle, description, offersWithVariants.length]);

  return (
    <div
      key={previewKey}
      className="h-full overflow-y-auto bg-white"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* SECTION 1: HERO SECTION - Editorial Layout */}
      <HeroSectionEditorial
        storeName={storeName}
        heroTitle={heroTitle}
        heroSubtitle={heroSubtitle}
        heroImageUrl={heroImageUrl}
        logoUrl={logoUrl}
        description={description}
        whatsappNumber={whatsappNumber}
        onMessageClick={() => {}}
        onShopClick={() => {}}
      />

      {/* SECTION 3: TRUST BAR */}
      <TrustBar />

      {/* SECTION 4: ACTIVITY FEED */}
      <ActivityFeed />

      {/* SECTION 5: HOW IT WORKS */}
      <HowItWorks businessType={businessType} />

      {/* SECTION 6: WHAT YOU GET */}
      <WhatYouGet businessType={businessType} />

      {/* SECTION 7: AVAILABILITY STATUS */}
      <AvailabilityStatus />

      {/* SECTION 8: FEATURED OFFERS */}
      <FeaturedOffers offers={offersWithVariants.slice(0, 4)} />

      {/* SECTION 9: REVIEWS */}
      <ReviewsSection />

      {/* SECTION 10: FULL OFFER GRID */}
      <FullOfferGrid offers={offersWithVariants} />

      {/* Footer spacing */}
      <div className="h-12" />
    </div>
  );
};

export default StorefrontPreviewLiveEditorial;
