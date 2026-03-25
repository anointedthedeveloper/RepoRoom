import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const EmptyChatPanel = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center">
          <MessageSquare className="h-10 w-10 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">PulseChat</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select a conversation to start messaging
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="h-2 w-2 rounded-full bg-online animate-pulse" />
          <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
        </div>
      </motion.div>
      <p className="absolute bottom-6 text-xs text-muted-foreground">
        Built by AnointedTheDeveloper
      </p>
    </div>
  );
};

export default EmptyChatPanel;
