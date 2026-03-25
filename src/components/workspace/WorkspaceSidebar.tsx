import { useState } from "react";
import {
  Hash,
  Plus,
  Copy,
  LogIn,
  ChevronDown,
  ChevronRight,
  Megaphone,
  CheckSquare,
  Users,
  Settings,
  MessageSquare,
  LayoutDashboard,
  FolderKanban,
  Github,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AvatarBubble from "@/components/chat/AvatarBubble";
import type { Workspace, Channel, WorkspaceMember, Task, WorkspaceProject } from "@/hooks/useWorkspace";

const DEV_STATUSES = [
  { id: "online", label: "Online", color: "bg-green-500" },
  { id: "coding", label: "Coding", color: "bg-blue-500" },
  { id: "reviewing", label: "Reviewing code", color: "bg-yellow-500" },
  { id: "in_call", label: "In call", color: "bg-purple-500" },
  { id: "idle", label: "Idle", color: "bg-gray-400" },
  { id: "offline", label: "Offline", color: "bg-gray-600" },
];

interface Props {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  channels: Channel[];
  members: WorkspaceMember[];
  tasks: Task[];
  projects: WorkspaceProject[];
  linkedRepoCount: number;
  activeChannelId: string | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onSelectChannel: (ch: Channel) => void;
  onCreateWorkspace: () => void;
  onJoinWorkspace: () => void;
  onCreateChannel: () => void;
  onSetDevStatus: (status: string) => void;
  onOpenTasks: () => void;
  onOpenProjects: () => void;
  onOpenGithub?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebarCollapsed?: () => void;
}

const WorkspaceSidebar = ({
  workspaces,
  activeWorkspace,
  channels,
  members,
  tasks,
  projects,
  linkedRepoCount,
  activeChannelId,
  onSelectWorkspace,
  onSelectChannel,
  onCreateWorkspace,
  onJoinWorkspace,
  onCreateChannel,
  onSetDevStatus,
  onOpenTasks,
  onOpenProjects,
  onOpenGithub,
  sidebarCollapsed = false,
  onToggleSidebarCollapsed,
}: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showChannels, setShowChannels] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const myMember = members.find((m) => m.user_id === user?.id);
  const myStatus = DEV_STATUSES.find((s) => s.id === (myMember?.dev_status || "online")) || DEV_STATUSES[0];
  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const activeProjects = projects.filter((project) => project.status !== "shipped").length;
  const activeMembers = members.filter((member) => {
    const status = member.dev_status || "online";
    return status !== "offline" && status !== "idle";
  }).length;

  const copyInvite = () => {
    if (!activeWorkspace) return;
    navigator.clipboard.writeText(activeWorkspace.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      <div className="px-3 py-2 border-b border-sidebar-border flex items-center gap-1">
        {onToggleSidebarCollapsed && (
          <button
            onClick={onToggleSidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex h-8 w-8 rounded-lg items-center justify-center hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={() => navigate("/")}
          title="Back to Chats"
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors text-xs ${
            sidebarCollapsed ? "w-full justify-center" : "flex-1"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          {!sidebarCollapsed && <span>Chats</span>}
        </button>
        {!sidebarCollapsed && (
          <button
            onClick={() => navigate("/dashboard")}
            title="Dashboard"
            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span>Dashboard</span>
          </button>
        )}
      </div>

      <div className="px-3 py-3 border-b border-sidebar-border">
        <div className="flex items-center gap-1 mb-2">
          {!sidebarCollapsed && <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">Workspaces</span>}
          <button onClick={onJoinWorkspace} title="Join" className="h-5 w-5 rounded flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors">
            <LogIn className="h-3 w-3" />
          </button>
          <button onClick={onCreateWorkspace} title="New" className="h-5 w-5 rounded flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-0.5">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                activeWorkspace?.id === ws.id ? "bg-primary/20 text-primary font-medium" : "hover:bg-sidebar-accent text-sidebar-foreground"
              } ${sidebarCollapsed ? "justify-center" : ""}`}
            >
              <div className="h-6 w-6 rounded-lg gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {ws.name[0].toUpperCase()}
              </div>
              {!sidebarCollapsed && <span className="truncate">{ws.name}</span>}
            </button>
          ))}
          {!sidebarCollapsed && workspaces.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No workspaces yet</p>}
        </div>
      </div>

      {activeWorkspace && (
        <>
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center justify-between gap-2">
              {!sidebarCollapsed && <span className="text-sm font-semibold truncate">{activeWorkspace.name}</span>}
              {!sidebarCollapsed && (
                <button onClick={copyInvite} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                  <Copy className="h-3 w-3" />{copied ? "Copied!" : activeWorkspace.invite_code}
                </button>
              )}
            </div>
            {!sidebarCollapsed && activeWorkspace.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{activeWorkspace.description}</p>}
            {!sidebarCollapsed && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full ${myStatus.color}`} />
                <span>{myStatus.label}</span>
                <span className="ml-auto flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {activeMembers} active
                </span>
              </div>
            )}
          </div>

          <button onClick={onOpenTasks} className={`mx-3 mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sm text-muted-foreground hover:text-foreground ${sidebarCollapsed ? "justify-center" : ""}`}>
            <CheckSquare className="h-3.5 w-3.5 shrink-0" />
            {!sidebarCollapsed && <span className="flex-1 text-left">Tasks</span>}
            {!sidebarCollapsed && openTasks > 0 && (
              <span className="h-4 min-w-[16px] px-1 rounded-full gradient-primary text-[9px] font-bold text-white flex items-center justify-center">{openTasks}</span>
            )}
          </button>
          <button onClick={onOpenProjects} className={`mx-3 mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sm text-muted-foreground hover:text-foreground ${sidebarCollapsed ? "justify-center" : ""}`}>
            <FolderKanban className="h-3.5 w-3.5 shrink-0" />
            {!sidebarCollapsed && <span className="flex-1 text-left">Projects</span>}
            {!sidebarCollapsed && activeProjects > 0 && (
              <span className="h-4 min-w-[16px] px-1 rounded-full bg-sidebar-accent text-[9px] font-bold text-foreground flex items-center justify-center">{activeProjects}</span>
            )}
          </button>
          <button onClick={onOpenGithub} className={`mx-3 mt-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sm text-muted-foreground hover:text-foreground ${sidebarCollapsed ? "justify-center" : ""}`}>
            <Github className="h-3.5 w-3.5 shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">Linked repos</span>
                <span className="font-semibold text-foreground">{linkedRepoCount}</span>
              </>
            )}
          </button>

          <div className="flex-1 overflow-y-auto">
            <div className="px-3 pt-3">
              <div className="flex items-center gap-1 w-full mb-1">
                <button onClick={() => setShowChannels((v) => !v)} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors flex-1">
                  {showChannels ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {!sidebarCollapsed && "Channels"}
                </button>
                <button onClick={onCreateChannel} className="h-4 w-4 rounded flex items-center justify-center hover:bg-sidebar-accent ml-auto">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <AnimatePresence>
                {showChannels && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-0.5">
                    {channels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => onSelectChannel(ch)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${
                          activeChannelId === ch.id ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                        } ${sidebarCollapsed ? "justify-center" : ""}`}
                      >
                        {ch.type === "announcement" ? <Megaphone className="h-3.5 w-3.5 shrink-0" /> : <Hash className="h-3.5 w-3.5 shrink-0" />}
                        {!sidebarCollapsed && <span className="truncate">{ch.name}</span>}
                      </button>
                    ))}
                    {!sidebarCollapsed && channels.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No channels</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="px-3 pt-3 pb-2">
              <button onClick={() => setShowMembers((v) => !v)} className="flex items-center gap-1 w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 hover:text-foreground transition-colors">
                {showMembers ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Users className="h-3 w-3" /> {!sidebarCollapsed && `Members · ${members.length}`}
              </button>
              <AnimatePresence>
                {showMembers && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-0.5">
                    {members.map((m) => {
                      const st = DEV_STATUSES.find((s) => s.id === (m.dev_status || "online")) || DEV_STATUSES[0];
                      return (
                        <div key={m.user_id} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${sidebarCollapsed ? "justify-center" : ""}`}>
                          <div className="relative shrink-0">
                            <AvatarBubble letter={m.profiles.username[0]?.toUpperCase() || "?"} imageUrl={m.profiles.avatar_url} size="sm" />
                            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${st.color}`} />
                          </div>
                          {!sidebarCollapsed && (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{m.profiles.display_name || m.profiles.username}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{st.label}</p>
                              </div>
                              {m.role === "owner" && <span className="text-[9px] text-primary font-bold">OWNER</span>}
                              {m.role === "admin" && <span className="text-[9px] text-yellow-500 font-bold">ADMIN</span>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="px-3 py-2 border-t border-sidebar-border relative">
            <button onClick={() => setShowStatusPicker((v) => !v)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}>
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${myStatus.color}`} />
              {!sidebarCollapsed && <span className="text-xs text-muted-foreground flex-1 text-left">{myStatus.label}</span>}
              <Settings className="h-3 w-3 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {showStatusPicker && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute bottom-12 left-3 right-3 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20">
                  {DEV_STATUSES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onSetDevStatus(s.id);
                        setShowStatusPicker(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left ${myStatus.id === s.id ? "text-primary font-medium" : "text-foreground"}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.color}`} />
                      {s.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceSidebar;
