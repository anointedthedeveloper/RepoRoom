import { useState, useEffect, useRef } from "react";
import { Search, MessageSquarePlus, Users, Settings, X, LogOut, Phone, Video, Mic, CheckCheck, Columns2, UserCheck, LayoutGrid, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import AvatarBubble from "./AvatarBubble";
import ThemeToggle from "./ThemeToggle";
import type { EnrichedChatRoom } from "@/hooks/useChat";

interface ChatSidebarProps {
  chats: EnrichedChatRoom[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onCreateDM: (userId: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  onOpenSecondChat?: (id: string) => void;
  secondChatId?: string | null;
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapsed?: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
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

const ChatSidebar = ({ chats, activeChatId, onSelectChat, onCreateDM, onCreateGroup, onOpenSecondChat, secondChatId, sidebarCollapsed = false, onToggleSidebarCollapsed }: ChatSidebarProps) => {
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupNameError, setGroupNameError] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "requests">("chats");
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Load users for new chat panel
  useEffect(() => {
    if (showNewChat) {
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, status")
        .neq("id", user?.id || "")
        .then(({ data }) => {
          if (data) setAllUsers(data as UserProfile[]);
        });
    }
  }, [showNewChat, user]);

  // Global search — searches users by username/display_name
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, status")
        .neq("id", user?.id || "")
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(8);
      setSearchResults(data as UserProfile[] || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  // Close search results on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ?? false)
  );

  const acceptedChats = chats.filter((c) => !c.isPending && !c.isArchived);
  const requestChats = chats.filter((c) => c.isPending);
  const archivedChats = chats.filter((c) => c.isArchived);
  const displayChats = (activeTab === "requests" ? requestChats : activeTab === "archived" ? archivedChats : acceptedChats).filter(
    (c) => !search.trim() || c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-sidebar/95 border-r border-sidebar-border backdrop-blur-xl">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-sidebar-border">
        <div className={`flex items-center gap-2 ${sidebarCollapsed ? "hidden" : ""}`}>
          <h2 className="text-sm font-bold text-sidebar-foreground">Messages</h2>
          {requestChats.length > 0 && (
            <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {requestChats.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onToggleSidebarCollapsed && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onToggleSidebarCollapsed}
              className="hidden lg:flex h-8 w-8 rounded-lg items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={() => { setShowNewChat(!showNewChat); setSearch(""); }}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-sidebar-foreground"
            title="New Chat"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* New Chat Panel */}
      {!sidebarCollapsed && <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-b border-sidebar-border bg-sidebar-accent/20"
          >
          <div className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <button
                onClick={() => setIsGroupMode(false)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${!isGroupMode ? "gradient-primary text-primary-foreground" : "bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"}`}
              >
                Direct
              </button>
              <button
                onClick={() => setIsGroupMode(true)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${isGroupMode ? "gradient-primary text-primary-foreground" : "bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"}`}
              >
                <Users className="h-3 w-3" />Group
              </button>
            </div>
            <button onClick={() => setShowNewChat(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search users..."
            autoFocus
            className="w-full bg-sidebar-accent/50 text-xs text-sidebar-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary transition-all"
          />

          {isGroupMode && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (required)..."
              className="w-full bg-sidebar-accent/50 text-xs text-sidebar-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
            />
          )}

          <div className="max-h-40 overflow-y-auto space-y-0.5">
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
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-sidebar-accent/60 ${selectedMembers.includes(u.id) ? "bg-primary/20 ring-1 ring-primary/30" : ""}`}
              >
                <AvatarBubble letter={u.username[0]?.toUpperCase() || "?"} status={u.status as "online" | "offline"} size="sm" imageUrl={u.avatar_url} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-sidebar-foreground truncate">{u.display_name || u.username}</span>
                  <span className="text-[10px] text-muted-foreground">@{u.username}</span>
                </div>
                {selectedMembers.includes(u.id) && (
                  <div className="ml-auto h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <CheckCheck className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {userSearch ? `No users found for "${userSearch}"` : "No other users yet"}
              </p>
            )}
          </div>

          {isGroupMode && selectedMembers.length > 0 && (
            <button
              onClick={() => {
                if (!groupName.trim()) {
                  setGroupNameError(true);
                  return;
                }
                setGroupNameError(false);
                onCreateGroup(groupName, selectedMembers);
                setShowNewChat(false);
                setGroupName("");
                setSelectedMembers([]);
                setUserSearch("");
              }}
              className="w-full text-xs gradient-primary text-primary-foreground rounded-lg py-2 font-semibold"
            >
              {groupNameError
                ? "Enter a group name first"
                : `Create Group · ${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""}`}
            </button>
          )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>}

      {/* Search bar with user results dropdown */}
      {!sidebarCollapsed && <div className="px-3 py-2" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats or users..."
            className="w-full bg-sidebar-accent/50 text-sm text-sidebar-foreground placeholder:text-muted-foreground rounded-xl pl-9 pr-8 py-2 outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {search && (
            <button onClick={() => { setSearch(""); setSearchResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* User search results dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-10">
            <p className="text-[10px] text-muted-foreground px-3 pt-2 pb-1 font-medium uppercase tracking-wide">Users</p>
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onCreateDM(u.id);
                  setSearch("");
                  setSearchResults([]);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-left"
              >
                <AvatarBubble letter={u.username[0]?.toUpperCase() || "?"} status={u.status as "online" | "offline"} size="sm" imageUrl={u.avatar_url} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-foreground truncate">{u.display_name || u.username}</span>
                  <span className="text-[11px] text-muted-foreground">@{u.username} · {u.status === "online" ? "Online" : "Offline"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {searching && search && (
          <p className="text-xs text-muted-foreground text-center py-2">Searching...</p>
        )}
      </div>}

      {/* Tabs */}
      {!sidebarCollapsed && <div className="flex border-b border-sidebar-border shrink-0">
        <button
          onClick={() => setActiveTab("chats")}
          className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activeTab === "chats" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-sidebar-foreground"
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex-1 text-xs py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "requests" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-sidebar-foreground"
          }`}
        >
          Requests
          {requestChats.length > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full gradient-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {requestChats.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={`flex-1 text-xs py-2 font-medium transition-colors flex items-center justify-center gap-1 ${
            activeTab === "archived" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-sidebar-foreground"
          }`}
        >
          Archived
          {archivedChats.length > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center">
              {archivedChats.length}
            </span>
          )}
        </button>
      </div>}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {displayChats.length === 0 && !search && (
          <div className="px-4 py-10 text-center">
            <div className="h-12 w-12 rounded-2xl overflow-hidden mx-auto mb-3 opacity-50">
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
            <p className="text-xs text-muted-foreground">
              {activeTab === "requests" ? "No message requests" : "No chats yet.\nStart a new conversation!"}
            </p>
          </div>
        )}
        {displayChats.map((chat, i) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: Math.min(i * 0.03, 0.3) }}
            className={`chat-item group flex items-center gap-3 px-4 py-3 border-l-2 cursor-pointer ${
              chat.id === activeChatId
                ? "bg-sidebar-accent/60 border-primary"
                : "border-transparent hover:bg-sidebar-accent/40"
            }`}
          >
            <div className="flex-1 flex items-center gap-3 min-w-0" onClick={() => onSelectChat(chat.id)}>
              <AvatarBubble
                letter={chat.displayAvatar}
                status={chat.is_group ? undefined : (chat.otherMemberStatus as "online" | "offline" | undefined)}
                imageUrl={chat.is_group ? ((chat as any).icon_url ?? null) : (chat.members.find(m => m.user_id !== user?.id)?.profiles?.avatar_url ?? null)}
              />
              <div className={`flex-1 min-w-0 text-left ${sidebarCollapsed ? "hidden" : ""}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-medium text-sidebar-foreground truncate flex items-center gap-1.5">
                    {chat.is_group && <Users className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {chat.displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTimestamp(chat.lastMessage?.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5 gap-1">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    {chat.lastMessage?.file_type === "call/audio" && <Phone className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {chat.lastMessage?.file_type === "call/video" && <Video className="h-3 w-3 text-muted-foreground shrink-0" />}
                    {chat.lastMessage?.file_type?.startsWith("audio/") && <Mic className="h-3 w-3 text-muted-foreground shrink-0" />}
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      className="shrink-0 h-5 min-w-[20px] px-1.5 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
                    >
                      {chat.unreadCount}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
            {!sidebarCollapsed && onOpenSecondChat && (
              <motion.button
                whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onOpenSecondChat(chat.id); }}
                title="Open in split view"
                className={`opacity-0 group-hover:opacity-100 h-6 w-6 rounded flex items-center justify-center transition-all shrink-0 ${
                  secondChatId === chat.id ? "opacity-100 text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" />
              </motion.button>
            )}
          </motion.div>
        ))}
        {displayChats.length === 0 && search && (
          <p className="text-xs text-muted-foreground text-center py-6">No chats match "{search}"</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-sidebar-border flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground truncate">
          {sidebarCollapsed ? "@me" : (profile?.display_name || profile?.username)}
        </span>
        <button
          onClick={signOut}
          className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground shrink-0"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>

    </div>
  );
};

export default ChatSidebar;
