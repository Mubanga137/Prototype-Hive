import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Zap, AlertCircle } from 'lucide-react';
import { generateOfferVariants, OfferVariant } from '@/lib/offerEngine';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductVariantBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  smeId: number;
  onSaved?: () => void;
}

export const ProductVariantBuilder = ({
  open,
  onOpenChange,
  smeId,
  onSaved,
}: ProductVariantBuilderProps) => {
  const [step, setStep] = useState<'base' | 'variants'>('base');
  const [baseName, setBaseName] = useState('');
  const [baseType, setBaseType] = useState<'physical' | 'digital' | 'service'>('physical');
  const [basePrice, setBasePrice] = useState('');
  const [baseDescription, setBaseDescription] = useState('');
  const [baseImage, setBaseImage] = useState('');
  const [variants, setVariants] = useState<OfferVariant[]>([]);
  const [saving, setSaving] = useState(false);

  // Auto-generate variants when moving to step 2
  const handleGenerateVariants = () => {
    if (!baseName.trim() || !basePrice) {
      toast.error('Please fill in product name and base price');
      return;
    }

    const generated = generateOfferVariants(
      Date.now(),
      baseName,
      parseFloat(basePrice),
      'General',
      baseType
    );

    setVariants(generated);
    setStep('variants');
  };

  const updateVariant = (id: string, field: string, value: any) => {
    setVariants((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    );
  };

  const deleteVariant = (id: string) => {
    if (variants.length <= 4) {
      toast.error('Must keep minimum 4 variants');
      return;
    }
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const addCustomVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `${baseName}-custom-${Date.now()}`,
        name: `${baseName} - Custom`,
        price: parseFloat(basePrice),
        description: 'Custom variant',
        type: 'single',
      },
    ]);
  };

  const handleSave = async () => {
    if (variants.length < 4) {
      toast.error('Must have minimum 4 variants');
      return;
    }

    setSaving(true);

    try {
      // Save base product
      const { data: product, error: productError } = await supabase
        .from('hive_catalogue')
        .insert({
          sme_id: smeId,
          product_name: baseName,
          price: parseFloat(basePrice),
          description: baseDescription,
          image_url: baseImage,
          item_type: baseType,
          category: 'General',
        })
        .select()
        .single();

      if (productError) {
        toast.error('Failed to save product');
        console.error(productError);
        return;
      }

      // Save all variants as additional products linked to base
      for (const variant of variants) {
        const variantPrice = variant.type === 'bundle' ? Math.round(parseFloat(basePrice) * 1.45) :
          variant.type === 'family' ? Math.round(parseFloat(basePrice) * 2.7) :
          variant.type === 'bulk' ? Math.round(parseFloat(basePrice) * 8.5) :
          variant.type === 'preorder' ? Math.round(parseFloat(basePrice) * 0.9) :
          parseFloat(basePrice);

        await supabase.from('hive_catalogue').insert({
          sme_id: smeId,
          product_name: variant.name,
          price: variantPrice,
          description: variant.description,
          image_url: baseImage,
          item_type: baseType,
          category: 'General',
        });
      }

      toast.success(`✓ Product created with ${variants.length} variants!`);
      onSaved?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Error saving product');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep('base');
    setBaseName('');
    setBaseType('physical');
    setBasePrice('');
    setBaseDescription('');
    setBaseImage('');
    setVariants([]);
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'base' ? 'Create Product/Service' : 'Review Variants'}
          </DialogTitle>
        </DialogHeader>

        {step === 'base' ? (
          // STEP 1: BASE PRODUCT
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Product/Service Name
              </label>
              <input
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="e.g. Wireless Headphones"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Type</label>
                <select
                  value={baseType}
                  onChange={(e) => setBaseType(e.target.value as any)}
                  className={inputClass}
                >
                  <option value="physical">Physical Product</option>
                  <option value="digital">Digital Product</option>
                  <option value="service">Service</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Base Price (ZMW)
                </label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
              <textarea
                value={baseDescription}
                onChange={(e) => setBaseDescription(e.target.value)}
                placeholder="Describe your product..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Image URL</label>
              <input
                value={baseImage}
                onChange={(e) => setBaseImage(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Zap size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-900 mb-1">Auto-Variant Generation</p>
                  <p className="text-xs text-blue-800">
                    Clicking Next will automatically generate minimum 4 variants representing different
                    pricing tiers and bundles. You can customize them in the next step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // STEP 2: VARIANTS
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {variants.length < 4 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-900">Minimum 4 Variants Required</p>
                  <p className="text-xs text-red-800">You currently have {variants.length}. Add more before saving.</p>
                </div>
              </div>
            )}

            {variants.map((variant) => (
              <div key={variant.id} className="border border-border rounded-lg p-3 bg-secondary/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <input
                    value={variant.name}
                    onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                    placeholder="Variant name"
                    className={`${inputClass} text-sm`}
                  />
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value))}
                    placeholder="Price"
                    className={`${inputClass} text-sm`}
                  />
                  <button
                    onClick={() => deleteVariant(variant.id)}
                    disabled={variants.length <= 4}
                    className="px-3 py-2 text-xs font-semibold text-destructive border border-destructive/30 rounded hover:bg-destructive/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
                <input
                  value={variant.description}
                  onChange={(e) => updateVariant(variant.id, 'description', e.target.value)}
                  placeholder="Description"
                  className={`${inputClass} text-sm w-full`}
                />
              </div>
            ))}

            <button
              onClick={addCustomVariant}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors text-sm"
            >
              <Plus size={16} /> Add Custom Variant
            </button>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'variants' && (
            <button
              onClick={() => setStep('base')}
              className="px-4 py-2 border border-border rounded-lg hover:bg-secondary/30 transition-colors text-sm font-semibold"
            >
              Back
            </button>
          )}

          {step === 'base' ? (
            <button
              onClick={handleGenerateVariants}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-semibold"
            >
              Generate Variants →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || variants.length < 4}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm font-semibold"
            >
              {saving ? 'Saving...' : `Save ${variants.length} Variants`}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductVariantBuilder;
