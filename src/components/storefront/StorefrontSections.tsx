import { Star, Zap, MapPin, TrendingUp, CheckCircle, Users, Clock } from 'lucide-react';
import { generateSmartSectionContent } from '@/lib/offerEngine';

export interface StorefrontSectionsProps {
  storeName: string;
  businessType?: string;
  description?: string;
  offers?: any[];
  storeId?: number;
}

export const ProfileHeader = ({ storeName, businessType }: StorefrontSectionsProps) => (
  <div className="h-16 bg-card border-b border-border sticky top-16 z-20 flex items-center px-4 md:px-8">
    <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
      <div>
        <h3 className="font-bold text-foreground text-sm md:text-base">{storeName}</h3>
        {businessType && <p className="text-xs text-muted-foreground">{businessType}</p>}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-primary">
          <Zap size={12} /> Online Now
        </span>
      </div>
    </div>
  </div>
);

export const TrustBar = () => (
  <section className="bg-primary/5 border-y border-primary/20 py-4">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary mb-1">4.8★</p>
          <p className="text-xs text-muted-foreground">Customer Rating</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary mb-1">2.5K+</p>
          <p className="text-xs text-muted-foreground">Satisfied Customers</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary mb-1">98%</p>
          <p className="text-xs text-muted-foreground">Positive Feedback</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary mb-1">24/7</p>
          <p className="text-xs text-muted-foreground">Customer Support</p>
        </div>
      </div>
    </div>
  </section>
);

export const ActivityFeed = () => (
  <section className="py-8 md:py-12 bg-gradient-to-br from-secondary/30 to-background">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <h2 className="text-lg md:text-2xl font-bold text-foreground mb-6">Recent Activity</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, title: '↑ 450+ Orders', desc: 'Processed this month' },
          { icon: Users, title: '👥 1.2K+ Reviews', desc: 'Avg rating 4.8★' },
          { icon: Clock, title: '⚡ 2-Hour Delivery', desc: 'Average fulfillment' },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 md:p-6">
            <item.icon size={20} className="text-primary mb-2" />
            <p className="font-semibold text-foreground text-sm md:text-base">{item.title}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const HowItWorks = ({ businessType = 'retail' }: StorefrontSectionsProps) => {
  const { howItWorks } = generateSmartSectionContent(businessType, '');
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-lg md:text-2xl font-bold text-foreground mb-6 text-center">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {howItWorks.map((step, i) => (
            <div key={i} className="relative">
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 md:p-6 text-center h-full flex flex-col justify-center">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-3">
                  {i + 1}
                </div>
                <p className="text-sm md:text-base font-semibold text-foreground">{step}</p>
              </div>
              {i < howItWorks.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-primary/30" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const WhatYouGet = ({ businessType = 'retail' }: StorefrontSectionsProps) => {
  const { whatYouGet } = generateSmartSectionContent(businessType, '');
  return (
    <section className="py-8 md:py-12 bg-gradient-to-br from-secondary/30 to-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-lg md:text-2xl font-bold text-foreground mb-6 text-center">What You Get</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {whatYouGet.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 md:p-4 bg-card border border-border rounded-lg">
              <CheckCircle size={20} className="text-primary shrink-0" />
              <p className="text-sm md:text-base text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const AvailabilityStatus = () => (
  <section className="py-8 md:py-12">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <Zap size={24} className="text-primary" />
          <h2 className="text-lg md:text-2xl font-bold text-foreground">Stock Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg p-4">
            <p className="text-2xl md:text-3xl font-bold text-primary mb-1">🔥</p>
            <p className="text-xs md:text-sm text-foreground font-semibold">Available Today</p>
            <p className="text-xs text-muted-foreground">Most items in stock</p>
          </div>
          <div className="bg-card rounded-lg p-4">
            <p className="text-2xl md:text-3xl font-bold text-orange-500 mb-1">⏰</p>
            <p className="text-xs md:text-sm text-foreground font-semibold">Next Batch</p>
            <p className="text-xs text-muted-foreground">Coming tomorrow</p>
          </div>
          <div className="bg-card rounded-lg p-4">
            <p className="text-2xl md:text-3xl font-bold text-green-500 mb-1">✓</p>
            <p className="text-xs md:text-sm text-foreground font-semibold">Pre-Order Ready</p>
            <p className="text-xs text-muted-foreground">Reserve now</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const FeaturedOffers = ({ offers = [] }: StorefrontSectionsProps) => {
  const featured = offers.slice(0, 4);
  if (featured.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-gradient-to-br from-secondary/30 to-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-lg md:text-2xl font-bold text-foreground mb-6">Featured Offers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {featured.map((offer) => (
            <div key={offer.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-all">
              {offer.image_url && (
                <div className="h-24 md:h-32 overflow-hidden">
                  <img src={offer.image_url} alt={offer.product_name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3 md:p-4">
                <p className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 mb-1">{offer.product_name}</p>
                <p className="text-base md:text-lg font-bold text-primary">ZMW {offer.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ReviewsSection = () => (
  <section className="py-8 md:py-12">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <h2 className="text-lg md:text-2xl font-bold text-foreground mb-6">Customer Reviews</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'Amara K.', rating: 5, text: 'Excellent quality and fast delivery!' },
          { name: 'David M.', rating: 5, text: 'Very professional, highly recommend' },
          { name: 'Zainab C.', rating: 5, text: 'Best service in town' },
        ].map((review, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(review.rating)].map((_, j) => (
                <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-sm md:text-base text-foreground mb-2">"{review.text}"</p>
            <p className="text-xs md:text-sm font-semibold text-muted-foreground">— {review.name}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export const FullOfferGrid = ({ offers = [] }: StorefrontSectionsProps) => {
  if (offers.length === 0) {
    return (
      <section className="py-12 text-center">
        <p className="text-muted-foreground">No offers available</p>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12 bg-gradient-to-br from-secondary/30 to-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-lg md:text-2xl font-bold text-foreground mb-6">All Offers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-all group">
              {offer.image_url && (
                <div className="h-32 md:h-40 overflow-hidden bg-secondary">
                  <img
                    src={offer.image_url}
                    alt={offer.product_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
              )}
              <div className="p-3 md:p-4">
                <p className="text-xs md:text-sm font-semibold text-foreground line-clamp-2 mb-2">{offer.product_name}</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-base md:text-lg font-bold text-primary">ZMW {offer.price}</p>
                  {offer.old_price && <p className="text-xs text-muted-foreground line-through">ZMW {offer.old_price}</p>}
                </div>
                {offer.category && <p className="text-xs text-muted-foreground mb-3">{offer.category}</p>}
                <button className="w-full py-2 px-2 text-xs md:text-sm font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
