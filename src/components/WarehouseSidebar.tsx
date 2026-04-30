import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Boxes, Users, CreditCard, Settings, LogOut, X
} from "lucide-react";
import hiveLogo from "@/assets/hive-logo.jpeg";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface WarehouseSidebarProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Bulk Inventory", icon: Boxes, id: "inventory" },
  { label: "SME Partner Network", icon: Users, id: "partners" },
  { label: "Payouts & Ledger", icon: CreditCard, id: "payouts" },
  { label: "Store Settings", icon: Settings, id: "settings" },
];

const WarehouseSidebar = ({ children, activeSection, onSectionChange }: WarehouseSidebarProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FFFBF2]">
      {/* Top Area: Logo & Profile (Pinned) */}
      <div className="px-5 py-5 border-b shrink-0" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <div className="flex items-center gap-2.5">
          <img src={hiveLogo} alt="The Hive" className="w-9 h-9 rounded-full object-cover border border-[#B37C1C]/30" />
          <div>
            <p className="font-display font-bold text-[#0F1A35] text-sm tracking-tight">THE HIVE</p>
            <p className="text-[10px] text-[#0F1A35]/70">Warehouse</p>
          </div>
        </div>
      </div>

      {/* Middle Area: Navigation Links (Scrollable) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {sidebarItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => { 
              onSectionChange(item.id); 
              setSidebarOpen(false); 
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border"
            style={
              activeSection === item.id
                ? {
                    background: "hsl(38,73%,40%,0.12)",
                    borderColor: "hsl(38,73%,40%,0.25)",
                    color: "#0F1A35",
                  }
                : {
                    color: "#0F1A35",
                    borderColor: "transparent",
                  }
            }
          >
            <item.icon 
              size={18}
              style={{
                color: activeSection === item.id ? "#B37C1C" : "#0F1A35"
              }}
            />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
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
            {profile?.full_name?.[0]?.toUpperCase() || "W"}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-[#0F1A35] truncate">
              {profile?.full_name || "Wholesaler"}
            </p>
            <p className="text-[10px] text-[#0F1A35]/60">Warehouse Account</p>
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
              className="fixed top-0 left-0 h-full w-64 max-w-[75vw] z-[70] shadow-2xl lg:hidden flex flex-col"
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
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile Header */}
        <DashboardHeader title="Warehouse" onMenuToggle={() => setSidebarOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default WarehouseSidebar;
