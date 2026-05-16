import { motion } from "framer-motion";
import { Mail, MapPin, Phone, ExternalLink } from "lucide-react";

export const GlobalFooter = () => {
  const footerLinks = [
    {
      label: "About The Hive",
      href: "#",
      description: "Learn more about our marketplace and mission"
    },
    {
      label: "Help Center",
      href: "#",
      description: "FAQs, guides, and support resources"
    },
    {
      label: "Join as Vendor",
      href: "#",
      description: "Become a seller and grow your business"
    }
  ];

  return (
    <footer
      className="w-full mt-16 pt-12 pb-8 border-t"
      style={{
        backgroundColor: "#FFFBF2",
        borderColor: "hsl(38,40%,85%)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h4 className="font-display font-bold text-foreground mb-4">THE HIVE</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Connecting local businesses with customers through seamless marketplace experiences.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin size={16} style={{ color: "#B37C1C" }} />
                <span>Lusaka, Zambia</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} style={{ color: "#B37C1C" }} />
                <a href="mailto:support@thehive.com" className="hover:text-foreground transition-colors">
                  support@thehive.com
                </a>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-display font-bold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    {link.label}
                    <ExternalLink
                      size={14}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: "#B37C1C" }}
                    />
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Newsletter / CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-display font-bold text-foreground mb-4">Stay Updated</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to get exclusive deals and platform updates.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                style={{ borderColor: "#B37C1C" }}
              />
              <button
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#FFFBF2] transition-transform hover:scale-105"
                style={{ backgroundColor: "#B37C1C" }}
              >
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <div
          className="border-t pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground"
          style={{ borderColor: "hsl(38,40%,85%)" }}
        >
          <p>© 2024 The Hive. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;
