import { useEffect, useState } from 'react';
import HeroSection from './HeroSection';
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

export interface StorefrontPreviewLiveProps {
  storeId: number;
  brandName: string;
  description?: string;
  bannerUrl?: string;
  logoUrl?: string;
  storeSlug?: string;
  whatsappNumber?: string;
  businessType?: string;
  offers?: any[];
}

const StorefrontPreviewLive = ({
  storeId,
  brandName,
  description,
  bannerUrl,
  logoUrl,
  storeSlug,
  whatsappNumber,
  businessType,
  offers = [],
}: StorefrontPreviewLiveProps) => {
  const [previewKey, setPreviewKey] = useState(0);

  // Force re-render when key props change
  useEffect(() => {
    setPreviewKey((prev) => prev + 1);
  }, [brandName, bannerUrl, logoUrl, description, offers.length]);

  return (
    <div
      key={previewKey}
      className="h-full overflow-y-auto bg-white"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* SECTION 1: HERO SECTION */}
      <HeroSection
        storeName={brandName}
        tagline="Premium Quality, Fast Delivery"
        bannerUrl={bannerUrl}
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
      <FeaturedOffers offers={offers.slice(0, 4)} />

      {/* SECTION 9: REVIEWS */}
      <ReviewsSection />

      {/* SECTION 10: FULL OFFER GRID */}
      <FullOfferGrid offers={offers} />

      {/* Footer spacing */}
      <div className="h-12" />
    </div>
  );
};

export default StorefrontPreviewLive;
