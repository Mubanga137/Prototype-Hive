import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Upload, Plus, Trash2, Edit, Loader2, Copy, Check, ExternalLink, Zap, Percent, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { generateOfferVariants, generateSmartSectionContent } from '@/lib/offerEngine';
import { supabase } from '@/integrations/supabase/client';

interface EditorPanelProps {
  store: any;
  brandName: string;
  onBrandNameChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  logoUrl: string;
  onLogoChange: (url: string) => void;
  heroImageUrl: string;
  onHeroImageChange: (url: string) => void;
  heroTitle: string;
  onHeroTitleChange: (val: string) => void;
  heroSubtitle: string;
  onHeroSubtitleChange: (val: string) => void;
  whatsappNumber: string;
  onWhatsappChange: (val: string) => void;
  storeSlug: string;
  onSlugChange: (val: string) => void;
  storeUrl: string;
  onAddProduct: () => void;
  onEditProduct: (product: any) => void;
  onDeleteProduct: (id: number) => void;
  products: any[];
  saveStatus: 'idle' | 'saving' | 'saved';
  onLaunch: () => void;
  launching: boolean;
  onUploadFile: (file: File, folder: string) => Promise<string | null>;
  businessType?: string;
  onBusinessTypeChange?: (val: string) => void;
  isVerified?: boolean;
  onVerifiedChange?: (val: boolean) => void;
}

interface Section {
  id: string;
  title: string;
  expanded: boolean;
}

