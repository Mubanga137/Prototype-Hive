import { Menu } from "lucide-react";
import hiveLogo from "@/assets/hive-logo.jpeg";

interface DashboardHeaderProps {
  title: string; // e.g., "Retailer Studio", "Customer Mall", "Warehouse", "Gig Radar"
  onMenuToggle: () => void;
}

export const DashboardHeader = ({ title, onMenuToggle }: DashboardHeaderProps) => {
  return (
    <header className="glass-header sticky top-0 z-30 px-4 py-3 flex items-center justify-between lg:hidden">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle} 
          className="p-2 rounded-lg transition-colors"
          style={{
            background: "hsl(39,100%,97%)",
            color: "hsl(38,73%,40%)"
          }}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2.5">
          <img src={hiveLogo} alt="The Hive" className="w-8 h-8 rounded-full object-cover border border-[#B37C1C]/30" />
          <div>
            <p className="font-display font-bold text-[#0F1A35] text-sm tracking-tight">THE HIVE</p>
            <p className="text-[10px] text-[#0F1A35]/60">{title}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
