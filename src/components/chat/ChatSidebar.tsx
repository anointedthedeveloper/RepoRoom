import { useState, useEffect } from "react";
import { Search, MessageSquarePlus, Users, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import AvatarBubble from "./AvatarBubble";
import ThemeToggle from "./ThemeToggle";
import ProfileSettings from "./ProfileSettings";
import type { EnrichedChatRoom } from "@/hooks/useChat";

interface ChatSidebarProps {
  chats: EnrichedChatRoom[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateDM: (userId: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  status: string;
}

const formatTimestamp = (dateStr?: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const ChatSidebar = ({ chats, activeChatId, onSelectChat, onCreateDM, onCreateGroup }: ChatSidebarProps) => {
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    if (showNewChat) {
      supabase
        .from("profiles")
        .select("id, username, display_name, status")
        .neq("id", user?.id || "")
        .then(({ data }) => {
          if (data) setAllUsers(data as UserProfile[]);
        });
    }
  }, [showNewChat, user]);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ?? false)
  );

  const filtered = chats.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const onlineUsers = chats
    .filter((c) => !c.is_group && c.otherMemberStatus === "online")
    .slice(0, 5);

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <AvatarBubble letter={profile?.username?.[0]?.toUpperCase() || "A"} status="online" size="sm" />
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground">ChatFlow</h1>
            <p className="text-[10px] text-online font-medium">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setShowProfile(true)}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* New Chat Panel */}
      {showNewChat && (
        <div className="px-3 py-2 border-b border-sidebar-border space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setIsGroupMode(false)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${!isGroupMode ? "gradient-primary text-primary-foreground" : "bg-sidebar-accent text-muted-foreground"}`}
            >
              Direct Message
            </button>
            <button
              onClick={() => setIsGroupMode(true)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${isGroupMode ? "gradient-primary text-primary-foreground" : "bg-sidebar-accent text-muted-foreground"}`}
            >
              <Users className="h-3 w-3 inline mr-1" />Group
            </button>
          </div>

          {/* Username search */}
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search by username..."
            className="w-full bg-sidebar-accent/50 text-xs text-sidebar-foreground placeholder:text-muted-foreground rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary transition-all"
          />

          {isGroupMode && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-sidebar-accent/50 text-xs text-sidebar-foreground placeholder:text-muted-foreground rounded-lg px-3 py-1.5 outline-none"
            />
          )}
          <div className="max-h-32 overflow-y-auto space-y-1">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  if (isGroupMode) {
                    setSelectedMembers((prev) =>
                      prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                    );
                  } else {
                    onCreateDM(u.id);
                    setShowNewChat(false);
                    setUserSearch("");
                  }
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-sidebar-accent/50 ${
                  selectedMembers.includes(u.id) ? "bg-sidebar-accent" : ""
                }`}
              >
                <AvatarBubble letter={u.username[0]?.toUpperCase() || "?"} status={u.status as "online" | "offline"} size="sm" />
                <div className="flex flex-col">
                  <span className="text-xs text-sidebar-foreground">{u.display_name || u.username}</span>
                  <span className="text-[10px] text-muted-foreground">@{u.username}</span>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && userSearch && (
              <p className="text-xs text-muted-foreground text-center py-2">No users found for "@{userSearch}"</p>
            )}
            {filteredUsers.length === 0 && !userSearch && (
              <p className="text-xs text-muted-foreground text-center py-2">No other users yet</p>
            )}
          </div>
          {isGroupMode && selectedMembers.length > 0 && (
            <button
              onClick={() => {
                if (groupName.trim()) {
                  onCreateGroup(groupName, selectedMembers);
                  setShowNewChat(false);
                  setGroupName("");
                  setSelectedMembers([]);
                  setUserSearch("");
                }
              }}
              className="w-full text-xs gradient-primary text-primary-foreground rounded-lg py-1.5 font-medium"
            >
              Create Group ({selectedMembers.length} members)
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-sidebar-accent/50 text-sm text-sidebar-foreground placeholder:text-muted-foreground rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {onlineUsers.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1 shrink-0">
              <AvatarBubble letter={c.displayAvatar} status="online" size="sm" />
              <span className="text-[10px] text-muted-foreground">{c.displayName.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sidebar-accent/50 ${
              chat.id === activeChatId ? "bg-sidebar-accent" : ""
            }`}
          >
            <AvatarBubble
              letter={chat.displayAvatar}
              status={chat.is_group ? undefined : (chat.otherMemberStatus as "online" | "offline" | undefined)}
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-sidebar-foreground truncate flex items-center gap-1.5">
                  {chat.is_group && <Users className="h-3 w-3 text-muted-foreground" />}
                  {chat.displayName}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTimestamp(chat.lastMessage?.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-muted-foreground truncate pr-2">
                  {chat.lastMessage?.content || "No messages yet"}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              {chats.length === 0 ? "No chats yet. Start a new conversation!" : "No results found"}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out · {profile?.display_name || profile?.username}
        </button>
      </div>
      <ProfileSettings open={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
};

export default ChatSidebar;
