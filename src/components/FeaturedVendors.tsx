import { useState, useEffect } from "react";
import VendorCard, { VendorData } from "@/components/VendorCard";
import { supabase } from "@/integrations/supabase/client";

const FeaturedVendors = () => {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      const { data: storesData } = await supabase
        .from("sme_stores")
        .select("id, brand_name, description")
        .limit(6);

      if (storesData && storesData.length > 0) {
        const { data: productsData } = await supabase
          .from("hive_catalogue")
          .select("sme_id");

        const productCounts: Record<string, number> = {};
        productsData?.forEach((p: any) => {
          productCounts[p.sme_id] = (productCounts[p.sme_id] || 0) + 1;
        });

        const vendorsList: VendorData[] = storesData.map((store: any) => ({
          id: store.id,
          store_name: store.brand_name || "Unknown Store",
          owner_name: store.owner_name || "Store Owner",
          verified: false,
          is_featured: false,
          description: store.description || "Quality products and services",
          category: "Multi-category",
          rating: 4.5,
          product_count: productCounts[store.id] || 0,
          location: "Zambia",
        }));
        setVendors(vendorsList);
      }
      setLoading(false);
    };
    fetchVendors();
  }, []);

  if (loading) {
    return (
      <section className="relative z-10 px-4 py-8 max-w-6xl mx-auto">
        <h3 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
          Featured <span className="text-primary">Vendors</span>
        </h3>
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </section>
    );
  }

  if (vendors.length === 0) {
    return (
      <section className="relative z-10 px-4 py-8 max-w-6xl mx-auto">
        <h3 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
          Featured <span className="text-primary">Vendors</span>
        </h3>
        <p className="text-center text-muted-foreground py-10">No vendors available yet</p>
      </section>
    );
  }

  return (
    <section className="relative z-10 px-4 py-8 max-w-6xl mx-auto">
      <h3 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
        Featured <span className="text-primary">Vendors</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((vendor, i) => (
          <VendorCard key={vendor.id} vendor={vendor} index={i} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedVendors;
