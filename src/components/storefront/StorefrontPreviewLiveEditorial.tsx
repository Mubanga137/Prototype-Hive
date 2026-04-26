import { useEffect, useState } from 'react';
import HeroSectionEditorial from './HeroSectionEditorial';
import {
  ProfileHeader,
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

  // Force re-render when key props change
  useEffect(() => {
    setPreviewKey((prev) => prev + 1);
  }, [storeName, heroImageUrl, logoUrl, heroTitle, description, offers.length]);

  return (
    <div
      key={previewKey}
      className="h-full overflow-y-auto bg-white"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* SECTION 1: PROFILE HEADER */}
      <ProfileHeader storeName={storeName} businessType={businessType} />

      {/* SECTION 2: HERO SECTION - Editorial Layout */}
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

export default StorefrontPreviewLiveEditorial;
