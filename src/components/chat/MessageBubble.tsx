import { motion } from "framer-motion";
import { Check, CheckCheck, FileText, Download } from "lucide-react";

interface MessageData {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  read: boolean;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

interface MessageBubbleProps {
  message: MessageData;
  isMine: boolean;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MessageBubble = ({ message, isMine }: MessageBubbleProps) => {
  const isImage = message.fileType?.startsWith("image/");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} px-4 py-0.5`}
    >
      <div
        className={`max-w-[70%] px-4 py-2.5 ${
          isMine
            ? "gradient-primary text-primary-foreground rounded-2xl rounded-br-sm"
            : "bg-received text-foreground rounded-2xl rounded-bl-sm"
        }`}
      >
        {/* File attachment */}
        {message.fileUrl && (
          <div className="mb-2">
            {isImage ? (
              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={message.fileUrl}
                  alt={message.fileName || "Image"}
                  className="rounded-lg max-h-60 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                />
              </a>
            ) : (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  isMine ? "bg-primary-foreground/10" : "bg-muted"
                } hover:opacity-80 transition-opacity`}
              >
                <FileText className="h-8 w-8 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{message.fileName || "File"}</p>
                  <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    Tap to download
                  </p>
                </div>
                <Download className="h-4 w-4 shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Text content - hide if it's just the file placeholder */}
        {message.text && !(message.fileUrl && message.text.startsWith("📎")) && (
          <p className="text-sm leading-relaxed break-words">{message.text}</p>
        )}

        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {formatTime(message.timestamp)}
          </span>
          {isMine && (
            message.read
              ? <CheckCheck className="h-3 w-3 text-online" />
              : <Check className="h-3 w-3 text-primary-foreground/60" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
