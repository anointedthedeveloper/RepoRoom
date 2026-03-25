import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Smile, Paperclip, Phone, Video, ChevronLeft, Info, Mic, X, Reply } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Sounds } from "@/lib/sounds";
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
  is_delivered?: boolean;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  reply_to_id?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}

interface ChatPanelProps {
  chat: EnrichedChatRoom;
  messages: Message[];
  onSendMessage: (text: string, fileUrl?: string, fileType?: string, fileName?: string, replyToId?: string, replyToText?: string, replyToSender?: string) => void;
  onStartCall: (type: "audio" | "video") => void;
  onTyping?: () => void;
  isOtherTyping?: boolean;
  onToggleSidebar?: () => void;
  onToggleProfile?: () => void;
  profileOpen?: boolean;
  isSecondPanel?: boolean;
  onToggleSecondProfile?: () => void;
}

interface ReplyState {
  id: string;
  text: string;
  senderName: string;
}

const ChatPanel = ({ chat, messages, onSendMessage, onStartCall, onTyping, isOtherTyping, onToggleSidebar, onToggleProfile, profileOpen, isSecondPanel, onToggleSecondProfile }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyState | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const { wallpaper } = useThemeContext();
  const prevMsgCount = useRef(messages.length);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();

  // Play sound on new incoming message
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const newest = messages[messages.length - 1];
      if (newest?.sender_id !== user?.id) Sounds.message();
    }
    prevMsgCount.current = messages.length;
  }, [messages, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    setReplyTo(null);
  }, [chat.id]);

  const uploadFile = useCallback(async (file: File, customType?: string): Promise<{ url: string; type: string; name: string } | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user?.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: true });
    if (error) { setUploadError(`Upload failed: ${error.message}`); return null; }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return { url: urlData.publicUrl, type: customType || file.type, name: file.name };
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;
    setUploading(true);
    setUploadError(null);

    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let fileName: string | undefined;

    if (selectedFile) {
      const result = await uploadFile(selectedFile);
      if (result) { fileUrl = result.url; fileType = result.type; fileName = result.name; }
      else { setUploading(false); setSelectedFile(null); return; }
      setSelectedFile(null);
    }

    onSendMessage(
      input.trim() || (fileName ? `📎 ${fileName}` : ""),
      fileUrl, fileType, fileName,
      replyTo?.id, replyTo?.text, replyTo?.senderName
    );
    setInput("");
    setReplyTo(null);
    setUploading(false);
    Sounds.sent();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") setReplyTo(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setUploadError(null); }
    e.target.value = "";
  };

  const handleReply = (msg: { id: string; text: string; sender_id: string }) => {
    const member = chat.members.find((m) => m.user_id === msg.sender_id);
    const senderName = msg.sender_id === user?.id
      ? "You"
      : member?.profiles?.display_name || member?.profiles?.username || "Unknown";
    setReplyTo({ id: msg.id, text: msg.text, senderName });
    inputRef.current?.focus();
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        setUploading(true);
        const result = await uploadFile(file);
        if (result) {
          onSendMessage("Voice message", result.url, "audio/webm", result.name, replyTo?.id, replyTo?.text, replyTo?.senderName);
          setReplyTo(null);
        }
        setUploading(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      setUploadError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const hasInput = input.trim() || selectedFile;

  return (
    <div
      className={`h-full flex flex-col bg-background min-w-0 ${wallpaper ? "chat-wallpaper" : ""}`}
      style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}
    >
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onToggleSidebar} className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={onToggleProfile} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-0">
            <AvatarBubble
              letter={chat.displayAvatar}
              status={chat.is_group ? undefined : (chat.otherMemberStatus as "online" | "offline" | undefined)}
              imageUrl={chat.is_group ? null : (chat.members.find(m => m.user_id !== user?.id)?.profiles?.avatar_url ?? null)}
            />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">{chat.displayName}</h2>
              <p className="text-[11px] text-muted-foreground">
                {chat.is_group
                  ? `${chat.members.length} members · ${chat.onlineCount ?? 0} online`
                  : chat.otherMemberStatus === "online" ? "Online" : "Offline"}
              </p>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Message count badge */}
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{messages.length}</span>
          )}
          {isSecondPanel && (
            <>
              <button onClick={onToggleSecondProfile} className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground`}>
                <Info className="h-4 w-4" />
              </button>
              <button onClick={onToggleSidebar} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Close split view">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {!isSecondPanel && (
            <>
              <button onClick={() => onStartCall("audio")} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Phone className="h-4 w-4" />
              </button>
              <button onClick={() => onStartCall("video")} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Video className="h-4 w-4" />
              </button>
              <button onClick={onToggleProfile} className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors ${profileOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
                <Info className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const prev = messages[i - 1];
            const msgDate = new Date(msg.created_at);
            const prevDate = prev ? new Date(prev.created_at) : null;
            const showDate = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
            return (
              <MessageBubble
                key={msg.id}
                showDate={showDate}
                message={{
                  id: msg.id,
                  senderId: msg.sender_id,
                  text: msg.content,
                  timestamp: msgDate,
                  read: msg.is_read,
                  delivered: msg.is_delivered,
                  fileUrl: msg.file_url || undefined,
                  fileType: msg.file_type || undefined,
                  fileName: msg.file_name || undefined,
                  replyTo: msg.reply_to_text ? { text: msg.reply_to_text, senderName: msg.reply_to_sender || "Unknown" } : null,
                }}
                isMine={msg.sender_id === user?.id}
                onReply={() => handleReply({ id: msg.id, text: msg.content, sender_id: msg.sender_id })}
              />
            );
          })}
        </AnimatePresence>
        {isOtherTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t border-border bg-muted/40 flex items-center gap-2"
          >
            <Reply className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
              <p className="text-xs text-muted-foreground truncate">{replyTo.text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
      <div className="px-3 py-3 border-t border-border relative shrink-0">
        {showEmoji && (
          <EmojiPicker
            onSelect={(emoji) => { setInput((prev) => prev + emoji); inputRef.current?.focus(); }}
            onClose={() => setShowEmoji(false)}
          />
        )}

        {recording ? (
          <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-2.5">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0" />
            <span className="text-sm text-foreground flex-1">{formatRecTime(recordingTime)} Recording...</span>
            <button onClick={cancelRecording} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-5 w-5" />
            </button>
            <button onClick={stopRecording} className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground">
              <Send className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEmoji(!showEmoji)} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <Smile className="h-5 w-5" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip"
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
            {hasInput ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={uploading}
                className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0 disabled:opacity-40 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0"
              >
                <Mic className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
