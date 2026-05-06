import { useState } from "react";
import { Menu, X, Info, Phone, Store, ChevronRight, UserPlus, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import hiveLogo from "@/assets/hive-logo.jpeg";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const navItems = [
    { label: "About", icon: Info, desc: "Learn about The Hive", path: "/" },
    { label: "Contact", icon: Phone, desc: "Get in touch with us", path: "/" },
    { label: "For Retailers", icon: Store, desc: "Grow your business", path: "/retailer-studio" },
    ...(user
      ? [{ label: "Logout", icon: LogOut, desc: "Sign out of your account", path: "logout" }]
      : [{ label: "Login", icon: LogIn, desc: "Access your account", path: "/login" }]),
  ];

  const handleNav = async (path: string) => {
    if (path === "logout") {
      await signOut();
      navigate("/");
    } else {
      navigate(path);
    }
    setOpen(false);
  };

  return (
    <>
      <header className="glass-header sticky top-0 z-50 px-4 md:px-8 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <img src={hiveLogo} alt="The Hive" className="w-9 h-9 rounded-full object-cover border border-primary/30" />
          <h1 className="text-primary text-xl md:text-2xl font-display font-bold tracking-tight">THE HIVE</h1>
        </div>
        <button 
          onClick={() => setOpen(!open)} 
          className="text-foreground p-2 rounded-lg hover:bg-secondary transition-colors" 
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Floating Dropdown Menu (for mobile and tablet) */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)} 
              className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm md:hidden"
            />
            
            {/* Floating Menu */}
            <motion.nav 
              initial={{ opacity: 0, y: -10, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-14 right-4 w-[calc(100vw-2rem)] max-w-sm z-[70] bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/20 flex flex-col overflow-hidden md:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/20">
                <div className="flex items-center gap-2.5">
                  <img src={hiveLogo} alt="The Hive" className="w-8 h-8 rounded-full object-cover border border-primary/30" />
                  <div>
                    <p className="font-display font-bold text-primary text-xs">THE HIVE</p>
                    <p className="text-[10px] text-muted-foreground">
                      {user ? (profile?.full_name || "Marketplace") : "Marketplace"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setOpen(false)} 
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground" 
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                {navItems.map((item, i) => (
                  <motion.button 
                    key={item.label} 
                    onClick={() => handleNav(item.path)}
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: 0.05 * i + 0.1 }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-secondary transition-all group w-full"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                      <item.icon size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-xs">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{item.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border/20">
                {user ? (
                  <button 
                    onClick={() => handleNav("logout")} 
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-border rounded-xl text-foreground hover:bg-secondary transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                ) : (
                  <button 
                    onClick={() => { navigate("/signup"); setOpen(false); }} 
                    className="btn-gold w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl"
                  >
                    <UserPlus size={14} />
                    Sign Up
                  </button>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Menu (visible on md and above) - collapsible dropdown */}
      {open && (
        <motion.nav
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="absolute top-14 right-8 w-80 z-[70] bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/20 flex flex-col overflow-hidden hidden md:flex"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/20">
            <div className="flex items-center gap-2.5">
              <img src={hiveLogo} alt="The Hive" className="w-8 h-8 rounded-full object-cover border border-primary/30" />
              <div>
                <p className="font-display font-bold text-primary text-xs">THE HIVE</p>
                <p className="text-[10px] text-muted-foreground">
                  {user ? (profile?.full_name || "Marketplace") : "Marketplace"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1">
            {navItems.map((item, i) => (
              <motion.button
                key={item.label}
                onClick={() => handleNav(item.path)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i + 0.1 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:bg-secondary transition-all group w-full"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                  <item.icon size={16} className="text-primary" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-xs">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{item.desc}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </motion.button>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border/20">
            {user ? (
              <button
                onClick={() => handleNav("logout")}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-border rounded-xl text-foreground hover:bg-secondary transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => { navigate("/signup"); setOpen(false); }}
                className="btn-gold w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl"
              >
                <UserPlus size={14} />
                Sign Up
              </button>
            )}
          </div>
        </motion.nav>
      )}
    </>
  );
};

export default Header;
