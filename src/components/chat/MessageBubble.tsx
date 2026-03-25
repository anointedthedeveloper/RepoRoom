import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, FileText, Download, Play, Pause, Phone, Video, Reply, X, Pencil, Trash2, Copy, Pin, SmilePlus, Forward } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";

interface Reaction { emoji: string; count: number; mine: boolean; }

interface MessageData {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  read: boolean;
  delivered?: boolean;
  isEdited?: boolean;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  replyTo?: { text: string; senderName: string } | null;
  reactions?: Reaction[];
}

interface MessageBubbleProps {
  message: MessageData;
  isMine: boolean;
  selected?: boolean;
  onSelect?: (msgId: string) => void;
  onReply?: (msg: MessageData) => void;
  onEdit?: (msg: MessageData) => void;
  onDelete?: (msgId: string) => void;
  onReact?: (msgId: string, emoji: string) => void;
  onPin?: (msgId: string, text: string) => void;
  onForward?: (msg: MessageData) => void;
  showDate?: boolean;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatDate = (date: Date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (msgDay.getTime() === today.getTime()) return "Today";
  if (msgDay.getTime() === yesterday.getTime()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Parse code blocks from message text
function parseContent(text: string): Array<{ type: "text" | "code"; content: string; lang?: string }> {
  const parts: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", content: text.slice(last, match.index) });
    parts.push({ type: "code", lang: match[1] || "text", content: match[2].trim() });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts;
}

const CodeBlock = ({ code, lang }: { code: string; lang: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="rounded-xl overflow-hidden my-1 border border-white/10 text-left" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-white/10">
        <span className="text-[10px] text-white/50 font-mono">{lang || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors">
          <Copy className="h-3 w-3" />{copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <Highlight theme={themes.nightOwl} code={code} language={lang as any || "text"}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} text-xs p-3 overflow-x-auto m-0`} style={{ ...style, background: "rgba(0,0,0,0.5)", maxWidth: 320 }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className="select-none text-white/20 mr-3 text-[10px]">{i + 1}</span>
                {line.map((token, key) => <span key={key} {...getTokenProps({ token })} />)}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};

const VoiceNote = ({ url, isMine }: { url: string; isMine: boolean }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  return (
    <div className="flex items-center gap-2.5 min-w-[190px] py-0.5">
      <audio ref={audioRef} src={url}
        onLoadedMetadata={() => setDuration(Math.round(audioRef.current?.duration || 0))}
        onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0); }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={toggle} className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isMine ? "bg-white/20" : "bg-primary/20"}`}>
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-1 rounded-full bg-current opacity-20 relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-current opacity-70 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] opacity-50">{formatDuration(duration)}</span>
      </div>
    </div>
  );
};

const ImageLightbox = ({ url, onClose }: { url: string; onClose: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
    <button className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10">
      <X className="h-5 w-5" />
    </button>
    <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={url} alt="Preview"
      className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
  </motion.div>
);

export const DateSeparator = ({ date }: { date: Date }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="flex-1 h-px bg-border" />
    <span className="text-[11px] text-muted-foreground font-medium px-2">{formatDate(date)}</span>
    <div className="flex-1 h-px bg-border" />
  </div>
);

const MessageBubble = ({ message, isMine, selected, onSelect, onReply, onEdit, onDelete, onReact, onPin, onForward, showDate }: MessageBubbleProps) => {
  const [lightbox, setLightbox] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount = useRef(0);

  const isImage   = message.fileType?.startsWith("image/");
  const isVideo   = message.fileType?.startsWith("video/");
  const isAudio   = message.fileType?.startsWith("audio/");
  const isCall    = message.fileType === "call/audio" || message.fileType === "call/video";
  const isSystem  = message.fileType === "system";
  const isDeleted = message.fileType === "deleted";

  const contentParts = (!isCall && !isDeleted && message.text && !(message.fileUrl && message.text.startsWith("📎")))
    ? parseContent(message.text)
    : [];
  const hasCode = contentParts.some((p) => p.type === "code");

  const handleTap = useCallback(() => {
    if (onSelect) { onSelect(message.id); return; }
    tapCount.current += 1;
    if (tapCount.current === 1) {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 300);
    } else if (tapCount.current === 2) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapCount.current = 0;
      if (!isSystem && !isDeleted) onReply?.(message);
    }
  }, [isSystem, isDeleted, onReply, message, onSelect]);

  if (isSystem) {
    return (
      <>
        {showDate && <DateSeparator date={message.timestamp} />}
        <div className="flex justify-center px-4 py-1">
          <span className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">{message.text}</span>
        </div>
      </>
    );
  }

  const reactions = message.reactions || [];

  return (
    <>
      <AnimatePresence>{lightbox && <ImageLightbox url={message.fileUrl!} onClose={() => setLightbox(false)} />}</AnimatePresence>
      {showDate && <DateSeparator date={message.timestamp} />}

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        className={`flex ${isMine ? "justify-end" : "justify-start"} px-4 py-0.5 group transition-colors ${selected ? "bg-primary/10" : ""}`}
        onDoubleClick={() => !isDeleted && !onSelect && onReply?.(message)}
        onLongPress={() => onSelect?.(message.id)}
        onClick={handleTap}
      >
        <div className="flex flex-col max-w-[72%]">
          {/* Reply preview */}
          {message.replyTo && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className={`text-[11px] px-3 py-1.5 rounded-t-xl mb-0.5 border-l-2 border-primary/60 ${isMine ? "bg-primary/20 self-end" : "bg-muted self-start"}`}>
              <span className="font-semibold text-primary text-[11px]">{message.replyTo.senderName}</span>
              <p className="truncate text-muted-foreground text-[11px] max-w-[200px]">{message.replyTo.text}</p>
            </motion.div>
          )}

          <div className={`msg-bubble relative px-3 py-2 ${
            isCall
              ? `flex items-center gap-2 rounded-xl ${isMine ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`
              : isMine
              ? "gradient-primary text-primary-foreground rounded-2xl rounded-br-sm"
              : "bg-received text-foreground rounded-2xl rounded-bl-sm"
          }`}>

            {/* Hover action buttons */}
            {!isCall && !isDeleted && !onSelect && (
              <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 ${isMine ? "-left-28" : "-right-28"}`}>
                {/* React button */}
                <div className="relative">
                  <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); setShowReactPicker((v) => !v); }}
                    className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                    <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                  </motion.button>
                  <AnimatePresence>
                    {showReactPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                        className={`absolute bottom-9 ${isMine ? "right-0" : "left-0"} bg-card border border-border rounded-2xl shadow-xl p-1.5 flex gap-1 z-20`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <button key={emoji} onClick={() => { onReact?.(message.id, emoji); setShowReactPicker(false); }}
                            className="h-8 w-8 rounded-xl hover:bg-muted flex items-center justify-center text-lg transition-colors">
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); onReply?.(message); }}
                  className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                  <Reply className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); onForward?.(message); }}
                  className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                  <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); onPin?.(message.id, message.text); }}
                  className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                  <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                </motion.button>
                {isMine && !isSystem && (
                  <>
                    <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); onEdit?.(message); }}
                      className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); onDelete?.(message.id); }}
                      className="h-7 w-7 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </motion.button>
                  </>
                )}
              </div>
            )}
            {/* Multi-select checkbox */}
            {onSelect && (
              <div className={`absolute ${isMine ? "-left-7" : "-right-7"} top-1/2 -translate-y-1/2`}>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selected ? "bg-primary border-primary" : "border-muted-foreground/40 bg-card"
                }`}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>
            )}

            {/* Deleted */}
            {isDeleted && <p className="text-sm italic opacity-60">{message.text}</p>}

            {/* Call indicator */}
            {isCall && (
              <>
                {message.fileType === "call/video" ? <Video className="h-4 w-4 shrink-0" /> : <Phone className="h-4 w-4 shrink-0" />}
                <span className="text-sm font-medium">{message.text}</span>
              </>
            )}

            {/* Image */}
            {isImage && !isDeleted && message.fileUrl && (
              <img src={message.fileUrl} alt={message.fileName || "Image"}
                className="rounded-lg max-h-64 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity mb-1 block"
                onClick={(e) => { e.stopPropagation(); setLightbox(true); }} />
            )}

            {/* Video */}
            {isVideo && !isDeleted && message.fileUrl && (
              <div className="mb-1" onClick={(e) => e.stopPropagation()}>
                <div className="relative rounded-lg overflow-hidden bg-black" style={{ maxWidth: 280 }}>
                  <video src={message.fileUrl} controls preload="auto" playsInline
                    className="rounded-lg w-full block" style={{ maxHeight: 240, maxWidth: 280 }}
                    onLoadedMetadata={(e) => { const v = e.currentTarget; if (v.currentTime === 0) v.currentTime = 0.01; }} />
                </div>
                <a href={message.fileUrl} download onClick={(e) => e.stopPropagation()}
                  className={`mt-1 flex items-center gap-1.5 text-[11px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"} hover:opacity-80`}>
                  <Download className="h-3 w-3" />Download video
                </a>
              </div>
            )}

            {/* Voice note */}
            {isAudio && !isDeleted && message.fileUrl && (
              <div className="mb-1" onClick={(e) => e.stopPropagation()}>
                <VoiceNote url={message.fileUrl} isMine={isMine} />
              </div>
            )}

            {/* Document */}
            {message.fileUrl && !isImage && !isVideo && !isAudio && !isCall && !isDeleted && (
              <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${isMine ? "bg-white/10" : "bg-muted"} hover:opacity-80 transition-opacity`}>
                <FileText className="h-7 w-7 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{message.fileName || "File"}</p>
                  <p className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>Tap to download</p>
                </div>
                <Download className="h-4 w-4 shrink-0" />
              </a>
            )}

            {/* Text + code blocks */}
            {contentParts.map((part, i) =>
              part.type === "code"
                ? <CodeBlock key={i} code={part.content} lang={part.lang || "text"} />
                : part.content.trim()
                  ? <p key={i} className="text-sm leading-relaxed break-words whitespace-pre-wrap">{part.content}</p>
                  : null
            )}

            {/* Timestamp + read receipt */}
            {!isCall && (
              <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                <span className={`text-[10px] ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
                  {formatTime(message.timestamp)}
                </span>
                {message.isEdited && (
                  <span className={`text-[9px] italic ${isMine ? "text-primary-foreground/40" : "text-muted-foreground/60"}`}>edited</span>
                )}
                {isMine && (
                  message.read
                    ? <CheckCheck className="h-3.5 w-3.5 text-sky-300" title="Seen" />
                    : message.delivered
                    ? <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/50" title="Delivered" />
                    : <Check className="h-3.5 w-3.5 text-primary-foreground/50" title="Sent" />
                )}
              </div>
            )}
          </div>

          {/* Reactions row */}
          {reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
              {reactions.map((r) => (
                <motion.button key={r.emoji} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); onReact?.(message.id, r.emoji); }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    r.mine ? "bg-primary/20 border-primary/40 text-primary" : "bg-muted border-border text-foreground"
                  }`}>
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="font-medium">{r.count}</span>}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default MessageBubble;
