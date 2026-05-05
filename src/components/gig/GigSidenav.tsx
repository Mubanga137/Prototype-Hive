import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Radar, ClipboardList, MessageSquare, Phone,
  Wallet, Route, Bell, Package, Send, Settings, LogOut, X,
  User, Bike
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DashboardHeader from "@/components/DashboardHeader";
import { getCapacityStyles } from "@/hooks/useOrderCapacity";
import { useMixedFleetRole } from "@/hooks/useMixedFleetRole";

interface GigSidenavProps {
  isOnline: boolean;
  onToggleOnline: (val: boolean) => void;
  activeOrderCount?: number;
  liveStatus?: "idle" | "on_delivery" | "navigating";
  workerRole?: "runner" | "rider" | "hub_owner";
  unreadMessages?: number;
  unreadNotifications?: number;
  customerPhone?: string;
}

const GigSidenav = ({
  isOnline,
  onToggleOnline,
  activeOrderCount = 0,
  liveStatus = "idle",
  workerRole = "runner",
  unreadMessages = 0,
  unreadNotifications = 0,
  customerPhone,
}: GigSidenavProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { isRider, isRunner, isNode, commissionLabel } = useMixedFleetRole();

  // pulse_credits not yet in DB schema, default to 50 for now
  const capacity = (profile as any)?.pulse_credits ?? 50;
  const capacityStyles = getCapacityStyles(capacity);

  const isActive = (path: string) => location.pathname === path;

  const statusConfig = {
    idle: { label: "Idle", color: "bg-muted-foreground", pulse: false },
    on_delivery: { label: "On Delivery", color: "bg-emerald-500", pulse: true },
    navigating: { label: "Navigating", color: "bg-blue-500", pulse: true },
  };
  const st = statusConfig[liveStatus];

  const primaryLinks = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/gig-dashboard", badge: 0 },
    { label: "Gig Radar", icon: Radar, path: "/gig-radar", badge: 0 },
    { label: "Tasks / Jobs", icon: ClipboardList, path: "/gig-tasks", badge: activeOrderCount },
    { label: "Messages", icon: MessageSquare, path: "/messages", badge: unreadMessages },
    { label: "Earnings", icon: Wallet, path: "/gig-earnings", badge: 0 },
    { label: "Routes", icon: Route, path: "/gig-routes", badge: 0 },
    { label: "Notifications", icon: Bell, path: "/gig-notifications", badge: unreadNotifications },
  ];

  const hubLinks = [
    { label: "Inventory", icon: Package, path: "/hub-inventory" },
    { label: "Dispatch Panel", icon: Send, path: "/hub-dispatch" },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ background: "hsl(39,100%,97%)" }}>
      {/* Profile block */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden" style={{ borderColor: "hsl(38,73%,40%)", background: "hsl(38,73%,40%,0.1)" }}>
            <User size={22} style={{ color: "hsl(38,73%,40%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "hsl(220,55%,13%)" }}>
              {profile?.full_name || "Gig Worker"}
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: "hsl(38,73%,40%,0.15)", color: "hsl(38,73%,40%)" }}>
              {workerRole === "hub_owner" ? "Hub Master" : workerRole === "rider" ? "Rider" : "Runner"}
            </span>
          </div>
        </div>
        {/* Online toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: isOnline ? "#16a34a" : "hsl(220,20%,46%)" }}>
            {isOnline ? "🟢 ONLINE" : "⚫ OFFLINE"}
          </span>
          <Switch checked={isOnline} onCheckedChange={onToggleOnline} />
        </div>
      </div>

      {/* Capacity or Commission Badge (based on worker type) */}
      <div className="px-5 py-3 border-b" style={{ borderColor: "hsl(38,40%,85%)" }}>
        {!isRider ? (
          /* Runners & Nodes: Show Pulse Credits capacity */
          <motion.button
            onClick={() => navigate("/recharge")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              capacity < 1 ? "border-red-400/30 bg-red-50" : "border-emerald-400/30 bg-emerald-50"
            }`}
            title={capacity < 1 ? "No bounty capacity. Click to recharge." : "Click to recharge"}
            style={
              capacity < 1
                ? { borderColor: "hsl(0,100%,40%,0.3)", background: "hsl(0,100%,97%)" }
                : { borderColor: "hsl(120,100%,40%,0.3)", background: "hsl(120,100%,97%)" }
            }
          >
            <span className="text-base leading-none">📦</span>
            <span
              className="tabular-nums font-bold"
              style={{ color: capacity < 1 ? "hsl(0,100%,40%)" : "hsl(120,80%,30%)" }}
            >
              {capacity}
            </span>
            <span
              className="opacity-80"
              style={{ color: capacity < 1 ? "hsl(0,100%,40%)" : "hsl(120,80%,30%)" }}
            >
              Bounties Left
            </span>
          </motion.button>
        ) : (
          /* Riders: Show Commission Rate (permanent, no click action) */
          <div
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
            style={{
              borderColor: "hsl(38,73%,40%,0.3)",
              background: "hsl(38,73%,40%,0.06)",
            }}
          >
            <Bike size={16} style={{ color: "hsl(38,73%,40%)" }} />
            <span style={{ color: "hsl(38,73%,40%)" }} className="font-bold">
              10%
            </span>
            <span style={{ color: "hsl(38,73%,40%)" }} className="opacity-80">
              Commission per run
            </span>
          </div>
        )}
      </div>

      {/* Live status */}
      <div className="px-5 py-3 border-b" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${st.color} ${st.pulse ? "animate-pulse" : ""}`} />
          <span className="text-xs font-bold" style={{ color: "hsl(220,55%,13%)" }}>{st.label}</span>
          {activeOrderCount > 0 && (
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(38,73%,40%,0.15)", color: "hsl(38,73%,40%)" }}>
              {activeOrderCount} active
            </span>
          )}
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2" style={{ color: "hsl(220,20%,46%)" }}>Navigation</p>
        {primaryLinks.map((item) => {
          const active = item.label === "Gig Radar"; // default active
          return (
            <button
              key={item.label}
              onClick={() => handleNavigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? "hsl(38,73%,40%,0.12)" : "transparent",
                color: active ? "hsl(38,73%,40%)" : "hsl(220,55%,13%)",
                border: active ? "1px solid hsl(38,73%,40%,0.25)" : "1px solid transparent",
              }}
            >
              <item.icon size={18} style={{ color: active ? "hsl(38,73%,40%)" : "hsl(220,20%,46%)" }} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge > 0 && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: item.label === "Messages" ? "#ef4444" : "hsl(38,73%,40%)" }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Calls — tel: link */}
        <a
          href={customerPhone ? `tel:${customerPhone}` : "#"}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: "hsl(220,55%,13%)" }}
          onClick={() => !customerPhone && toast.info("No active customer phone number.")}
        >
          <Phone size={18} style={{ color: "hsl(220,20%,46%)" }} />
          <span className="flex-1 text-left">Calls</span>
        </a>

        {/* Hub Owner only */}
        {workerRole === "hub_owner" && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 mt-5 mb-2" style={{ color: "hsl(220,20%,46%)" }}>Hub Operations</p>
            {hubLinks.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ color: "hsl(220,55%,13%)" }}
              >
                <item.icon size={18} style={{ color: "hsl(220,20%,46%)" }} />
                {item.label}
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t px-4 py-4 space-y-2" style={{ borderColor: "hsl(38,40%,85%)" }}>
        <button
          onClick={() => {
            navigate("/gig-settings");
            setOpen(false);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium"
          style={{ color: "hsl(220,55%,13%)" }}
        >
          <Settings size={18} style={{ color: "hsl(220,20%,46%)" }} />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border rounded-xl transition-colors hover:text-red-600"
          style={{ borderColor: "hsl(38,40%,85%)", color: "hsl(220,20%,46%)" }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-30">
        <DashboardHeader title="Gig Radar" onMenuToggle={() => setOpen(true)} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 relative z-20 flex-col h-screen sticky top-0" style={{ background: "hsl(39,100%,97%)", borderRight: "1px solid hsl(38,40%,85%)" }}>
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[110] lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 h-full w-64 max-w-[75vw] z-[120] shadow-2xl lg:hidden overflow-hidden"
              style={{ borderRight: "1px solid hsl(38,73%,40%,0.2)" }}
            >
              <div className="absolute top-4 right-4 z-10">
                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-black/5" style={{ color: "hsl(220,55%,13%)" }}>
                  <X size={20} />
                </button>
              </div>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default GigSidenav;
