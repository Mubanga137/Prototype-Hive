import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingBag, FileText, MapPin, Wallet, FolderOpen, LogOut, Menu, X,
  Settings, MessageSquare, Home, LogIn, UserPlus
} from "lucide-react";
import hiveLogo from "@/assets/hive-logo.jpeg";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useNavigate, useSearchParams } from "react-router-dom";

interface CustomerDashboardSidebarProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}


const CustomerDashboardSidebar = ({ children, activeSection, onSectionChange }: CustomerDashboardSidebarProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [mobileSidebarCollapsed, setMobileSidebarCollapsed] = useState(false);
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const [searchParams] = useSearchParams();
  const isGuest = searchParams.get("guest") === "true" || !user;

  // No protected sections - all sections available to guests
  const protectedSections: string[] = [];

  // Full sidebar items for both guest and authenticated (parity design)
  const fullSidebarItems = [
    { label: "Home", icon: LayoutDashboard },
    { label: "Marketplace", icon: ShoppingBag },
    { label: "Order History", icon: FileText },
    { label: "Track My Orders", icon: MapPin },
    { label: "Wallet", icon: Wallet },
    { label: "Categories", icon: FolderOpen },
    { label: "Messages", icon: MessageSquare },
  ];

  const sidebarItems = fullSidebarItems;

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const SidebarContent = ({ isCollapsed, isMobile = false }: { isCollapsed?: boolean; isMobile?: boolean }) => (
    <div className="flex flex-col h-full bg-[#FFFBF2]">
      {/* Top Area: Logo & Profile (Pinned) */}
      <div className="px-5 py-5 border-b shrink-0 flex items-center justify-between" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <img src={hiveLogo} alt="The Hive" className="w-9 h-9 rounded-full object-cover border border-[#B37C1C]/30 shrink-0" />
          <div className={`${isCollapsed && !isMobile ? "hidden" : ""}`}>
            <p className="font-display font-bold text-[#0F1A35] text-sm tracking-tight">THE HIVE</p>
            <p className="text-[10px] text-[#0F1A35]/70">Customer Mall</p>
          </div>
        </div>
        {/* Desktop collapse toggle - only show on desktop */}
        {isCollapsed !== undefined && !isMobile && (
          <motion.button
            onClick={() => setDesktopSidebarCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-secondary transition-colors items-center justify-center shrink-0"
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
        {/* Mobile collapse toggle - only show on mobile */}
        {isMobile && (
          <motion.button
            onClick={() => setMobileSidebarCollapsed(!mobileSidebarCollapsed)}
            className="flex lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors items-center justify-center shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {mobileSidebarCollapsed ? (
              <Menu size={18} style={{ color: "#B37C1C" }} />
            ) : (
              <X size={18} style={{ color: "#B37C1C" }} />
            )}
          </motion.button>
        )}
      </div>

      {/* Middle Area: Navigation Links (Scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {sidebarItems.map((item) => (
          <motion.button
            key={item.label}
            onClick={() => {
              onSectionChange(item.label);
              setSidebarOpen(false);
            }}
            whileHover={{ x: isCollapsed ? 0 : 4 }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border justify-center lg:justify-start ${
              activeSection === item.label
                ? "border"
                : "border border-transparent"
            }`}
            style={
              activeSection === item.label
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
                color: activeSection === item.label ? "#B37C1C" : "#0F1A35"
              }}
              className="shrink-0"
            />
            <span className={`flex-1 text-left ${isCollapsed && !isMobile ? "hidden" : ""}`}>{item.label}</span>
            {!(isCollapsed && !isMobile) && item.label === "Messages" && unreadCount > 0 && (
              <span
                className="ml-auto min-w-[20px] h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-[#FFFBF2]"
                style={{ backgroundColor: "#B37C1C" }}
              >
                {unreadCount}
              </span>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Bottom Area: User Profile & Logout (Pinned) */}
      <div
        className="border-t px-4 py-4 shrink-0"
        style={{ borderColor: "hsl(38,40%,85%)" }}
      >
        <motion.button
          onClick={() => {
            onSectionChange("Settings");
            setSidebarOpen(false);
          }}
          whileHover={{ x: isCollapsed ? 0 : 4 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-3 border justify-center lg:justify-start"
          style={{
            background: activeSection === "Settings" ? "hsl(38,73%,40%,0.12)" : "transparent",
            borderColor: activeSection === "Settings" ? "hsl(38,73%,40%,0.25)" : "hsl(38,40%,85%)",
            color: "#0F1A35",
          }}
          title={isCollapsed && !isMobile ? "Settings" : undefined}
        >
          <Settings size={18} style={{ color: activeSection === "Settings" ? "#B37C1C" : "#0F1A35" }} className="shrink-0" />
          <div className={`flex-1 text-left ${isCollapsed && !isMobile ? "hidden" : ""}`}>
            <p className="text-sm font-semibold text-[#0F1A35] truncate">{profile?.full_name || "Customer"}</p>
            <p className="text-[10px] text-[#0F1A35]/60">Settings</p>
          </div>
        </motion.button>
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border rounded-xl transition-colors"
          style={{
            color: "#B37C1C",
            borderColor: "hsl(38,73%,40%,0.3)",
          }}
          title={isCollapsed && !isMobile ? "Sign Out" : undefined}
        >
          <LogOut size={14} />
          <span className={`${isCollapsed && !isMobile ? "hidden" : ""}`}>Sign Out</span>
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative flex bg-[#FFFBF2]">
      {/* Desktop Sidebar - Collapsible */}
      <motion.aside
        initial={false}
        animate={{ width: desktopSidebarCollapsed ? "80px" : "224px" }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="hidden lg:flex shrink-0 bg-[#FFFBF2] border-r relative z-20 flex-col sticky top-0 h-screen overflow-hidden"
        style={{ borderColor: "hsl(38,40%,85%)" }}
      >
        <SidebarContent isCollapsed={desktopSidebarCollapsed} />
      </motion.aside>

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
        <DashboardHeader title="Customer Mall" onMenuToggle={() => setSidebarOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
};

export default CustomerDashboardSidebar;
