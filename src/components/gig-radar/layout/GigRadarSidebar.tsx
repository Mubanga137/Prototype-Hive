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
    group: "Operations",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "#" },
    ],
  },
  {
    group: "Gig Management",
    items: [
      { label: "Bounties", icon: Zap, path: "#" },
      { label: "Earnings", icon: TrendingUp, path: "#" },
      { label: "Wallet", icon: Wallet, path: "#" },
    ],
  },
  {
    group: "Communication",
    items: [
      { label: "Messages", icon: MessageSquare, path: "#" },
      { label: "Notifications", icon: Bell, path: "#" },
    ],
  },
  {
    group: "Hive Nodes Only",
    items: [
      { label: "Hub-Inventory", icon: Package, path: "#" },
      { label: "Dispatch", icon: Truck, path: "#" },
    ],
  },
];

const GigRadarSidebar = ({ isOpen, onClose, userRole = "gig_worker" }: GigRadarSidebarProps) => {
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false);
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
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

      {/* Active Bounties Counter */}
      <div className={isCollapsed ? "hidden" : ""}>
        <div className="px-5 pb-0">
          <div
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors"
            style={{
              borderColor: "hsl(38,73%,40%,0.25)",
              backgroundColor: "hsl(38,73%,40%,0.12)",
              color: "#B37C1C",
            }}
          >
            <span className="text-base leading-none">⚡</span>
            <span className="tabular-nums font-bold">5</span>
            <span className="opacity-80">Active</span>
          </div>
        </div>
      </div>

      {/* Navigation (Scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        {sidebarModules.map((mod) => {
          // Hide Hive Nodes section if not a hive node
          if (mod.group === "Hive Nodes Only" && userRole !== "hive_node") {
            return null;
          }

          return (
            <div key={mod.group}>
              <p className="text-[10px] font-bold text-[#0F1A35]/50 uppercase tracking-widest px-3 mb-2">
                {mod.group}
              </p>
              <div className="space-y-0.5">
                {mod.items.map((item) => (
                  <motion.button
                    key={item.path}
                    whileHover={{ x: 2 }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all justify-center lg:justify-start"
                    style={{
                      color: "#0F1A35",
                      border: "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "hsl(38,73%,40%,0.08)";
                      e.currentTarget.style.borderColor = "hsl(38,73%,40%,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon
                      size={18}
                      style={{ color: "#B37C1C" }}
                      className="shrink-0"
                    />
                    <span className={`flex-1 text-left ${isCollapsed ? "hidden" : ""}`}>
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
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-3 border"
          style={{
            color: "#0F1A35",
            borderColor: "hsl(38,40%,85%)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "hsl(38,73%,40%,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{
              backgroundColor: "hsl(38,73%,40%,0.12)",
              borderColor: "hsl(38,73%,40%,0.25)",
              color: "#B37C1C",
              border: "1px solid hsl(38,73%,40%,0.25)"
            }}
          >
            {profile?.full_name?.[0]?.toUpperCase() || "R"}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-[#0F1A35] truncate">
              {profile?.full_name || "Rider"}
            </p>
            <p className="text-[10px] text-[#0F1A35]/60">Gig Account</p>
          </div>
        </button>
        <motion.button 
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border rounded-xl transition-colors"
          style={{
            color: "#B37C1C",
            borderColor: "hsl(38,73%,40%,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "hsl(38,73%,40%,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut size={14} />
          Sign Out
        </motion.button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="hidden lg:flex w-56 shrink-0 bg-[#FFFBF2] border-r relative z-20 flex-col sticky top-0 h-screen"
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
              className="fixed top-0 left-0 h-full z-[70] shadow-2xl lg:hidden flex flex-col"
              style={{
                width: mobileSidebarCollapsed ? "80px" : "256px",
                maxWidth: "75vw",
                backgroundColor: "#FFFBF2"
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
