import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import FeaturedItemCard, { FeaturedItem } from "@/components/FeaturedItemCard";
import CheckoutDrawer from "@/components/CheckoutDrawer";
import ThemedHoneycombBackground from "@/components/ThemedHoneycombBackground";
import CategoryHero from "@/components/category/CategoryHero";
import CategorySearch from "@/components/category/CategorySearch";
import SubcategorySection from "@/components/category/SubcategorySection";
import DiscoverySection from "@/components/category/DiscoverySection";
import VendorCarousel from "@/components/category/VendorCarousel";
import CategoryFooter from "@/components/category/CategoryFooter";
import { categoryThemes } from "@/lib/categoryThemes";
import { subcategoryDefinitions } from "@/lib/categorySubcategories";
import { mockProducts } from "@/lib/mockCategoryData";
import { supabase } from "@/integrations/supabase/client";


const CategoryPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const key = (name || "").toLowerCase();
  const theme = categoryThemes[key];
  const subcategories = subcategoryDefinitions[key] || [];

  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
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

        setVendors(storesData.map((store: any) => ({
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
        })));
      } else {
        // Fallback to mock data if no vendors found
        const mockVendors = [
          { id: 1, store_name: "Prime Store", owner_name: "Owner", verified: false, is_featured: false, description: "Premium quality products with fast delivery", category: "Multi-category", rating: 4.5, product_count: 12, location: "Lusaka" },
          { id: 2, store_name: "Market Hub", owner_name: "Owner", verified: false, is_featured: false, description: "Wide selection of products at great prices", category: "Multi-category", rating: 4.3, product_count: 8, location: "Ndola" },
          { id: 3, store_name: "Elite Brands", owner_name: "Owner", verified: false, is_featured: false, description: "Exclusive and authenticated brands", category: "Multi-category", rating: 4.7, product_count: 15, location: "Kitwe" },
          { id: 4, store_name: "Quick Deals", owner_name: "Owner", verified: false, is_featured: false, description: "Best deals and discounts every day", category: "Multi-category", rating: 4.2, product_count: 10, location: "Livingstone" },
          { id: 5, store_name: "Trusted Traders", owner_name: "Owner", verified: false, is_featured: false, description: "Verified vendors with excellent ratings", category: "Multi-category", rating: 4.6, product_count: 20, location: "Lusaka" },
          { id: 6, store_name: "Value Store", owner_name: "Owner", verified: false, is_featured: false, description: "Budget-friendly without compromising quality", category: "Multi-category", rating: 4.4, product_count: 18, location: "Chingola" },
        ];
        setVendors(mockVendors);
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("hive_catalogue")
        .select("*, sme_stores(brand_name)")
        .ilike("category", `%${key}%`)
        .limit(50);

      if (data && data.length > 0) {
        setItems(
          data.map((item: any) => ({
            id: item.id,
            item_name: item.product_name || "Unnamed",
            price: item.price || 0,
            old_price: item.old_price,
            image_url: item.image_url,
            store_name: item.sme_stores?.brand_name || "The Hive Store",
            category: item.category || theme?.title || "General",
            is_featured: (item.stock_count ?? 0) > 10,
            in_stock: (item.stock_count ?? 0) > 0,
            fast_delivery: item.fulfillment_type === "express",
            free_shipping: (item.price ?? 0) > 100,
            item_type: item.item_type === "service" ? "service" : "product",
            discount_percent: item.old_price
              ? Math.round(
                  ((item.old_price - (item.price || 0)) / item.old_price) * 100
                )
              : undefined,
            sme_id: item.sme_id,
          }))
        );
      } else {
        // Use mock data as fallback
        const mockCategoryKey = key as keyof typeof mockProducts;
        const mockData = mockProducts[mockCategoryKey] || [];
        setItems(mockData);
      }
      setLoading(false);
    };
    fetchItems();
  }, [key]);

  // Filter items by search query
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.item_name.toLowerCase().includes(query) ||
        item.store_name.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Main product grid items (items not in any subcategory)
  const mainGridItems = useMemo(() => {
    const usedIds = new Set<number>();
    subcategories.forEach((subcat) => {
      searchFiltered.forEach((item) => {
        if (subcat.filterFn(item)) {
          usedIds.add(item.id);
        }
      });
    });
    return searchFiltered.filter((item) => !usedIds.has(item.id));
  }, [searchFiltered, subcategories]);

  // Get items for each subcategory
  const getSubcategoryItems = (subcat: typeof subcategories[0]) => {
    return searchFiltered.filter((item) => subcat.filterFn(item)).slice(0, 8);
  };

  const handleBuyNow = (item: FeaturedItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const themeClasses = theme
    ? { btnBg: theme.btnBg, btnHover: theme.btnHover, btnText: theme.btnText }
    : undefined;

  if (!theme) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground mb-4">
            Category not found
          </p>
          <button
            onClick={() => navigate("/customer-dash")}
            className="btn-gold px-6 py-3 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#FFFBF2]">
      {/* Dynamic honeycomb background */}
      <ThemedHoneycombBackground color={theme.honeycombColor} />

      {/* Ambient radial gradient (page-wide) */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: theme.gradient }}
      />

      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* 1. CATEGORY HERO */}
          <CategoryHero theme={theme} />

          {/* 2. SEARCH BAR */}
          <CategorySearch theme={theme} onSearch={setSearchQuery} />

          {/* 3. MAIN PRODUCT GRID */}
          {loading ? (
            <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-10">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl h-72 animate-pulse"
                />
              ))}
            </motion.div>
          ) : mainGridItems.length === 0 && searchQuery ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <p className="text-4xl mb-3">{theme.emoji}</p>
              <p className="text-lg font-semibold text-foreground">
                No items found for "{searchQuery}"
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Try searching with different keywords
              </p>
            </motion.div>
          ) : mainGridItems.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-10"
            >
              <h3 className="text-xl font-display font-bold text-foreground mb-4">
                All {theme.title}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {mainGridItems.map((item, i) => (
                  <FeaturedItemCard
                    key={item.id}
                    item={item}
                    index={i}
                    onBuyNow={handleBuyNow}
                    themeClasses={themeClasses}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}

          {/* 4-6. SUBCATEGORY SECTIONS */}
          {!searchQuery &&
            subcategories.map((subcat, idx) => {
              const subcatItems = getSubcategoryItems(subcat);
              return subcatItems.length > 0 ? (
                <SubcategorySection
                  key={subcat.key}
                  title={subcat.title}
                  description={subcat.description}
                  items={subcatItems}
                  onBuyNow={handleBuyNow}
                  theme={theme}
                  index={idx}
                />
              ) : null;
            })}

          {/* 7. DISCOVERY SECTION */}
          {!searchQuery && (
            <DiscoverySection
              items={searchFiltered}
              onBuyNow={handleBuyNow}
              theme={theme}
              usedItemIds={
                new Set(
                  subcategories
                    .flatMap((sc) => getSubcategoryItems(sc))
                    .map((i) => i.id)
                )
              }
            />
          )}

          {/* 8. FEATURED VENDORS CAROUSEL */}
          {!searchQuery && vendors.length > 0 && (
            <VendorCarousel
              vendors={vendors}
              theme={theme}
            />
          )}
        </div>
      </div>

      {/* FOOTER */}
      <CategoryFooter theme={theme} />

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
};

export default CategoryPage;
