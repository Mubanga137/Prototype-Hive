import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface PremiumCategoryCardProps {
  label: string;
  description: string;
  imageUrl: string;
  path: string;
  accentColor: string;
  index?: number;
}

const PremiumCategoryCard = ({
  label,
  description,
  imageUrl,
  path,
  accentColor,
  index = 0,
}: PremiumCategoryCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, type: "spring", damping: 20 }}
      whileHover={{ y: -8 }}
      onClick={() => navigate(path)}
      className="group relative w-full h-72 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col shadow-lg hover:shadow-2xl"
    >
      {/* Background Wrapper with depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 to-slate-900/10 rounded-3xl" />

      {/* Image Header (65% of card) - Premium backdrop */}
      <div className="relative h-[65%] w-full overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300">
        {/* Primary Image Layer */}
        <img
          src={imageUrl}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />

        {/* Multi-layer Overlay System */}
        {/* Light overlay for base */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/20" />

        {/* Enhanced dark gradient overlay on hover - more sophisticated */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

        {/* Accent glow light on image - only on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-400"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${accentColor}, transparent 60%)`,
          }}
        />

        {/* Top accent bar with glow */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 shadow-lg"
          style={{
            background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
            boxShadow: `0 0 20px ${accentColor}66`,
          }}
        />

        {/* Corner accent accent for depth */}
        <div
          className="absolute top-4 right-4 w-12 h-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400"
          style={{
            background: `radial-gradient(circle, ${accentColor}40, transparent)`,
            boxShadow: `0 0 24px ${accentColor}60`,
          }}
        />
      </div>

      {/* Card Body (35% of card) - Premium bottom section */}
      <div className="flex-1 flex flex-col justify-between p-5 bg-gradient-to-br from-[#FFFBF2] via-[#FFFBF2] to-[#FFF5E6] relative overflow-hidden">
        {/* Subtle background texture effect */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 0 0, ${accentColor}08 0%, transparent 50%)`,
            }}
          />
        </div>

        {/* Content wrapper */}
        <div className="relative z-10 text-left">
          <h3 className="text-lg font-display font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors duration-300">
            {label}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        {/* Bottom Action Hint - elevated */}
        <motion.div
          className="flex items-center gap-2.5 mt-2"
          whileHover={{ gap: 8 }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest transition-colors duration-300"
            style={{ color: accentColor }}
          >
            Explore
          </span>
          <motion.div
            className="p-1 rounded-full transition-all duration-300"
            style={{
              background: `${accentColor}15`,
            }}
            whileHover={{ scale: 1.2 }}
          >
            <ChevronRight size={14} style={{ color: accentColor }} />
          </motion.div>
        </motion.div>
      </div>

      {/* Sophisticated border with glow on hover */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{
          border: `2px solid ${accentColor}`,
          boxShadow: `0 0 30px ${accentColor}40, inset 0 0 40px ${accentColor}15`,
        }}
      />

      {/* Bottom reflection effect on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-32 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-3xl"
        style={{
          background: `linear-gradient(to top, ${accentColor}10, transparent)`,
        }}
      />
    </motion.button>
  );
};

export default PremiumCategoryCard;
