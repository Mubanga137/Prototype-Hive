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
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      onClick={() => navigate(path)}
      className="group relative w-full h-64 rounded-2xl overflow-hidden border border-border bg-card cursor-pointer shadow-sm transition-all duration-300 flex flex-col"
    >
      {/* Image Header (60% of card) */}
      <div className="relative h-[60%] w-full overflow-hidden bg-gradient-to-br from-secondary to-muted">
        {/* Background Image */}
        <img
          src={imageUrl}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Dark Gradient Overlay (for text readability) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: accentColor }}
        />
      </div>

      {/* Card Body (40% of card) */}
      <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-br from-[#FFFBF2] to-[#FFF8EF]">
        {/* Content */}
        <div className="text-left">
          <h3 className="text-lg font-display font-bold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
            {label}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Bottom Action Hint */}
        <div className="flex items-center gap-2 text-primary group-hover:translate-x-1 transition-transform duration-300">
          <span className="text-xs font-semibold uppercase tracking-wide">Browse</span>
          <ChevronRight size={14} />
        </div>
      </div>

      {/* Hover Border Accent */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          border: `2px solid ${accentColor}`,
          boxShadow: `inset 0 0 20px ${accentColor}20`,
        }}
      />
    </motion.button>
  );
};

export default PremiumCategoryCard;
