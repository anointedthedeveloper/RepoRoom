import { CheckSquare, FolderKanban, Github, LayoutDashboard, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, PanelTopClose, PanelTopOpen, Settings, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WorkspaceToolbarProps {
  standaloneView: "chat" | "tasks" | "projects" | "github";
  chatOpen: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  showGithub: boolean;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  onToggleGithub: () => void;
  onOpenAddPeople: () => void;
}

const WorkspaceToolbar = ({
  standaloneView, chatOpen, sidebarOpen, sidebarCollapsed, showGithub,
  onToggleSidebar, onToggleChat, onToggleGithub, onOpenAddPeople,
}: WorkspaceToolbarProps) => {
  const navigate = useNavigate();

  const btn = (active: boolean) =>
    `h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

  return (
    <div className="fixed inset-x-3 bottom-4 z-40 flex justify-center">
      <div className="flex w-full max-w-4xl items-center justify-between gap-1 rounded-[22px] border border-border/70 bg-card/92 px-2 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <button onClick={onToggleSidebar} className={btn(sidebarOpen || sidebarCollapsed)} title="Toggle sidebar">
          {sidebarOpen || !sidebarCollapsed ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        <button onClick={() => navigate("/workspace/tasks")} className={btn(standaloneView === "tasks")} title="Tasks">
          <CheckSquare className="h-4 w-4" />
        </button>
        <button onClick={() => navigate("/workspace/projects")} className={btn(standaloneView === "projects")} title="Projects">
          <FolderKanban className="h-4 w-4" />
        </button>
        <button onClick={onToggleGithub} className={btn(standaloneView === "github" || showGithub)} title="GitHub">
          <Github className="h-4 w-4" />
        </button>
        <button onClick={onOpenAddPeople} className={btn(false)} title="Add people">
          <UserPlus className="h-4 w-4" />
        </button>
        <button onClick={onToggleChat} className={btn(standaloneView === "chat" && !chatOpen)} title={standaloneView === "chat" && chatOpen ? "Hide chat" : "Open chat"}>
          {standaloneView === "chat" && chatOpen ? <PanelTopClose className="h-4 w-4" /> : <PanelTopOpen className="h-4 w-4" />}
        </button>
        <button onClick={() => navigate("/dashboard")} className={btn(false)} title="Dashboard">
          <LayoutDashboard className="h-4 w-4" />
        </button>
        <button onClick={() => navigate("/settings")} className={btn(false)} title="Settings">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default WorkspaceToolbar;