const StorefrontEditorPanel = ({
  store,
  brandName,
  onBrandNameChange,
  description,
  onDescriptionChange,
  logoUrl,
  onLogoChange,
  heroImageUrl,
  onHeroImageChange,
  heroTitle,
  onHeroTitleChange,
  heroSubtitle,
  onHeroSubtitleChange,
  whatsappNumber,
  onWhatsappChange,
  storeSlug,
  onSlugChange,
  storeUrl,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  products,
  saveStatus,
  onLaunch,
  launching,
  onUploadFile,
  businessType = 'retail',
  onBusinessTypeChange,
  isVerified = false,
  onVerifiedChange,
}: EditorPanelProps) => {
  // Local state for inputs - prevents re-render on every keystroke
  const [localBrandName, setLocalBrandName] = useState(brandName);
  const [localDescription, setLocalDescription] = useState(description);
  const [localHeroTitle, setLocalHeroTitle] = useState(heroTitle);
  const [localHeroSubtitle, setLocalHeroSubtitle] = useState(heroSubtitle);
  const [localWhatsappNumber, setLocalWhatsappNumber] = useState(whatsappNumber);
  const [localStoreSlug, setLocalStoreSlug] = useState(storeSlug);

  // Sync local state when props change
  useEffect(() => {
    setLocalBrandName(brandName);
  }, [brandName]);

  useEffect(() => {
    setLocalDescription(description);
  }, [description]);

  useEffect(() => {
    setLocalHeroTitle(heroTitle);
  }, [heroTitle]);

  useEffect(() => {
    setLocalHeroSubtitle(heroSubtitle);
  }, [heroSubtitle]);

  useEffect(() => {
    setLocalWhatsappNumber(whatsappNumber);
  }, [whatsappNumber]);

  useEffect(() => {
    setLocalStoreSlug(storeSlug);
  }, [storeSlug]);

  // Load promos from store draft_data
  useEffect(() => {
    if (store?.draft_data?.promos) {
      setPromos(store.draft_data.promos);
    }
  }, [store?.draft_data]);

  const [sections, setSections] = useState<Section[]>([
    { id: 'identity', title: 'Store Identity', expanded: false },
    { id: 'hero', title: 'Hero Section', expanded: false },
    { id: 'products', title: 'Products & Services', expanded: false },
    { id: 'promotions', title: 'Promotions', expanded: false },
    { id: 'content', title: 'Auto Content', expanded: false },
    { id: 'settings', title: 'Store Settings', expanded: false },
  ]);

  const [copied, setCopied] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // Promotions state
  const [promos, setPromos] = useState<any[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('');
  const [promoType, setPromoType] = useState<'percentage' | 'fixed'>('percentage');

  // Prevent autoscroll-to-top by disabling focus-based scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleFocus = (e: FocusEvent) => {
      // Store current scroll position before focus
      scrollPositionRef.current = container.scrollTop;
    };

    const handleFocusIn = (e: FocusEvent) => {
      // Restore scroll position after focus (prevents scrollIntoView)
      container.scrollTop = scrollPositionRef.current;
    };

    container.addEventListener('focus', handleFocus, true);
    container.addEventListener('focusin', handleFocusIn, true);

    return () => {
      container.removeEventListener('focus', handleFocus, true);
      container.removeEventListener('focusin', handleFocusIn, true);
    };
  }, []);

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s))
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const url = await onUploadFile(file, 'logo');
    if (url) onLogoChange(url);
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    const url = await onUploadFile(file, 'hero');
    if (url) {
      onHeroImageChange(url);
      toast.success('✅ Media uploaded and live!');
    }
    setUploadingHero(false);
    if (heroInputRef.current) heroInputRef.current.value = '';
  };

  const copyLink = async () => {
    if (!storeUrl) {
      toast.error('Save store first');
      return;
    }
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 1800);
  };

  // Promo management functions
  const addPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Promo code required');
      return;
    }
    if (!promoDiscount.trim()) {
      toast.error('Discount value required');
      return;
    }
    if (!store?.id) {
      toast.error('Store not loaded');
      return;
    }

    const newPromo = {
      id: Date.now().toString(),
      code: promoCode.toUpperCase().trim(),
      discount: parseFloat(promoDiscount),
      type: promoType,
      created_at: new Date().toISOString(),
    };

    const updatedPromos = [...promos, newPromo];
    setPromos(updatedPromos);

    // Save to DB draft_data
    await supabase.from('sme_stores').update({
      draft_data: {
        ...((store as any).draft_data || {}),
        promos: updatedPromos,
      },
    }).eq('id', store.id);

    setPromoCode('');
    setPromoDiscount('');
    setPromoType('percentage');
    toast.success('✅ Promo added!');
  };

  const deletePromo = async (id: string) => {
    const updatedPromos = promos.filter(p => p.id !== id);
    setPromos(updatedPromos);

    if (store?.id) {
      await supabase.from('sme_stores').update({
        draft_data: {
          ...((store as any).draft_data || {}),
          promos: updatedPromos,
        },
      }).eq('id', store.id);
    }

    toast.success('Promo removed');
  };

  const SaveIndicator = () => {
    if (saveStatus === 'saving') {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/70 border border-border text-xs font-semibold text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> Saving…
        </motion.div>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
          <Check size={12} /> Saved
        </motion.div>
      );
    }
    return null;
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm';

  const Section = ({
    section,
    children,
  }: {
    section: Section;
    children: React.ReactNode;
  }) => (
    <div className="border-b border-border">
      <button
        onClick={() => toggleSection(section.id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <h3 className="font-semibold text-foreground text-sm">{section.title}</h3>
        <ChevronDown
          size={18}
          className={`text-muted-foreground transition-transform ${
            section.expanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {section.expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 space-y-4 bg-secondary/10"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="h-full bg-card flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-card border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between gap-2">
          <SaveIndicator />
          <button
            onClick={onLaunch}
            disabled={launching}
            className="btn-gold px-4 py-2 text-xs font-bold disabled:opacity-60 flex items-center gap-1.5"
          >
            {launching ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Launch
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
        {/* STORE IDENTITY */}
        <Section section={sections.find((s) => s.id === 'identity')!}>
          <div className="space-y-3">
            {/* Logo */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Logo</label>
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-16 h-16 rounded-full border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden transition-colors bg-secondary/30"
              >
                {uploadingLogo ? (
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Upload size={20} className="text-muted-foreground/40" />
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>

            {/* Store Name */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Store Name</label>
              <input
                value={localBrandName}
                onChange={(e) => setLocalBrandName(e.target.value)}
                onBlur={() => onBrandNameChange(localBrandName)}
                placeholder="e.g. Lusaka Threads"
                className={inputClass}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
              <select
                value={businessType}
                onChange={(e) => onBusinessTypeChange?.(e.target.value)}
                className={inputClass}
              >
                <option value="retail">Retail</option>
                <option value="food">Food & Beverage</option>
                <option value="beauty">Beauty & Wellness</option>
                <option value="services">Services</option>
                <option value="digital">Digital Products</option>
              </select>
            </div>

            {/* Verified Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="verified"
                checked={isVerified}
                onChange={(e) => onVerifiedChange?.(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="verified" className="text-xs font-semibold text-foreground">
                Mark as Verified
              </label>
            </div>

            {/* Store URL */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Store URL</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/store/</span>
                <input
                  value={localStoreSlug}
                  onChange={(e) => setLocalStoreSlug(e.target.value)}
                  onBlur={() => onSlugChange(localStoreSlug)}
                  placeholder="store-name"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Description (max 120 chars)
              </label>
              <textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value.slice(0, 120))}
                onBlur={() => onDescriptionChange(localDescription)}
                placeholder="Tell customers about your store..."
                rows={2}
                maxLength={120}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-muted-foreground mt-1">{localDescription.length}/120</p>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">WhatsApp Number</label>
              <input
                value={localWhatsappNumber}
                onChange={(e) => setLocalWhatsappNumber(e.target.value)}
                onBlur={() => onWhatsappChange(localWhatsappNumber)}
                placeholder="+260 9XX XXX XXX"
                className={inputClass}
              />
            </div>
          </div>
        </Section>

        {/* HERO SECTION */}
        <Section section={sections.find((s) => s.id === 'hero')!}>
          <div className="space-y-3">
            {/* Hero Image/Video */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Featured Media (Image or Video)</label>
              <div
                onClick={() => heroInputRef.current?.click()}
                className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center cursor-pointer overflow-hidden transition-colors bg-secondary/30"
              >
                {uploadingHero ? (
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                ) : heroImageUrl ? (
                  heroImageUrl.includes('.mp4') || heroImageUrl.includes('.webm') || heroImageUrl.includes('.mov') ? (
                    <video src={heroImageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="text-center">
                    <Upload size={24} className="mx-auto text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground mt-1">Click to upload image or video</p>
                  </div>
                )}
              </div>
              <input ref={heroInputRef} type="file" accept="image/*,video/*" onChange={handleHeroUpload} className="hidden" />
            </div>

            {/* Hero Title */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Main Heading</label>
              <input
                value={localHeroTitle}
                onChange={(e) => setLocalHeroTitle(e.target.value)}
                onBlur={() => onHeroTitleChange(localHeroTitle)}
                placeholder="Your store heading..."
                className={inputClass}
              />
            </div>

            {/* Hero Subtitle */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Tagline</label>
              <input
                value={localHeroSubtitle}
                onChange={(e) => setLocalHeroSubtitle(e.target.value)}
                onBlur={() => onHeroSubtitleChange(localHeroSubtitle)}
                placeholder="Premium Quality, Fast Delivery"
                className={inputClass}
              />
            </div>
          </div>
        </Section>

        {/* PRODUCTS & SERVICES */}
        <Section section={sections.find((s) => s.id === 'products')!}>
          <div className="space-y-3">
            <button
              onClick={onAddProduct}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus size={16} /> Add Product/Service
            </button>

            {products.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-xs mb-2">No products yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="border border-border rounded-lg p-2 bg-secondary/20 hover:bg-secondary/40 transition-colors text-xs">
                    <div className="flex items-start gap-2 mb-2">
                      {p.image_url && (
                        <img src={p.image_url} alt={p.product_name} className="w-10 h-10 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground line-clamp-1">{p.product_name}</p>
                        <p className="text-primary font-bold">ZMW {p.price}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEditProduct(p)}
                        className="flex-1 px-2 py-1 text-xs font-semibold text-primary border border-primary/30 rounded hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-1"
                      >
                        <Edit size={10} /> Edit
                      </button>
                      <button
                        onClick={() => onDeleteProduct(p.id)}
                        className="flex-1 px-2 py-1 text-xs font-semibold text-destructive border border-destructive/30 rounded hover:bg-destructive/5 transition-colors inline-flex items-center justify-center gap-1"
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* PROMOTIONS */}
        <Section section={sections.find((s) => s.id === 'promotions')!}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-foreground">Active Promos: {promos.length}</p>
              <button
                onClick={() => setShowPromoForm(!showPromoForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus size={14} /> {showPromoForm ? 'Cancel' : 'Add Promo'}
              </button>
            </div>

            {showPromoForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 border border-primary/20 bg-primary/5 rounded-lg space-y-3"
              >
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">Promo Code</label>
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="e.g. HIVE20"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Type</label>
                    <select
                      value={promoType}
                      onChange={(e) => setPromoType(e.target.value as 'percentage' | 'fixed')}
                      className={inputClass}
                    >
                      <option value="percentage">Percentage %</option>
                      <option value="fixed">Fixed ZMW</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Discount</label>
                    <input
                      type="number"
                      value={promoDiscount}
                      onChange={(e) => setPromoDiscount(e.target.value)}
                      placeholder={promoType === 'percentage' ? '20' : '500'}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  onClick={addPromo}
                  className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> Add Promo Code
                </button>
              </motion.div>
            )}

            {promos.length > 0 ? (
              <div className="space-y-2">
                {promos.map((promo) => (
                  <div
                    key={promo.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-secondary/30 rounded-lg border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-primary text-sm">{promo.code}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {promo.discount}{promo.type === 'percentage' ? '%' : ' ZMW'} off
                      </p>
                    </div>
                    <button
                      onClick={() => deletePromo(promo.id)}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : !showPromoForm ? (
              <p className="text-xs text-muted-foreground text-center py-3 italic">
                No promos yet. Click "Add Promo" to create discount codes.
              </p>
            ) : null}
          </div>
        </Section>

        {/* AUTO CONTENT */}
        <Section section={sections.find((s) => s.id === 'content')!}>
          <div className="space-y-3">
            {[
              { label: 'How It Works', key: 'howItWorks' },
              { label: 'What You Get', key: 'whatYouGet' },
              { label: 'Availability Status', key: 'availability' },
            ].map((item) => (
              <div key={item.key} className="p-2 bg-secondary/30 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <input type="checkbox" defaultChecked className="w-3 h-3 rounded" />
                  <label className="text-xs font-semibold text-foreground">{item.label}</label>
                </div>
                <p className="text-xs text-muted-foreground">Auto-generated based on your store type</p>
              </div>
            ))}
          </div>
        </Section>

        {/* STORE SETTINGS */}
        <Section section={sections.find((s) => s.id === 'settings')!}>
          <div className="space-y-3">
            {/* Public Link */}
            {storeUrl && (
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Public Link</label>
                <div className="flex gap-1.5">
                  <input
                    value={storeUrl}
                    readOnly
                    className={`${inputClass} bg-secondary/50`}
                  />
                  <button
                    onClick={copyLink}
                    className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}

            {/* Store Status */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Store Status</label>
              <select className={inputClass}>
                <option>Active</option>
                <option>Paused</option>
              </select>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default StorefrontEditorPanel;
