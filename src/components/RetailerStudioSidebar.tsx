import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Video, Link2, Package, Briefcase, ShoppingCart, Coins,
  LogOut, Menu, X, ChevronRight, Warehouse, Globe, BookOpen, Tag, BarChart3, Wallet, MessageSquare
} from "lucide-react";
import hiveLogo from "@/assets/hive-logo.jpeg";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import DashboardHeader from "@/components/DashboardHeader";
import { getCapacityStyles } from "@/hooks/useOrderCapacity";

interface RetailerStudioSidebarProps {
  children: React.ReactNode;
}

const sidebarModules = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/retailer-studio" },
    ],
  },
  {
    group: "Creator Studio",
    items: [
      { label: "Creator Studio", icon: Video, path: "/retailer-studio/creator" },
    ],
  },
  {
    group: "Store Management",
    items: [
      { label: "Products", icon: Package, path: "/retailer-studio/products" },
      { label: "Services", icon: Briefcase, path: "/retailer-studio/services" },
      { label: "Wholesale Bounty Hub", icon: Warehouse, path: "/retailer-studio/wholesale" },
      { label: "Storefront Builder", icon: Globe, path: "/retailer-studio/storefront" },
    ],
  },
  {
    group: "Business Operations",
    items: [
      { label: "Orders", icon: ShoppingCart, path: "/retailer-studio/orders" },
      { label: "Hive Credits", icon: Coins, path: "/retailer-studio/credits" },
    ],
  },
  {
    group: "Business Suite",
    items: [
      { label: "Business Ledger", icon: BookOpen, path: "/retailer-studio/kantemba" },
      { label: "Marketing & Promos", icon: Tag, path: "/retailer-studio/marketing" },
      { label: "Analytics & Customers", icon: BarChart3, path: "/retailer-studio/analytics" },
      { label: "Hive Escrow Wallet", icon: Wallet, path: "/retailer-studio/escrow" },
    ],
  },
  {
    group: "Communication",
    items: [
      { label: "Messages", icon: MessageSquare, path: "/messages" },
    ],
  },
];

const RetailerStudioSidebar = ({ children }: RetailerStudioSidebarProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const unreadCount = useUnreadCount();
  const capacity = profile?.order_capacity ?? 50;
  const capacityStyles = getCapacityStyles(capacity);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = ({ isCollapsed = false, isMobile = false }: { isCollapsed?: boolean; isMobile?: boolean }) => (
    <div className="flex flex-col h-full bg-[#FFFBF2]">
      {/* Top Area: Logo & Profile (Pinned) */}
      <div className="px-5 py-5 border-b shrink-0 flex items-center justify-between" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <img src={hiveLogo} alt="The Hive" className="w-9 h-9 rounded-full object-cover border border-[#B37C1C]/30 shrink-0" />
          <div className={`${isCollapsed && !isMobile ? "hidden" : ""}`}>
            <p className="font-display font-bold text-[#0F1A35] text-sm tracking-tight">THE HIVE</p>
            <p className="text-[10px] text-[#0F1A35]/70">Retailer Studio</p>
          </div>
        </div>
        {/* Mobile collapse toggle */}
        {isMobile && (
          <motion.button
            onClick={() => setMobileSidebarCollapsed(!mobileSidebarCollapsed)}
            className="flex lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors items-center justify-center shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isCollapsed ? (
              <Menu size={18} style={{ color: "#B37C1C" }} />
            ) : (
              <X size={18} style={{ color: "#B37C1C" }} />
            )}
          </motion.button>
        )}
      </div>

      {/* Capacity meter — order_capacity with clickable recharge */}
      <div className={isCollapsed ? "hidden" : ""}>
        <div className="px-5 pb-0">
          <motion.button
            onClick={() => navigate("/recharge")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${capacityStyles.bg} ${capacityStyles.border}`}
            title="Click to recharge your order capacity"
          >
            <span className={`text-base leading-none ${capacityStyles.icon}`}>📦</span>
            <span className={`tabular-nums font-bold ${capacityStyles.text}`}>{capacity}</span>
            <span className={`opacity-80 ${capacityStyles.text}`}>Orders Left</span>
          </motion.button>
        </div>
      </div>

      {/* Middle Area: Navigation Links (Scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        {sidebarModules.map((mod) => (
          <div key={mod.group}>
            <p className="text-[10px] font-bold text-[#0F1A35]/50 uppercase tracking-widest px-3 mb-2">
              {mod.group}
            </p>
            <div className="space-y-0.5">
              {mod.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all justify-center lg:justify-start ${
                    isActive(item.path)
                      ? "border"
                      : "border border-transparent"
                  }`}
                  style={
                    isActive(item.path)
                      ? {
                          background: "hsl(38,73%,40%,0.12)",
                          borderColor: "hsl(38,73%,40%,0.25)",
                          color: "#0F1A35",
                        }
                      : {
                          color: "#0F1A35",
                        }
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon
                    size={18}
                    style={{
                      color: isActive(item.path) ? "#B37C1C" : "#0F1A35"
                    }}
                    className="shrink-0"
                  />
                  <span className={`flex-1 text-left ${isCollapsed ? "hidden" : ""}`}>{item.label}</span>
                  {item.label === "Messages" && unreadCount > 0 && (
                    <span
                      className="ml-auto min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-[#FFFBF2]"
                      style={{ backgroundColor: "#B37C1C" }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Area: User Profile & Logout (Pinned) */}
      <div 
        className="border-t px-4 py-4 shrink-0"
        style={{ borderColor: "hsl(38,40%,85%)" }}
      >
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-3 border"
          style={{
            color: "#0F1A35",
            borderColor: "hsl(38,40%,85%)",
          }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              background: "hsl(38,73%,40%,0.12)",
              borderColor: "hsl(38,73%,40%,0.25)",
              color: "#B37C1C",
              border: "1px solid hsl(38,73%,40%,0.25)"
            }}
          >
            {profile?.full_name?.[0]?.toUpperCase() || "S"}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-[#0F1A35] truncate">
              {profile?.full_name || "SME Brand"}
            </p>
            <p className="text-[10px] text-[#0F1A35]/60">Vendor Account</p>
          </div>
        </button>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border rounded-xl transition-colors"
          style={{
            color: "#B37C1C",
            borderColor: "hsl(38,73%,40%,0.3)",
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative flex bg-[#FFFBF2]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-[#FFFBF2] border-r relative z-20 flex-col sticky top-0 h-screen" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile: Backdrop + Drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)} 
              className="fixed inset-0 backdrop-blur-sm z-[60] lg:hidden"
              style={{ background: "hsl(220,55%,13%,0.4)" }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 h-full z-[70] shadow-2xl lg:hidden flex flex-col"
              style={{
                width: mobileSidebarCollapsed ? "80px" : "256px",
                maxWidth: "75vw"
              }}
            >
              <div className="absolute top-4 right-4 z-10 lg:hidden">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: "#FFFBF2", color: "#0F1A35" }}
                >
                  <X size={20} />
                </button>
              </div>
              <SidebarContent isCollapsed={mobileSidebarCollapsed} isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile Header */}
        <DashboardHeader title="Retailer Studio" onMenuToggle={() => setSidebarOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default RetailerStudioSidebar;
