import { BadgeCheck, MessageCircle } from "lucide-react";

interface Props {
  logoUrl?: string | null;
  brandName?: string | null;
  onMessage?: () => void;
}

const ProfileHeader = ({ logoUrl, brandName, onMessage }: Props) => {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo + Name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center overflow-hidden text-lg font-display font-bold text-primary shadow-sm">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              brandName?.[0]?.toUpperCase() || "S"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-display font-bold text-foreground truncate">
                {brandName || "Store"}
              </p>
              <BadgeCheck size={16} className="text-blue-500 shrink-0" />
            </div>
          </div>
        </div>

        {/* Message Button */}
        <button
          onClick={onMessage}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold">
          <MessageCircle size={16} /> Message
        </button>
      </div>
    </div>
  );
};

export default ProfileHeader;
