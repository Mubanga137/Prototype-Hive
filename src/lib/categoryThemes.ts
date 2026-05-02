export interface CategoryTheme {
  key: string;
  emoji: string;
  title: string;
  subtitle: string;
  /** HSL values without hsl() wrapper, e.g. "210 100% 50%" */
  accentHsl: string;
  /** Tailwind-compatible color classes for buttons */
  btnBg: string;
  btnHover: string;
  btnText: string;
  /** Border accent */
  borderAccent: string;
  /** Pill active classes */
  pillActive: string;
  /** Radial gradient for page wash */
  gradient: string;
  /** Hex color for honeycomb SVG strokes */
  honeycombColor: string;
  /** Badge/tag accent */
  tagBg: string;
}

export const categoryThemes: Record<string, CategoryTheme> = {
  tech: {
    key: "tech",
    emoji: "📱",
    title: "Tech",
    subtitle: "Futuristic gadgets, phones & smart accessories",
    accentHsl: "38 73% 40%",
    btnBg: "bg-[#B37C1C]",
    btnHover: "hover:bg-[#0F1A35]",
    btnText: "text-white",
    borderAccent: "border-[#B37C1C]/40 hover:border-[#B37C1C]",
    pillActive: "bg-[#B37C1C] text-white border-[#B37C1C]",
    gradient: "radial-gradient(ellipse at 50% 0%, rgba(179,124,28,0.12) 0%, rgba(179,124,28,0.04) 50%, transparent 80%)",
    honeycombColor: "#B37C1C",
    tagBg: "bg-[#B37C1C]/15 text-[#B37C1C]",
  },
  fashion: {
    key: "fashion",
    emoji: "👗",
    title: "Fashion",
    subtitle: "Curated style — haute couture to streetwear",
    accentHsl: "38 73% 40%",
    btnBg: "bg-[#B37C1C]",
    btnHover: "hover:bg-[#0F1A35]",
    btnText: "text-white",
    borderAccent: "border-[#B37C1C]/40 hover:border-[#B37C1C]",
    pillActive: "bg-[#B37C1C] text-white border-[#B37C1C]",
    gradient: "radial-gradient(ellipse at 50% 0%, rgba(179,124,28,0.12) 0%, rgba(179,124,28,0.04) 50%, transparent 80%)",
    honeycombColor: "#B37C1C",
    tagBg: "bg-[#B37C1C]/15 text-[#B37C1C]",
  },
  food: {
    key: "food",
    emoji: "🍟",
    title: "Food",
    subtitle: "Farm-fresh, organic & local delicacies",
    accentHsl: "38 73% 40%",
    btnBg: "bg-[#B37C1C]",
    btnHover: "hover:bg-[#0F1A35]",
    btnText: "text-white",
    borderAccent: "border-[#B37C1C]/40 hover:border-[#B37C1C]",
    pillActive: "bg-[#B37C1C] text-white border-[#B37C1C]",
    gradient: "radial-gradient(ellipse at 50% 0%, rgba(179,124,28,0.12) 0%, rgba(179,124,28,0.04) 50%, transparent 80%)",
    honeycombColor: "#B37C1C",
    tagBg: "bg-[#B37C1C]/15 text-[#B37C1C]",
  },
  entertainment: {
    key: "entertainment",
    emoji: "🎬",
    title: "Entertainment",
    subtitle: "Cinematic experiences, events & media",
    accentHsl: "38 73% 40%",
    btnBg: "bg-[#B37C1C]",
    btnHover: "hover:bg-[#0F1A35]",
    btnText: "text-white",
    borderAccent: "border-[#B37C1C]/40 hover:border-[#B37C1C]",
    pillActive: "bg-[#B37C1C] text-white border-[#B37C1C]",
    gradient: "radial-gradient(ellipse at 50% 0%, rgba(179,124,28,0.12) 0%, rgba(179,124,28,0.04) 50%, transparent 80%)",
    honeycombColor: "#B37C1C",
    tagBg: "bg-[#B37C1C]/15 text-[#B37C1C]",
  },
  beauty: {
    key: "beauty",
    emoji: "💄",
    title: "Beauty & Cosmetics",
    subtitle: "Premium skincare, haircare & cosmetics",
    accentHsl: "38 73% 40%",
    btnBg: "bg-[#B37C1C]",
    btnHover: "hover:bg-[#0F1A35]",
    btnText: "text-white",
    borderAccent: "border-[#B37C1C]/40 hover:border-[#B37C1C]",
    pillActive: "bg-[#B37C1C] text-white border-[#B37C1C]",
    gradient: "radial-gradient(ellipse at 50% 0%, rgba(179,124,28,0.12) 0%, rgba(179,124,28,0.04) 50%, transparent 80%)",
    honeycombColor: "#B37C1C",
    tagBg: "bg-[#B37C1C]/15 text-[#B37C1C]",
  },
};
