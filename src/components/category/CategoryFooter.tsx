import { motion } from "framer-motion";
import { Zap, Shield, Truck, RefreshCw, Heart, Share2, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { CategoryTheme } from "@/lib/categoryThemes";

interface CategoryFooterProps {
  theme: CategoryTheme;
}

const CategoryFooter = ({ theme }: CategoryFooterProps) => {
  const features = [
    {
      icon: <Zap size={24} />,
      title: "Fast Service",
      description: "Quick processing and delivery times",
    },
    {
      icon: <Shield size={24} />,
      title: "Secure Transactions",
      description: "Your data is always protected",
    },
    {
      icon: <Truck size={24} />,
      title: "Easy Returns",
      description: "Hassle-free returns and exchanges",
    },
    {
      icon: <RefreshCw size={24} />,
      title: "Quality Assured",
      description: "All products verified and authentic",
    },
  ];

  const quickLinks = [
    { label: "About Us", href: "#" },
    { label: "How it Works", href: "#" },
    { label: "Pricing", href: "#" },
    { label: "Blog", href: "#" },
  ];

  const supportLinks = [
    { label: "Contact Us", href: "#" },
    { label: "FAQ", href: "#" },
    { label: "Support Center", href: "#" },
    { label: "Feedback", href: "#" },
  ];

  const socials = [
    { icon: <Facebook size={18} />, href: "#", label: "Facebook" },
    { icon: <Twitter size={18} />, href: "#", label: "Twitter" },
    { icon: <Instagram size={18} />, href: "#", label: "Instagram" },
    { icon: <Linkedin size={18} />, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="bg-gradient-to-b from-[#FFFBF2] to-[#FFF9F0] border-t border-[#B37C1C]/20 mt-16">
      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto px-4 md:px-8 py-12"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="text-center"
            >
              <div className="flex justify-center mb-3 text-[#B37C1C]">
                {feature.icon}
              </div>
              <h4 className="font-semibold text-sm md:text-base text-[#0F1A35] mb-1">
                {feature.title}
              </h4>
              <p className="text-xs md:text-sm text-[#0F1A35]/60">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#B37C1C]/30 to-transparent" />

      {/* Main Footer Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto px-4 md:px-8 py-12"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <h3 className="font-display font-bold text-lg text-[#0F1A35] mb-3">
              The Hive
            </h3>
            <p className="text-sm text-[#0F1A35]/70 mb-4">
              Your trusted marketplace for quality products and professional services.
            </p>
            <div className="flex gap-3">
              {socials.map((social, idx) => (
                <motion.a
                  key={idx}
                  href={social.href}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-full bg-[#B37C1C]/10 text-[#B37C1C] hover:bg-[#B37C1C] hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-[#0F1A35] mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.href}
                    className="text-sm text-[#0F1A35]/70 hover:text-[#B37C1C] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display font-bold text-[#0F1A35] mb-4">Support</h4>
            <ul className="space-y-2">
              {supportLinks.map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.href}
                    className="text-sm text-[#0F1A35]/70 hover:text-[#B37C1C] transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-[#B37C1C]/10 to-[#B37C1C]/5 rounded-2xl p-6 md:p-8 mb-8 border border-[#B37C1C]/20"
        >
          <div className="max-w-md">
            <h4 className="font-display font-bold text-[#0F1A35] mb-2">
              Stay Updated
            </h4>
            <p className="text-sm text-[#0F1A35]/70 mb-4">
              Subscribe to get exclusive deals and updates on new products.
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-[#B37C1C]/20 text-[#0F1A35] placeholder:text-[#0F1A35]/50 focus:outline-none focus:ring-2 focus:ring-[#B37C1C]"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-[#B37C1C] text-white rounded-lg font-semibold hover:bg-[#0F1A35] transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Bar */}
      <div className="border-t border-[#B37C1C]/20 py-6 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs md:text-sm text-[#0F1A35]/60 text-center md:text-left">
              © 2025 The Hive. All rights reserved. | Designed with care for vendors and customers in Zambia.
            </p>
            <div className="flex gap-4 md:gap-6">
              <a href="#" className="text-xs text-[#0F1A35]/60 hover:text-[#B37C1C] transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-[#0F1A35]/60 hover:text-[#B37C1C] transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-xs text-[#0F1A35]/60 hover:text-[#B37C1C] transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CategoryFooter;
