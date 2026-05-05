import { motion } from "framer-motion";
import { BadgeCheck, Star, MapPin, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FeaturedVendors = () => {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 px-4 py-8 max-w-6xl mx-auto">
      <h3 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
        Featured <span className="text-primary">Vendors</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[].map((store: any, i: number) => (
          <motion.div
            key={store.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i }}
            className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors shadow-sm cursor-pointer group"
          >
            <div className="relative h-28 bg-gradient-to-br from-primary/10 via-secondary to-muted flex items-end p-4">
              <div className="absolute top-3 right-3 flex gap-1.5">
                {store.is_featured && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md">Featured</span>
                )}
                {store.verified && (
                  <span className="bg-emerald-600 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                    <BadgeCheck size={10} /> Verified
                  </span>
                )}
              </div>
              <div className="w-14 h-14 rounded-xl border-2 border-card bg-card flex items-center justify-center shadow-md -mb-7 group-hover:border-primary/40 transition-colors overflow-hidden">
                <span className="text-xl font-display font-bold text-primary">
                  {store.store_name[0]}
                </span>
              </div>
            </div>

            <div className="p-4 pt-5">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm text-foreground">{store.store_name}</h4>
                {store.verified && <BadgeCheck size={14} className="text-blue-500 shrink-0" />}
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{store.description}</p>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                <span className="flex items-center gap-0.5">
                  <Star size={11} className="fill-yellow-400 text-yellow-400" />
                  {store.rating}
                </span>
                <span className="flex items-center gap-0.5">
                  <Package size={11} />
                  {store.product_count} products
                </span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={11} />
                  {store.location}
                </span>
              </div>

              <span className="inline-block text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-3">
                {store.category}
              </span>

              <button
                onClick={() => navigate("/retailer-studio")}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors"
              >
                Visit Store →
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedVendors;
