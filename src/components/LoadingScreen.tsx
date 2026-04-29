import { motion } from "framer-motion";
import hiveLogo from "@/assets/hive-logo.jpeg";

interface LoadingScreenProps {
  message?: "workspace" | "dashboard" | "custom";
  customText?: string;
}

const LoadingScreen = ({ message = "workspace", customText }: LoadingScreenProps) => {
  const messages = {
    workspace: "Loading workspace",
    dashboard: "Loading personalized dashboard",
    custom: customText || "Loading",
  };

  const displayText = messages[message];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background/95 flex flex-col items-center justify-center z-[1000] backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        {/* Animated Hive Logo */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotateZ: [0, 2, -2, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative"
        >
          <img
            src={hiveLogo}
            alt="The Hive"
            className="w-24 h-24 rounded-full object-cover border-2 border-primary shadow-2xl"
          />
          <motion.div
            animate={{
              boxShadow: [
                "0 0 20px hsl(38, 73%, 40%, 0.3)",
                "0 0 40px hsl(38, 73%, 40%, 0.6)",
                "0 0 20px hsl(38, 73%, 40%, 0.3)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full"
          />
        </motion.div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
            {displayText}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            We're setting things up for you...
          </p>
        </motion.div>

        {/* Animated Dots */}
        <motion.div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "hsl(38, 73%, 40%)" }}
            />
          ))}
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="w-48 h-1 bg-secondary rounded-full overflow-hidden mt-4"
        >
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-full w-1/4 bg-gradient-to-r from-primary/0 via-primary to-primary/0 rounded-full"
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
