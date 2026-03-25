import { motion } from "framer-motion";

const TypingIndicator = () => {
  return (
    <div className="flex items-end gap-2 px-4 py-2">
      <div className="bg-received rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default TypingIndicator;
