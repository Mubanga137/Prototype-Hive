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
import { categoryThemes } from "@/lib/categoryThemes";
import { subcategoryDefinitions } from "@/lib/categorySubcategories";
import { supabase } from "@/integrations/supabase/client";

const fallbackItems: Record<string, FeaturedItem[]> = {
  tech: [
    { id: 201, item_name: "Wireless Bluetooth Speaker", price: 149.99, old_price: 199.99, store_name: "Audio Pro Zambia", category: "Tech", is_featured: true, rating: 4.6, review_count: 145, in_stock: true, fast_delivery: true, free_shipping: true, item_type: "product" },
    { id: 202, item_name: "Gaming Headset RGB", price: 199.99, old_price: 259.99, store_name: "TechZone Zambia", category: "Tech", rating: 4.3, review_count: 178, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 203, item_name: "iPhone 15 Pro Case", price: 399.99, old_price: 469.99, store_name: "Mobile Tech Zambia", category: "Tech", rating: 4.8, review_count: 312, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 204, item_name: "USB-C Hub 7-in-1", price: 89.99, store_name: "TechZone Zambia", category: "Tech", rating: 4.5, review_count: 67, in_stock: true, item_type: "product" },
    { id: 205, item_name: "Smart Watch Pro", price: 299.99, old_price: 399.99, store_name: "Mobile Tech Zambia", category: "Tech", rating: 4.7, review_count: 98, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 206, item_name: "Wireless Charger Pad", price: 45.99, store_name: "TechZone Zambia", category: "Tech", rating: 4.4, review_count: 52, in_stock: true, item_type: "product" },
    { id: 207, item_name: "4K Webcam", price: 159.99, store_name: "Audio Pro Zambia", category: "Tech", rating: 4.5, review_count: 73, in_stock: true, item_type: "product" },
    { id: 208, item_name: "Portable SSD 1TB", price: 89.99, store_name: "TechZone Zambia", category: "Tech", rating: 4.6, review_count: 134, in_stock: true, item_type: "product" },
  ],
  fashion: [
    { id: 301, item_name: "Traditional Chitenge Dress", price: 45.99, store_name: "Zambian Heritage Fashion", category: "Fashion", rating: 4.9, review_count: 87, in_stock: true, free_shipping: true, item_type: "product" },
    { id: 302, item_name: "African Print Blazer", price: 320.00, old_price: 400.00, store_name: "Lusaka Threads", category: "Fashion", is_featured: true, rating: 4.8, review_count: 156, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 303, item_name: "Handwoven Tote Bag", price: 75.00, store_name: "Craft & Culture", category: "Fashion", rating: 4.7, review_count: 42, in_stock: true, item_type: "product" },
    { id: 304, item_name: "Urban Sneakers Classic", price: 250.00, old_price: 310.00, store_name: "Urban Kicks", category: "Fashion", rating: 4.6, review_count: 201, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 305, item_name: "Elegant Evening Gown", price: 450.00, old_price: 600.00, store_name: "Lusaka Threads", category: "Fashion", rating: 4.9, review_count: 34, in_stock: true, item_type: "product" },
    { id: 306, item_name: "Casual Hoodie Premium", price: 89.99, store_name: "Urban Kicks", category: "Fashion", rating: 4.5, review_count: 67, in_stock: true, item_type: "product" },
    { id: 307, item_name: "Gold Statement Jewelry", price: 150.00, store_name: "Craft & Culture", category: "Fashion", rating: 4.8, review_count: 45, in_stock: true, item_type: "product" },
    { id: 308, item_name: "Designer Sunglasses", price: 120.00, store_name: "Lusaka Threads", category: "Fashion", rating: 4.4, review_count: 78, in_stock: true, item_type: "product" },
  ],
  food: [
    { id: 401, item_name: "Organic Honey Collection", price: 89.99, old_price: 120.00, store_name: "Harvest Hub", category: "Food", rating: 4.4, review_count: 56, in_stock: true, free_shipping: true, item_type: "product" },
    { id: 402, item_name: "Zambian Spice Mix Set", price: 35.00, store_name: "Harvest Hub", category: "Food", rating: 4.6, review_count: 34, in_stock: true, item_type: "product" },
    { id: 403, item_name: "Farm-Fresh Produce Box", price: 65.00, store_name: "Harvest Hub", category: "Food", rating: 4.3, review_count: 89, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 404, item_name: "Artisan Coffee Beans 1kg", price: 120.00, old_price: 150.00, store_name: "Harvest Hub", category: "Food", is_featured: true, rating: 4.8, review_count: 112, in_stock: true, item_type: "product" },
    { id: 405, item_name: "Fresh Juice Box", price: 28.99, store_name: "Harvest Hub", category: "Food", rating: 4.5, review_count: 41, in_stock: true, item_type: "product" },
    { id: 406, item_name: "Lunch Box Special", price: 45.00, store_name: "Harvest Hub", category: "Food", rating: 4.6, review_count: 128, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 407, item_name: "Premium Tea Collection", price: 55.00, store_name: "Harvest Hub", category: "Food", rating: 4.7, review_count: 67, in_stock: true, item_type: "product" },
    { id: 408, item_name: "Artisan Pastry Bundle", price: 38.00, store_name: "Harvest Hub", category: "Food", rating: 4.4, review_count: 93, in_stock: true, item_type: "product" },
  ],
  entertainment: [
    { id: 501, item_name: "Smart TV 55\" 4K UHD", price: 599.99, old_price: 749.99, store_name: "Electronics Hub", category: "Entertainment", is_featured: true, rating: 4.7, review_count: 234, in_stock: true, fast_delivery: true, item_type: "product" },
    { id: 502, item_name: "Bluetooth Karaoke Mic", price: 79.99, store_name: "Audio Pro Zambia", category: "Entertainment", rating: 4.2, review_count: 67, in_stock: true, item_type: "product" },
    { id: 503, item_name: "Portable Projector Mini", price: 450.00, old_price: 550.00, store_name: "TechZone Zambia", category: "Entertainment", rating: 4.5, review_count: 45, in_stock: true, item_type: "product" },
    { id: 504, item_name: "DJ Booking Service", price: 500.00, store_name: "Lusaka Events", category: "Entertainment", rating: 4.9, review_count: 78, in_stock: true, item_type: "service" },
    { id: 505, item_name: "Event Planning Service", price: 800.00, store_name: "Lusaka Events", category: "Entertainment", rating: 4.8, review_count: 56, in_stock: true, item_type: "service" },
    { id: 506, item_name: "Photography Session", price: 350.00, store_name: "Lusaka Events", category: "Entertainment", rating: 4.9, review_count: 102, in_stock: true, item_type: "service" },
    { id: 507, item_name: "Concert Tickets Pack", price: 250.00, store_name: "Electronics Hub", category: "Entertainment", rating: 4.6, review_count: 89, in_stock: true, item_type: "product" },
    { id: 508, item_name: "Home Theater Speaker Set", price: 1200.00, old_price: 1500.00, store_name: "Audio Pro Zambia", category: "Entertainment", rating: 4.8, review_count: 45, in_stock: true, item_type: "product" },
  ],
  beauty: [
    { id: 601, item_name: "Natural Shea Butter Set", price: 65.00, old_price: 85.00, store_name: "Glow Africa", category: "Beauty", is_featured: true, rating: 4.5, review_count: 98, in_stock: true, fast_delivery: true, free_shipping: true, item_type: "product" },
    { id: 602, item_name: "Hair Braiding Service", price: 150.00, store_name: "Glow Africa", category: "Beauty", rating: 4.8, review_count: 45, in_stock: true, item_type: "service" },
    { id: 603, item_name: "Organic Hair Oil Collection", price: 55.00, store_name: "Glow Africa", category: "Beauty", rating: 4.6, review_count: 67, in_stock: true, item_type: "product" },
    { id: 604, item_name: "Facial Treatment Package", price: 200.00, old_price: 280.00, store_name: "Glow Africa", category: "Beauty", rating: 4.7, review_count: 34, in_stock: true, item_type: "service" },
    { id: 605, item_name: "Premium Makeup Kit", price: 189.99, old_price: 249.99, store_name: "Glow Africa", category: "Beauty", rating: 4.9, review_count: 123, in_stock: true, item_type: "product" },
    { id: 606, item_name: "Skincare Routine Bundle", price: 95.00, store_name: "Glow Africa", category: "Beauty", rating: 4.7, review_count: 89, in_stock: true, item_type: "product" },
    { id: 607, item_name: "Facial Cleanser Set", price: 45.00, store_name: "Glow Africa", category: "Beauty", rating: 4.6, review_count: 156, in_stock: true, item_type: "product" },
    { id: 608, item_name: "Spa Treatment Service", price: 350.00, store_name: "Glow Africa", category: "Beauty", rating: 4.9, review_count: 78, in_stock: true, item_type: "service" },
  ],
};

const CategoryPage = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const key = (name || "").toLowerCase();
  const theme = categoryThemes[key];
  const subcategories = subcategoryDefinitions[key] || [];

  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<FeaturedItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
            review_count: Math.floor(Math.random() * 300) + 10,
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
        setItems(fallbackItems[key] || []);
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
        {/* Sticky header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-30 glass-header px-4 py-3 flex items-center gap-3"
        >
          <button
            onClick={() => navigate("/customer-dash")}
            className="p-2 rounded-xl hover:bg-secondary transition-colors text-foreground"
          >
            ← Back
          </button>
          <span className="text-2xl">{theme.emoji}</span>
          <h1 className="text-lg font-display font-bold text-foreground">
            {theme.title}
          </h1>
        </motion.div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* 1. CATEGORY HERO */}
          <CategoryHero theme={theme} onBackClick={() => navigate("/customer-dash")} />

          {/* 2. SEARCH BAR */}
          <CategorySearch theme={theme} onSearch={setSearchQuery} />

          {/* 3. MAIN PRODUCT GRID */}
          {loading ? (
            <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
      </div>

      <CheckoutDrawer open={drawerOpen} onOpenChange={setDrawerOpen} item={selectedItem} />
    </div>
  );
};

export default CategoryPage;
