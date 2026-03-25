import { motion } from "framer-motion";

interface AvatarBubbleProps {
  letter: string;
  status?: "online" | "offline";
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

const AvatarBubble = ({ letter, status, size = "md" }: AvatarBubbleProps) => {
  return (
    <div className="relative shrink-0">
      <div className={`${sizes[size]} gradient-primary rounded-full flex items-center justify-center font-semibold text-primary-foreground`}>
        {letter}
      </div>
      {status && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
            status === "online" ? "bg-online" : "bg-offline"
          }`}
        />
      )}
    </div>
  );
};

export default AvatarBubble;
