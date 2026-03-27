import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

const PageLoader = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-16 w-16 items-center justify-center rounded-3xl gradient-primary shadow-[0_20px_50px_hsl(var(--primary)/0.35)]"
    >
      <MessageSquare className="h-7 w-7 text-primary-foreground" />
    </motion.div>
    <div className="mt-6 flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
    <p className="mt-3 text-xs font-medium tracking-widest uppercase text-muted-foreground">RepoRoom</p>
  </div>
);

export default PageLoader;
