import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Zap, TrendingUp, Wallet, MessageSquare, Bell,
  Package, Truck, LogOut, Menu, X
} from "lucide-react";
import hiveLogo from "@/assets/hive-logo.jpeg";
import { useAuth } from "@/hooks/useAuth";

interface GigRadarSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

const sidebarModules = [
  {
    group: "OVERVIEW",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "#" },
    ],
  },
  {
    group: "GIG MANAGEMENT",
    items: [
      { label: "Bounties", icon: Zap, path: "#" },
      { label: "Earnings", icon: TrendingUp, path: "#" },
      { label: "Wallet", icon: Wallet, path: "#" },
    ],
  },
  {
    group: "COMMUNICATION",
    items: [
      { label: "Messages", icon: MessageSquare, path: "#" },
      { label: "Notifications", icon: Bell, path: "#" },
    ],
  },
  {
    group: "HIVE NODES ONLY",
    items: [
      { label: "Hub-Inventory", icon: Package, path: "#" },
      { label: "Dispatch", icon: Truck, path: "#" },
    ],
  },
];

const GigRadarSidebar = ({ isOpen, onClose, userRole = "gig_worker" }: GigRadarSidebarProps) => {
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  };

  const SidebarContent = ({ isCollapsed = false, isMobile = false }: { isCollapsed?: boolean; isMobile?: boolean }) => (
    <div className="flex flex-col h-full bg-[#FFFBF2]">
      {/* Top: Logo & Header (Pinned) */}
      <div className="px-5 py-5 border-b shrink-0 flex items-center justify-between" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <img 
            src={hiveLogo} 
            alt="The Hive" 
            className="w-9 h-9 rounded-full object-cover border shrink-0" 
            style={{ borderColor: "hsl(38,73%,40%,0.3)" }}
          />
          <div className={`${isCollapsed && !isMobile ? "hidden" : ""}`}>
            <p className="font-display font-bold text-[#0F1A35] text-sm tracking-tight">THE HIVE</p>
            <p className="text-[10px] text-[#0F1A35]/70">Gig Rider</p>
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

      {/* Active Deliveries/Drops Counter - Premium Badge */}
      <div className={`px-5 pb-2 ${isCollapsed && !isMobile ? "hidden" : ""}`}>
        <motion.div
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all"
          style={{
            borderColor: "hsl(38,73%,40%,0.25)",
            backgroundColor: "hsl(38,73%,40%,0.12)",
            color: "#B37C1C",
          }}
          whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(179, 124, 28, 0.1)" }}
        >
          <span className="text-lg leading-none animate-pulse">⚡</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold tabular-nums">5</span>
            <span className="text-[10px] opacity-75">Active Drops</span>
          </div>
        </motion.div>
      </div>

      {/* Navigation (Scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
        {sidebarModules.map((mod) => {
          // Hide Hive Nodes section if not a hive node
          if (mod.group === "HIVE NODES ONLY" && userRole !== "hive_node") {
            return null;
          }

          return (
            <div key={mod.group}>
              <p className="text-[9px] font-extrabold text-[#0F1A35]/45 uppercase tracking-[0.15em] px-3 mb-3">
                {mod.group}
              </p>
              <div className="space-y-1">
                {mod.items.map((item, idx) => (
                  <motion.button
                    key={`${mod.group}-${idx}`}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all justify-center lg:justify-start"
                    style={{
                      color: "#0F1A35",
                      border: "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(38,73%,40%,0.1)";
                      e.currentTarget.style.borderColor = "hsl(38,73%,40%,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon
                      size={20}
                      style={{ color: "#B37C1C" }}
                      className="shrink-0"
                    />
                    <span className={`flex-1 text-left text-sm ${isCollapsed ? "hidden" : ""}`}>
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom: Profile & Logout (Pinned) */}
      <div
        className="border-t px-4 py-4 shrink-0"
        style={{ borderColor: "hsl(38,40%,85%)" }}
      >
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-3 border"
          style={{
            color: "#0F1A35",
            borderColor: "hsl(38,40%,85%)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "hsl(38,73%,40%,0.12)";
            e.currentTarget.style.borderColor = "hsl(38,73%,40%,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "hsl(38,40%,85%)";
          }}
        >
          {/* Premium Avatar */}
          <motion.div
            className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2 relative"
            style={{
              borderColor: "#B37C1C",
              background: "linear-gradient(135deg, #FFFBF2 0%, #F5F0E8 100%)",
              boxShadow: "0 4px 12px rgba(179, 124, 28, 0.25), inset 0 1px 3px rgba(255, 255, 255, 0.6)",
            }}
            whileHover={{ scale: 1.05 }}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6"
                fill="none"
                stroke="#B37C1C"
                strokeWidth="2"
              >
                {/* Male silhouette */}
                <circle cx="12" cy="8" r="4" />
                <path d="M 12 12 C 16 12 18 15 18 20 L 6 20 C 6 15 8 12 12 12" />
              </svg>
            )}
          </motion.div>
          <div className={`flex-1 min-w-0 text-left ${isCollapsed && !isMobile ? "hidden" : ""}`}>
            <p className="text-sm font-bold text-[#0F1A35] truncate">
              {profile?.full_name || "Worker"}
            </p>
            <p className="text-[10px] text-[#0F1A35]/60 mt-0.5">Gig Account</p>
          </div>
        </motion.button>
        <motion.button
          onClick={handleLogout}
          disabled={loggingOut}
          whileHover={{ scale: loggingOut ? 1 : 1.01 }}
          whileTap={{ scale: loggingOut ? 1 : 0.99 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold border rounded-xl transition-colors uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            color: "#B37C1C",
            borderColor: "hsl(38,73%,40%,0.2)",
          }}
          onMouseEnter={(e) => {
            if (!loggingOut) e.currentTarget.style.backgroundColor = "hsl(38,73%,40%,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {loggingOut ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" />
              </svg>
              <span className={isCollapsed && !isMobile ? "hidden" : ""}>Signing out...</span>
            </>
          ) : (
            <>
              <LogOut size={16} />
              <span className={isCollapsed && !isMobile ? "hidden" : ""}>Sign Out</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* Desktop Sidebar - Always Visible */}
      <aside
        className="hidden lg:flex w-64 shrink-0 bg-[#FFFBF2] border-r relative z-20 flex-col sticky top-0 h-screen"
        style={{ borderColor: "hsl(38,40%,85%)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile: Backdrop + Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 backdrop-blur-sm z-[60] lg:hidden"
              style={{ background: "hsl(220,55%,13%,0.4)" }}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 h-full z-[70] shadow-2xl lg:hidden flex flex-col overflow-hidden"
              style={{
                width: mobileSidebarCollapsed ? "80px" : "256px",
                maxWidth: "75vw",
                backgroundColor: "#FFFBF2",
              }}
            >
              <div className="absolute top-4 right-4 z-10 lg:hidden">
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: "#F5F0E8", color: "#0F1A35" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={20} />
                </motion.button>
              </div>
              <SidebarContent isCollapsed={mobileSidebarCollapsed} isMobile={true} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default GigRadarSidebar;
