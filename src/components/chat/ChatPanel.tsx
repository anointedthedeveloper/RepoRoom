import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Smile, Paperclip, Phone, Video, ChevronLeft, Info, Mic, X, Reply, Pencil, Search, Pin, Clock, Forward, CheckSquare, Trash2 } from "lucide-react";
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
import ImageCropper from "./ImageCropper";
import type { EnrichedChatRoom } from "@/hooks/useChat";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  is_delivered?: boolean;
  is_edited?: boolean;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  reply_to_id?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}

interface Reaction { emoji: string; count: number; mine: boolean; }

interface ChatPanelProps {
  chat: EnrichedChatRoom;
  messages: Message[];
  reactions?: Array<{ id: string; message_id: string; user_id: string; emoji: string }>;
  onSendMessage: (text: string, fileUrl?: string, fileType?: string, fileName?: string, replyToId?: string, replyToText?: string, replyToSender?: string, scheduledFor?: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReact?: (msgId: string, emoji: string) => void;
  onPin?: (msgId: string, text: string) => void;
  onUnpin?: () => void;
  onForward?: (content: string, fileUrl?: string, fileType?: string, fileName?: string, targetRoomIds?: string[]) => void;
  onClearChat?: () => void;
  onAcceptRequest?: () => void;
  onDeclineRequest?: () => void;
  onStartCall: (type: "audio" | "video") => void;
  onTyping?: (inputLen?: number) => void;
  isOtherTyping?: boolean;
  typingUsers?: string[];
  onToggleSidebar?: () => void;
  onToggleProfile?: () => void;
  onCloseChat?: () => void;
  profileOpen?: boolean;
  isSecondPanel?: boolean;
  onToggleSecondProfile?: () => void;
  allChats?: Array<{ id: string; displayName: string }>;
}

interface ReplyState {
  id: string;
  text: string;
  senderName: string;
}

interface EditState {
  id: string;
  text: string;
}

interface ChatRoomWithMeta extends EnrichedChatRoom {
  pinned_message_text?: string | null;
  icon_url?: string | null;
}

const ChatPanel = ({ chat, messages, reactions = [], onSendMessage, onEditMessage, onDeleteMessage, onReact, onPin, onUnpin, onForward, onClearChat, onAcceptRequest, onDeclineRequest, onStartCall, onTyping, isOtherTyping, typingUsers = [], onToggleSidebar, onToggleProfile, onCloseChat, profileOpen, isSecondPanel, onToggleSecondProfile, allChats = [] }: ChatPanelProps) => {
  const { user } = useAuth();
  const { wallpaper } = useThemeContext();
  const chatMeta = chat as ChatRoomWithMeta;

  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyState | null>(null);
  const [editMsg, setEditMsg] = useState<EditState | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
  const [forwardMsg, setForwardMsg] = useState<{ content: string; fileUrl?: string; fileType?: string; fileName?: string } | null>(null);
  const [forwardTargets, setForwardTargets] = useState<Set<string>>(new Set());
  const ghostMode = localStorage.getItem("chatflow_ghost_mode") === "true";

  const prevMsgCount = useRef(messages.length);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setEditMsg(null);
  }, [chat.id]);

  // Populate input when editing
  useEffect(() => {
    if (editMsg) { setInput(editMsg.text); inputRef.current?.focus(); }
  }, [editMsg]);

  const uploadFile = useCallback(async (file: File, customType?: string): Promise<{ url: string; type: string; name: string } | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user?.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: true });
    if (error) { setUploadError(`Upload failed: ${error.message}`); return null; }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    return { url: urlData.publicUrl, type: customType || file.type, name: file.name };
  }, [user]);

  const toggleSelectMsg = useCallback((id: string) => {
    setSelectedMsgs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleForwardSelected = () => {
    if (selectedMsgs.size === 0) return;
    const msg = messages.find((m) => selectedMsgs.has(m.id));
    if (msg) setForwardMsg({ content: msg.content, fileUrl: msg.file_url || undefined, fileType: msg.file_type || undefined, fileName: msg.file_name || undefined });
    setSelectedMsgs(new Set());
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedMsgs) await onDeleteMessage?.(id);
    setSelectedMsgs(new Set());
  };

  const handleForwardSend = () => {
    if (!forwardMsg || forwardTargets.size === 0) return;
    onForward?.(forwardMsg.content, forwardMsg.fileUrl, forwardMsg.fileType, forwardMsg.fileName, Array.from(forwardTargets));
    setForwardMsg(null);
    setForwardTargets(new Set());
  };

  const handleSend = async (scheduledFor?: Date) => {
    if (!input.trim() && !selectedFile) return;

    // Edit mode
    if (editMsg) {
      if (input.trim()) await onEditMessage?.(editMsg.id, input.trim());
      setEditMsg(null);
      setInput("");
      return;
    }

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
      replyTo?.id, replyTo?.text, replyTo?.senderName,
      scheduledFor?.toISOString()
    );
    setInput("");
    setReplyTo(null);
    setUploading(false);
    setShowSchedule(false);
    setScheduleTime("");
    Sounds.sent();
  };

  const handleScheduleSend = () => {
    if (!scheduleTime) return;
    handleSend(new Date(scheduleTime));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") { setReplyTo(null); setEditMsg(null); setInput(""); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show cropper for images, otherwise use directly
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => { setCropSrc(ev.target?.result as string); setCropFile(file); };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(file);
      setUploadError(null);
    }
    e.target.value = "";
  };

  const handleCroppedImage = async (blob: Blob) => {
    setCropSrc(null);
    const name = cropFile?.name.replace(/\.[^.]+$/, ".jpg") || `image-${Date.now()}.jpg`;
    const file = new File([blob], name, { type: "image/jpeg" });
    setSelectedFile(file);
    setUploadError(null);
    setCropFile(null);
  };

  const handleReply = (msg: { id: string; text: string; sender_id: string }) => {
    setEditMsg(null);
    const member = chat.members.find((m) => m.user_id === msg.sender_id);
    const senderName = msg.sender_id === user?.id
      ? "You"
      : member?.profiles?.display_name || member?.profiles?.username || "Unknown";
    setReplyTo({ id: msg.id, text: msg.text, senderName });
    inputRef.current?.focus();
  };

  const handleEdit = (msg: { id: string; text: string }) => {
    setReplyTo(null);
    setEditMsg({ id: msg.id, text: msg.text });
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

  // Reactions grouped by message id
  const reactionsByMsg = reactions.reduce<Record<string, Reaction[]>>((acc, r) => {
    if (!acc[r.message_id]) acc[r.message_id] = [];
    const existing = acc[r.message_id].find(x => x.emoji === r.emoji);
    if (existing) { existing.count++; if (r.user_id === user?.id) existing.mine = true; }
    else acc[r.message_id].push({ emoji: r.emoji, count: 1, mine: r.user_id === user?.id });
    return acc;
  }, {});

  // Filtered messages for search
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Pinned message text from chat room
  const pinnedText = chatMeta.pinned_message_text || undefined;
  const isModerator = chat.is_group && (chat.currentUserRole === "owner" || chat.currentUserRole === "admin");

  return (
    <div
      className={`h-full flex flex-col min-w-0 overflow-hidden rounded-[28px] border border-border/70 bg-card/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${wallpaper ? "chat-wallpaper" : ""}`}
      style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}
    >
      {cropSrc && (
        <ImageCropper src={cropSrc} onCrop={handleCroppedImage} onCancel={() => { setCropSrc(null); setCropFile(null); }} />
      )}

      {/* Multi-select toolbar */}
      <AnimatePresence>
        {selectedMsgs.size > 0 && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-primary flex-1">{selectedMsgs.size} selected</span>
            <button onClick={handleForwardSelected} className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80">
              <Forward className="h-3.5 w-3.5" />Forward
            </button>
            <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 text-xs text-destructive hover:opacity-80">
              <Trash2 className="h-3.5 w-3.5" />Delete
            </button>
            <button onClick={() => setSelectedMsgs(new Set())} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward modal */}
      <AnimatePresence>
        {forwardMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setForwardMsg(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border p-4"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Forward to...</span>
                <button onClick={() => setForwardMsg(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-3 truncate">{forwardMsg.content}</p>
              <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                {allChats.filter((c) => c.id !== chat.id).map((c) => (
                  <button key={c.id}
                    onClick={() => setForwardTargets((prev) => {
                      const n = new Set(prev);
                      if (n.has(c.id)) n.delete(c.id);
                      else n.add(c.id);
                      return n;
                    })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-colors ${
                      forwardTargets.has(c.id) ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}>
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                      forwardTargets.has(c.id) ? "bg-primary border-primary" : "border-muted-foreground/40"
                    }`}>
                      {forwardTargets.has(c.id) && <CheckSquare className="h-3 w-3 text-white" />}
                    </div>
                    {c.displayName}
                  </button>
                ))}
              </div>
              <button onClick={handleForwardSend} disabled={forwardTargets.size === 0}
                className="w-full gradient-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold disabled:opacity-40">
                Forward to {forwardTargets.size > 0 ? `${forwardTargets.size} chat${forwardTargets.size > 1 ? "s" : ""}` : "..."}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned message banner */}
      {pinnedText && (
        <div className="px-4 py-2 bg-primary/5 border-b border-border flex items-center gap-2 shrink-0">
          <Pin className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs text-foreground truncate flex-1">{pinnedText}</p>
          {onUnpin && (
            <button onClick={onUnpin} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/70 bg-card/90 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onToggleSidebar} className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <button onClick={onToggleProfile} className="flex items-center gap-2.5 hover:opacity-90 transition-all hover-scale rounded-lg px-1 py-0.5 min-w-0">
            <AvatarBubble
              letter={chat.displayAvatar}
              status={chat.is_group ? undefined : (chat.otherMemberStatus as "online" | "offline" | undefined)}
              imageUrl={chat.is_group ? (chatMeta.icon_url ?? null) : (chat.members.find(m => m.user_id !== user?.id)?.profiles?.avatar_url ?? null)}
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
          {messages.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{messages.length}</span>
          )}
          {isSecondPanel && (
            <>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onToggleSecondProfile} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onToggleSidebar} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Close split view">
                <X className="h-4 w-4" />
              </motion.button>
            </>
          )}
          {!isSecondPanel && (
            <>
              <motion.button whileHover={{ scale: 1.1, color: "hsl(var(--primary))" }} whileTap={{ scale: 0.9 }}
                onClick={() => onStartCall("audio")} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                <Phone className="h-4 w-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1, color: "hsl(var(--primary))" }} whileTap={{ scale: 0.9 }}
                onClick={() => onStartCall("video")} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                <Video className="h-4 w-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => { setSearchOpen(o => !o); setSearchQuery(""); }}
                className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors ${searchOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
                <Search className="h-4 w-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onToggleProfile} className={`h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors ${profileOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
                <Info className="h-4 w-4" />
              </motion.button>
              {onCloseChat && (
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={onCloseChat} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Close chat">
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 py-2 border-b border-border bg-card/80 shrink-0"
          >
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Escape" && setSearchOpen(false)}
              placeholder="Search messages..."
              className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Request Banner */}
      {chat.isPending && !chat.isRequester && (
        <div className="px-4 py-3 bg-primary/5 border-b border-border flex flex-col gap-2 shrink-0">
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-semibold text-foreground">{chat.displayName}</span> wants to send you a message
          </p>
          <div className="flex gap-2">
            <button
              onClick={onDeclineRequest}
              className="flex-1 text-xs py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              Decline
            </button>
            <button
              onClick={onAcceptRequest}
              className="flex-1 text-xs py-1.5 rounded-lg gradient-primary text-primary-foreground font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      )}
      {chat.isPending && chat.isRequester && (
        <div className="px-4 py-2 bg-muted/40 border-b border-border shrink-0">
          <p className="text-xs text-muted-foreground text-center">Waiting for {chat.displayName} to accept your message request</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.015),transparent)]">
        <AnimatePresence initial={false}>
          {filteredMessages.map((msg, i) => {
            const prev = filteredMessages[i - 1];
            const msgDate = new Date(msg.created_at);
            const prevDate = prev ? new Date(prev.created_at) : null;
            const showDate = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
            return (
              <MessageBubble
                key={msg.id}
                showDate={showDate}
                selected={selectedMsgs.has(msg.id)}
                onSelect={selectedMsgs.size > 0 ? toggleSelectMsg : undefined}
                message={{
                  id: msg.id,
                  senderId: msg.sender_id,
                  text: msg.content,
                  timestamp: msgDate,
                  read: msg.is_read,
                  delivered: msg.is_delivered,
                  isEdited: msg.is_edited,
                  fileUrl: msg.file_url || undefined,
                  fileType: msg.file_type || undefined,
                  fileName: msg.file_name || undefined,
                  replyTo: msg.reply_to_text ? { text: msg.reply_to_text, senderName: msg.reply_to_sender || "Unknown" } : null,
                  reactions: reactionsByMsg[msg.id] ?? [],
                }}
                isMine={msg.sender_id === user?.id}
                canDelete={msg.sender_id === user?.id || !!isModerator}
                onReply={() => handleReply({ id: msg.id, text: msg.content, sender_id: msg.sender_id })}
                onEdit={() => handleEdit({ id: msg.id, text: msg.content })}
                onDelete={() => onDeleteMessage?.(msg.id)}
                onReact={onReact ? (emoji) => onReact(msg.id, emoji) : undefined}
                onPin={onPin ? () => onPin(msg.id, msg.content) : undefined}
                onForward={() => setForwardMsg({ content: msg.content, fileUrl: msg.file_url || undefined, fileType: msg.file_type || undefined, fileName: msg.file_name || undefined })}
              />
            );
          })}
        </AnimatePresence>
        {isOtherTyping && <TypingIndicator users={typingUsers} />}
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
        {editMsg && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 border-t border-border bg-primary/5 flex items-center gap-2"
          >
            <Pencil className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">Editing message</p>
              <p className="text-xs text-muted-foreground truncate">{editMsg.text}</p>
            </div>
            <button onClick={() => { setEditMsg(null); setInput(""); }} className="text-muted-foreground hover:text-foreground shrink-0">
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
      <div className="px-4 py-3 border-t border-border/70 bg-background/85 backdrop-blur-xl relative shrink-0">
        {chat.isPending && !chat.isRequester ? (
          <div className="flex items-center justify-center py-2">
            <p className="text-xs text-muted-foreground">Accept the request to reply</p>
          </div>
        ) : chat.isPending && chat.isRequester && messages.filter(m => m.sender_id === user?.id).length >= 1 ? (
          <div className="flex items-center justify-center py-2">
            <p className="text-xs text-muted-foreground">Waiting for reply...</p>
          </div>
        ) : (
          <>
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
              <div className="flex items-end gap-2">
                <button onClick={() => setShowEmoji(!showEmoji)} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
                  <Smile className="h-5 w-5" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden"
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip"
                  onChange={handleFileSelect}
                />
                <div className="flex-1 rounded-[22px] border border-border/70 bg-muted/60 px-3 py-2 shadow-inner">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); onTyping?.(e.target.value.length); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                </div>
                {hasInput && (
                  <div className="relative">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => setShowSchedule((s) => !s)}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        showSchedule ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      title="Schedule message">
                      <Clock className="h-4 w-4" />
                    </motion.button>
                    <AnimatePresence>
                      {showSchedule && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute bottom-11 right-0 bg-card border border-border rounded-2xl shadow-xl p-3 z-20 w-64"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-xs font-semibold text-foreground mb-2">Schedule message</p>
                          <input
                            type="datetime-local"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full bg-muted text-xs text-foreground rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary mb-2"
                          />
                          <button
                            onClick={handleScheduleSend}
                            disabled={!scheduleTime}
                            className="w-full gradient-primary text-primary-foreground text-xs rounded-lg py-1.5 font-medium disabled:opacity-40"
                          >
                            Schedule Send
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {hasInput ? (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleSend} disabled={uploading}
                    className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0 disabled:opacity-40 transition-opacity">
                    <Send className="h-4 w-4" />
                  </motion.button>
                ) : (
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={startRecording}
                    className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
                    <Mic className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
