import { MessageSquare, Menu } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyChatPanelProps {
  onToggleSidebar?: () => void;
}

const EmptyChatPanel = ({ onToggleSidebar }: EmptyChatPanelProps) => {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile header */}
      <div className="lg:hidden px-4 py-3 border-b border-border flex items-center">
        <button
          onClick={onToggleSidebar}
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="ml-3 text-sm font-semibold text-foreground">ChatFlow</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center px-6"
        >
          <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center">
            <MessageSquare className="h-10 w-10 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">ChatFlow</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a conversation to start messaging
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-2 w-2 rounded-full bg-online animate-pulse" />
            <span className="text-xs text-muted-foreground">End-to-end encrypted</span>
          </div>
          {/* Mobile CTA */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden mt-2 gradient-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-xl"
          >
            Open Chats
          </button>
        </motion.div>
        <p className="absolute bottom-6 text-xs text-muted-foreground">
          Built by AnointedTheDeveloper
        </p>
      </div>
    </div>
  );
};

export default EmptyChatPanel;
