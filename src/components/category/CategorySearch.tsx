import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { CategoryTheme } from "@/lib/categoryThemes";

interface CategorySearchProps {
  theme: CategoryTheme;
  onSearch: (query: string) => void;
  placeholder?: string;
}

const CategorySearch = ({ theme, onSearch, placeholder }: CategorySearchProps) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-8"
    >
      <div
        className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
          isFocused
            ? "bg-white border-primary shadow-lg"
            : "bg-card border-border hover:border-primary/30"
        }`}
      >
        <Search
          size={20}
          className={`transition-colors ${isFocused ? "text-primary" : "text-muted-foreground"}`}
        />

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || `Search in ${theme.title}…`}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
        />

        {query && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={handleClear}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <X size={18} className="text-muted-foreground" />
          </motion.button>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-2 px-1">
        Search across all {theme.title.toLowerCase()} products and services
      </p>
    </motion.div>
  );
};

export default CategorySearch;
