import { X, LayoutDashboard, ListTodo, TrendingUp, MapPin, Bell, Settings, Package, Zap } from "lucide-react";

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
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "#" },
    { icon: ListTodo, label: "Gig Tasks", href: "#" },
    { icon: TrendingUp, label: "Earnings", href: "#" },
    { icon: MapPin, label: "Routes", href: "#" },
  ];

  const bottomMenuItems = [
    { icon: Bell, label: "Notifications", href: "#" },
    { icon: Settings, label: "Settings", href: "#" },
  ];

  const hiveMenuItems = [
    { icon: Package, label: "Inventory", href: "#" },
    { icon: Zap, label: "Dispatch", href: "#" },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-gray-900 via-gray-950 to-black border-r border-yellow-600/10 z-30 transform transition-all duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-yellow-600/10">
          <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent">
            Hive
          </h2>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-yellow-600/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-yellow-500" />
          </button>
        </div>

        {/* Main menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2 mb-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-yellow-600/10 transition-all group"
              >
                <item.icon
                  size={20}
                  className="text-gray-500 group-hover:text-yellow-400 transition-colors"
                />
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </div>

          {/* Hive-specific items */}
          {userRole === "hive_node" && (
            <div className="mb-8 pb-8 border-b border-yellow-600/10">
              <p className="text-xs uppercase tracking-wider text-gray-600 font-bold px-4 mb-3">
                Hive Control
              </p>
              <div className="space-y-2">
                {hiveMenuItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-yellow-600/10 transition-all group"
                  >
                    <item.icon
                      size={20}
                      className="text-gray-500 group-hover:text-yellow-400 transition-colors"
                    />
                    <span className="font-medium">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom menu */}
        <div className="border-t border-yellow-600/10 p-4 space-y-2">
          {bottomMenuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:text-yellow-400 hover:bg-yellow-600/10 transition-all group"
            >
              <item.icon
                size={20}
                className="text-gray-500 group-hover:text-yellow-400 transition-colors"
              />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </div>
      </aside>
    </>
  );
};

export default GigRadarSidebar;
