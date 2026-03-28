import { useRef } from "react";
import { Hash, MessageCircle, Send, Smile } from "lucide-react";
import MessageBubble from "@/components/chat/MessageBubble";
import EmojiPicker from "@/components/chat/EmojiPicker";
import type { Channel } from "@/hooks/useWorkspace";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}

interface ChannelReaction {
  id: string;
  workspace_id: string;
  channel_id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface GithubIssueLink {
  number: number;
  title: string;
  url: string;
  repoFullName: string;
}

interface WorkspaceChatProps {
  activeChannel: Channel | null;
  messages: Message[];
  reactionsByMsg: Record<string, Array<{ emoji: string; count: number; mine: boolean }>>;
  currentUserId: string | undefined;
  input: string;
  showEmoji: boolean;
  memberCount: number;
  openTaskCount: number;
  importedFileCount: number;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onToggleEmoji: () => void;
  onReact: (msgId: string, emoji: string) => void;
  onConvertToTask: (msgId: string, content: string) => void;
  onOpenGithubIssue: (msg: { id: string; text: string }) => void;
  getIssueLink: (msgId: string) => GithubIssueLink | null;
}

const WorkspaceChat = ({
  activeChannel, messages, reactionsByMsg, currentUserId,
  input, showEmoji, memberCount, openTaskCount, importedFileCount,
  onInputChange, onSend, onToggleEmoji, onReact, onConvertToTask, onOpenGithubIssue, getIssueLink,
}: WorkspaceChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/80 backdrop-blur-sm shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20 shrink-0">
        <div>
          <p className="text-sm font-semibold text-foreground">{activeChannel ? `#${activeChannel.name}` : "Workspace feed"}</p>
          <p className="text-[11px] text-muted-foreground">
            {activeChannel ? `${messages.length} message${messages.length === 1 ? "" : "s"} in this channel` : "Choose a channel to start collaborating"}
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2 text-[11px]">
          <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-muted-foreground">{memberCount} members</span>
          <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-muted-foreground">{openTaskCount} open tasks</span>
          <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-muted-foreground">{importedFileCount} imported files</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3">
        {!activeChannel && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="h-16 w-16 rounded-[22px] overflow-hidden border border-border/70 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" className="h-full w-full">
                <rect width="100" height="100" rx="22" fill="#0f1117"/>
                <rect x="8" y="14" width="78" height="68" rx="10" fill="#1c2030" stroke="#2a2f42" strokeWidth="1.5"/>
                <rect x="8" y="14" width="78" height="22" rx="10" fill="#252a3d"/>
                <rect x="8" y="26" width="78" height="10" fill="#252a3d"/>
                <circle cx="24" cy="25" r="5.5" fill="#ff5f57"/>
                <circle cx="40" cy="25" r="5.5" fill="#febc2e"/>
                <circle cx="56" cy="25" r="5.5" fill="#27c840"/>
                <path d="M18 52 L30 61 L18 70" stroke="#4d9ef7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M68 52 L56 61 L68 70" stroke="#4d9ef7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="51" y1="48" x2="40" y2="74" stroke="#27c840" strokeWidth="6" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Choose a channel to start working</p>
              <p className="text-xs text-muted-foreground max-w-sm">This workspace is set up for chat, tasks, GitHub issue linking, repo browsing, and project tracking.</p>
            </div>
          </div>
        )}
        {activeChannel && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="h-14 w-14 rounded-[20px] gradient-primary flex items-center justify-center shadow-lg">
              <Hash className="h-6 w-6 text-white" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Welcome to #{activeChannel.name}</p>
              <p className="text-xs text-muted-foreground max-w-sm">{activeChannel.description || "Start the conversation, drop GitHub links, or turn messages into tracked work."}</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1];
          const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
          const issueLink = getIssueLink(msg.id);
          return (
            <MessageBubble
              key={msg.id}
              showDate={showDate}
              message={{
                id: msg.id,
                senderId: msg.sender_id,
                text: msg.content,
                timestamp: new Date(msg.created_at),
                read: true,
                fileUrl: msg.file_url || undefined,
                fileType: msg.file_type || undefined,
                fileName: msg.file_name || undefined,
                replyTo: msg.reply_to_text ? { text: msg.reply_to_text, senderName: msg.reply_to_sender || "Unknown" } : null,
                reactions: reactionsByMsg[msg.id] ?? [],
                githubIssueLink: issueLink,
              }}
              isMine={msg.sender_id === currentUserId}
              onReact={(emoji) => onReact(msg.id, emoji)}
              onForward={() => onConvertToTask(msg.id, msg.content)}
              onGithubIssue={() => onOpenGithubIssue({ id: msg.id, text: msg.content })}
              onReply={() => {}}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {activeChannel && (
        <div className="px-3 py-3 border-t border-border/60 shrink-0 bg-background/80">
          {showEmoji && <EmojiPicker onSelect={(e) => onInputChange(input + e)} onClose={onToggleEmoji} />}
          <div className="flex items-center justify-between px-1 pb-2 text-[11px] text-muted-foreground">
            <span>Chat with your team and turn messages into tracked GitHub work.</span>
            <span>{input.length > 0 ? `${input.length} chars` : "Ready"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/35 p-2">
            <button onClick={onToggleEmoji} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <Smile className="h-5 w-5" />
            </button>
            <input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSend())}
              placeholder={`Message #${activeChannel.name}`}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-2 py-2.5 outline-none focus:ring-0 transition-all"
            />
            <button onClick={onSend} disabled={!input.trim()}
              className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceChat;
