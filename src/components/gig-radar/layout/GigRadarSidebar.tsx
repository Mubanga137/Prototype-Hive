import { X, LayoutDashboard, Zap, TrendingUp, Wallet, MessageSquare, Bell, Package, Truck } from "lucide-react";
import { motion } from "framer-motion";

interface GigRadarSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export const GigRadarSidebar = ({
  isOpen,
  onClose,
  userRole = "gig_worker",
}: GigRadarSidebarProps) => {
  const mainMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "#" },
    { icon: Zap, label: "Bounties", href: "#" },
    { icon: TrendingUp, label: "Earnings", href: "#" },
    { icon: Wallet, label: "Wallet", href: "#" },
    { icon: MessageSquare, label: "Messages", href: "#" },
  ];

  const hiveNodeItems = [
    { icon: Package, label: "Hub-Inventory", href: "#" },
    { icon: Truck, label: "Dispatch", href: "#" },
  ];

  const bottomMenuItems = [
    { icon: Bell, label: "Notifications", href: "#" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -256 }}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 left-0 h-screen w-64 z-30 transform md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: "#FFFBF2", borderRight: "1px solid #D4A57420" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b" style={{ borderColor: "#D4A57420" }}>
          <div>
            <h2 className="text-lg font-display font-bold" style={{ color: "#0F1A35" }}>
              🐝 THE HIVE
            </h2>
            <p className="text-xs" style={{ color: "#999" }}>Rider Studio</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="md:hidden p-2 rounded-lg transition-all"
            style={{ backgroundColor: "#F5F0E8" }}
          >
            <X size={20} style={{ color: "#0F1A35" }} />
          </motion.button>
        </div>

        {/* Main Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1 mb-8">
            {mainMenuItems.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
                style={{
                  color: "#0F1A35",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#F5F0E8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <item.icon size={20} style={{ color: "#D4A574" }} />
                <span className="font-medium text-sm">{item.label}</span>
              </motion.a>
            ))}
          </div>

          {/* Hive Nodes Only Section */}
          {userRole === "hive_node" && (
            <div className="mb-8 pb-8 border-b" style={{ borderColor: "#D4A57420" }}>
              <p className="text-xs uppercase tracking-wider font-bold px-4 mb-3" style={{ color: "#999" }}>
                Hive Nodes Only
              </p>
              <div className="space-y-1">
                {hiveNodeItems.map((item) => (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
                    style={{ color: "#0F1A35" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F5F0E8";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <item.icon size={20} style={{ color: "#B37C1C" }} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </motion.a>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Menu */}
        <div className="border-t p-4 space-y-1" style={{ borderColor: "#D4A57420" }}>
          {bottomMenuItems.map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
              style={{ color: "#0F1A35" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F5F0E8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <item.icon size={20} style={{ color: "#D4A574" }} />
              <span className="font-medium text-sm">{item.label}</span>
            </motion.a>
          ))}
        </div>

        {/* Sign Out Button */}
        <div className="border-t p-4" style={{ borderColor: "#D4A57420" }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2 rounded-xl font-semibold text-sm transition-all"
            style={{ backgroundColor: "#F5F0E8", color: "#0F1A35" }}
          >
            Sign Out
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
};

export default GigRadarSidebar;
