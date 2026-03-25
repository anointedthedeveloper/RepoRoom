import { X, Phone, Video, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarBubble from "./AvatarBubble";
import type { EnrichedChatRoom } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthContext";

interface UserProfilePanelProps {
  chat: EnrichedChatRoom;
  open: boolean;
  onClose: () => void;
  onStartCall: (type: "audio" | "video") => void;
}

const UserProfilePanel = ({ chat, open, onClose, onStartCall }: UserProfilePanelProps) => {
  const { user } = useAuth();
  const otherMember = chat.members.find((m) => m.user_id !== user?.id);
  const profile = otherMember?.profiles;

  if (!profile && !chat.is_group) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-72 bg-card border-l border-border z-30 flex flex-col shadow-2xl lg:relative lg:w-64 lg:shrink-0 lg:shadow-none lg:z-auto"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">
                {chat.is_group ? "Group Info" : "Profile"}
              </span>
              <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Avatar + name */}
              <div className="flex flex-col items-center py-8 px-4 border-b border-border">
                {chat.is_group ? (
                  <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mb-3">
                    {chat.displayAvatar}
                  </div>
                ) : (
                  <AvatarBubble
                    letter={chat.displayAvatar}
                    status={chat.otherMemberStatus as "online" | "offline"}
                    size="lg"
                    imageUrl={profile?.avatar_url}
                  />
                )}
                <h3 className="text-base font-semibold text-foreground mt-3">{chat.displayName}</h3>
                {!chat.is_group && profile?.username && (
                  <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
                )}
                <span className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  chat.is_group
                    ? "bg-primary/10 text-primary"
                    : chat.otherMemberStatus === "online"
                    ? "bg-green-500/10 text-green-500"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {chat.is_group ? `${chat.members.length} members` : chat.otherMemberStatus === "online" ? "Online" : "Offline"}
                </span>
              </div>

              {/* Actions — only for DMs */}
              {!chat.is_group && (
                <div className="flex gap-3 px-4 py-4 border-b border-border">
                  <button
                    onClick={() => { onStartCall("audio"); onClose(); }}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Audio</span>
                  </button>
                  <button
                    onClick={() => { onStartCall("video"); onClose(); }}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Video className="h-5 w-5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Video</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Message</span>
                  </button>
                </div>
              )}

              {/* Group members list */}
              {chat.is_group && (
                <div className="px-4 py-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Members</p>
                  <div className="space-y-2">
                    {chat.members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2.5">
                        <AvatarBubble
                          letter={m.profiles?.username?.[0]?.toUpperCase() || "?"}
                          status={m.profiles?.status as "online" | "offline"}
                          size="sm"
                          imageUrl={m.profiles?.avatar_url}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-foreground truncate">
                            {m.profiles?.display_name || m.profiles?.username}
                            {m.user_id === user?.id && <span className="text-muted-foreground"> (you)</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground">@{m.profiles?.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserProfilePanel;
