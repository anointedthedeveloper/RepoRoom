import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Smile, Paperclip, Phone, Video, MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MessageBubble from "./MessageBubble";
import AvatarBubble from "./AvatarBubble";
import EmojiPicker from "./EmojiPicker";
import FilePreview from "./FilePreview";
import TypingIndicator from "./TypingIndicator";
import type { EnrichedChatRoom } from "@/hooks/useChat";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
}

interface ChatPanelProps {
  chat: EnrichedChatRoom;
  messages: Message[];
  onSendMessage: (text: string, fileUrl?: string, fileType?: string, fileName?: string) => void;
  onStartCall: (type: "audio" | "video") => void;
  onTyping?: () => void;
  isOtherTyping?: boolean;
}

const ChatPanel = ({ chat, messages, onSendMessage, onStartCall, onTyping, isOtherTyping }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chat.id]);

  const uploadFile = useCallback(async (file: File): Promise<{ url: string; type: string; name: string } | null> => {
    const ext = file.name.split(".").pop();
    const path = `${user?.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: true });
    if (error) {
      console.error("Upload error:", error.message);
      setUploadError(`Upload failed: ${error.message}`);
      return null;
    }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return { url: urlData.publicUrl, type: file.type, name: file.name };
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;
    setUploading(true);

    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let fileName: string | undefined;

    if (selectedFile) {
      const result = await uploadFile(selectedFile);
      if (result) {
        fileUrl = result.url;
        fileType = result.type;
        fileName = result.name;
      } else {
        setUploading(false);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(null);
    }

    onSendMessage(input.trim() || (fileName ? `📎 ${fileName}` : ""), fileUrl, fileType, fileName);
    setInput("");
    setUploading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    e.target.value = "";
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <AvatarBubble
            letter={chat.displayAvatar}
            status={chat.is_group ? undefined : (chat.otherMemberStatus as "online" | "offline" | undefined)}
            imageUrl={chat.is_group ? null : (chat.members.find(m => m.user_id !== user?.id)?.profiles?.avatar_url ?? null)}
          />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{chat.displayName}</h2>
            <p className="text-[11px] text-muted-foreground">
              {chat.is_group
                ? `${chat.members.length} members`
                : chat.otherMemberStatus === "online"
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStartCall("audio")}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => onStartCall("video")}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Video className="h-4 w-4" />
          </button>
          <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{
                id: msg.id,
                senderId: msg.sender_id,
                text: msg.content,
                timestamp: new Date(msg.created_at),
                read: msg.is_read,
                fileUrl: msg.file_url || undefined,
                fileType: msg.file_type || undefined,
                fileName: msg.file_name || undefined,
              }}
              isMine={msg.sender_id === user?.id}
            />
          ))}
        </AnimatePresence>
        {isOtherTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {selectedFile && (
        <div className="px-4 pt-2">
          <FilePreview file={selectedFile} onRemove={() => setSelectedFile(null)} />
        </div>
      )}
      {uploadError && (
        <div className="px-4 py-1">
          <p className="text-xs text-destructive">{uploadError}</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border relative">
        {showEmoji && (
          <EmojiPicker
            onSelect={(emoji) => {
              setInput((prev) => prev + emoji);
              inputRef.current?.focus();
            }}
            onClose={() => setShowEmoji(false)}
          />
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <Smile className="h-5 w-5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); onTyping?.(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={(!input.trim() && !selectedFile) || uploading}
            className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0 disabled:opacity-40 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
