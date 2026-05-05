import { useState, useEffect } from "react";
import RetailerStudioSidebar from "@/components/RetailerStudioSidebar";
import { Plus, Copy, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProductLink {
  id: string;
  product_id: string;
  product_name: string;
  link_slug: string;
  clicks: number;
  created_at: string;
}

const ProductLinks = () => {
  const { profile } = useAuth();
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchLinks = async () => {
      setLoading(true);
      // Fetch products from this vendor
      const { data: catalogueData } = await supabase
        .from("hive_catalogue")
        .select("id, product_name")
        .eq("sme_id", profile.id)
        .limit(50);

      if (catalogueData && catalogueData.length > 0) {
        const links: ProductLink[] = catalogueData.map((item: any) => ({
          id: item.id,
          product_id: item.id,
          product_name: item.product_name || "Unnamed Product",
          link_slug: `${item.product_name?.toLowerCase().replace(/\s+/g, "-")}-${item.id}`.slice(0, 50),
          clicks: 0,
          created_at: "",
        }));
        setLinks(links);
      }
      setLoading(false);
    };

    fetchLinks();
  }, [profile?.id]);

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/product/${slug}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <RetailerStudioSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Product Links</h1>
            <p className="text-sm text-muted-foreground mt-1">Shareable links for your products</p>
          </div>
          <button className="btn-gold flex items-center gap-2 px-5 py-2.5 text-sm" disabled>
            <Plus size={16} /> Create Link
          </button>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Product Name</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Link</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : links.length > 0 ? (
                links.map((link, i) => (
                  <motion.tr
                    key={link.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="border-b border-border/30 last:border-0 hover:bg-secondary/20"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-foreground max-w-xs truncate">{link.product_name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell max-w-xs truncate">{link.link_slug}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => copyToClipboard(link.link_slug)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                          title="Copy link"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground text-sm">
                    No products yet. Add products to your store to create links.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RetailerStudioSidebar>
  );
};

export default ProductLinks;
