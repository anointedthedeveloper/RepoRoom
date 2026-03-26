import { useState } from "react";
import { Hash, Plus, Copy, LogIn, ChevronDown, ChevronRight, Megaphone, Users, MessageSquare, LayoutDashboard, CheckSquare, FolderKanban, Github, UserPlus, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AvatarBubble from "@/components/chat/AvatarBubble";
import type { Workspace, Channel, WorkspaceMember, Task, WorkspaceProject } from "@/hooks/useWorkspace";

interface Props {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  channels: Channel[];
  members: WorkspaceMember[];
  tasks: Task[];
  projects: WorkspaceProject[];
  linkedRepoCount: number;
  activeChannelId: string | null;
  standaloneView: string;
  showGithub: boolean;
  onSelectWorkspace: (ws: Workspace) => void;
  onSelectChannel: (ch: Channel) => void;
  onCreateWorkspace: () => void;
  onJoinWorkspace: () => void;
  onCreateChannel: () => void;
  onSetDevStatus: (status: string) => void;
  onOpenTasks: () => void;
  onOpenProjects: () => void;
  onOpenGithub: () => void;
  onOpenAddPeople: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500", coding: "bg-blue-500", reviewing: "bg-yellow-500",
  in_call: "bg-purple-500", idle: "bg-gray-400", offline: "bg-gray-600",
};

const WorkspaceSidebar = ({ workspaces, activeWorkspace, channels, members, activeChannelId, standaloneView, showGithub, onSelectWorkspace, onSelectChannel, onCreateWorkspace, onJoinWorkspace, onCreateChannel, onOpenTasks, onOpenProjects, onOpenGithub, onOpenAddPeople }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showChannels, setShowChannels] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyInvite = () => {
    if (!activeWorkspace) return;
    navigator.clipboard.writeText(activeWorkspace.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden">
      {/* Top nav */}
      <div className="px-3 py-2.5 border-b border-sidebar-border flex items-center gap-1">
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors text-xs flex-1">
          <MessageSquare className="h-3.5 w-3.5 shrink-0" /><span>Chats</span>
        </button>
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors text-xs flex-1">
          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" /><span>Dashboard</span>
        </button>
        <button onClick={() => navigate("/settings")} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors" title="Settings">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Workspaces */}
      <div className="px-3 py-2.5 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Workspaces</span>
          <div className="flex gap-0.5">
            <button onClick={onJoinWorkspace} title="Join" className="h-5 w-5 rounded flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"><LogIn className="h-3 w-3" /></button>
            <button onClick={onCreateWorkspace} title="New" className="h-5 w-5 rounded flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"><Plus className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="space-y-0.5">
          {workspaces.map((ws) => (
            <button key={ws.id} onClick={() => onSelectWorkspace(ws)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${activeWorkspace?.id === ws.id ? "bg-primary/15 text-primary font-medium" : "hover:bg-sidebar-accent text-sidebar-foreground"}`}>
              <div className="h-6 w-6 rounded-lg gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">{ws.name[0].toUpperCase()}</div>
              <span className="truncate">{ws.name}</span>
            </button>
          ))}
          {workspaces.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No workspaces yet</p>}
        </div>
      </div>

      {activeWorkspace && (
        <>
          {/* Workspace info + invite */}
          <div className="px-3 py-2 border-b border-sidebar-border">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{activeWorkspace.name}</span>
              <button onClick={copyInvite} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground shrink-0 transition-colors">
                <Copy className="h-3 w-3" />{copied ? "Copied!" : activeWorkspace.invite_code}
              </button>
            </div>
            {activeWorkspace.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{activeWorkspace.description}</p>}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Channels */}
            <div className="px-3 pt-3">
              <div className="flex items-center gap-1 mb-1">
                <button onClick={() => setShowChannels(v => !v)} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors flex-1">
                  {showChannels ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}Channels
                </button>
                <button onClick={onCreateChannel} className="h-4 w-4 rounded flex items-center justify-center hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"><Plus className="h-3 w-3" /></button>
              </div>
              <AnimatePresence>
                {showChannels && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-0.5">
                    {channels.map((ch) => (
                      <button key={ch.id} onClick={() => onSelectChannel(ch)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${activeChannelId === ch.id ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}>
                        {ch.type === "announcement" ? <Megaphone className="h-3.5 w-3.5 shrink-0" /> : <Hash className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{ch.name}</span>
                      </button>
                    ))}
                    {channels.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">No channels yet</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Members */}
            <div className="px-3 pt-3 pb-3">
              <button onClick={() => setShowMembers(v => !v)} className="flex items-center gap-1 w-full text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 hover:text-foreground transition-colors">
                {showMembers ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Users className="h-3 w-3" />{`Members · ${members.length}`}
              </button>
              <AnimatePresence>
                {showMembers && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-0.5">
                    {members.map((m) => {
                      const color = STATUS_COLORS[m.dev_status || "online"] || STATUS_COLORS.online;
                      return (
                        <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                          <div className="relative shrink-0">
                            <AvatarBubble letter={m.profiles.username[0]?.toUpperCase() || "?"} imageUrl={m.profiles.avatar_url} size="sm" />
                            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{m.profiles.display_name || m.profiles.username}</p>
                          </div>
                          {m.role !== "member" && <span className={`text-[9px] font-bold ${m.role === "owner" ? "text-primary" : "text-yellow-500"}`}>{m.role.toUpperCase()}</span>}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="px-3 py-2.5 border-t border-sidebar-border space-y-0.5">
            <button onClick={onOpenTasks}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                standaloneView === "tasks" ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}>
              <CheckSquare className="h-3.5 w-3.5 shrink-0" /><span>Tasks</span>
            </button>
            <button onClick={onOpenProjects}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                standaloneView === "projects" ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}>
              <FolderKanban className="h-3.5 w-3.5 shrink-0" /><span>Projects</span>
            </button>
            <button onClick={onOpenGithub}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                standaloneView === "github" || showGithub ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}>
              <Github className="h-3.5 w-3.5 shrink-0" /><span>GitHub</span>
            </button>
            <button onClick={onOpenAddPeople}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors">
              <UserPlus className="h-3.5 w-3.5 shrink-0" /><span>Add People</span>
            </button>
            {(() => {
              const me = members.find(m => m.user_id === user?.id);
              const color = STATUS_COLORS[me?.dev_status || "online"] || STATUS_COLORS.online;
              return (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
                  <span className="text-xs text-muted-foreground capitalize">{(me?.dev_status || "online").replace("_", " ")}</span>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default WorkspaceSidebar;
