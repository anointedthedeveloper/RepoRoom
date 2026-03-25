import { useState } from "react";
import { X, Plus, FolderKanban, Rocket, PauseCircle, Compass, CheckCircle2, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkspaceProject } from "@/hooks/useWorkspace";

interface Props {
  projects: WorkspaceProject[];
  linkedRepos: string[];
  onCreateProject: (name: string, description?: string, linkedRepoFullName?: string | null) => void;
  onUpdateStatus: (projectId: string, status: WorkspaceProject["status"]) => void;
  onClose: () => void;
}

const STATUS_CONFIG = {
  planning: { label: "Planning", icon: Compass, color: "text-sky-500", badge: "bg-sky-500/10 text-sky-500" },
  active: { label: "Active", icon: Rocket, color: "text-green-500", badge: "bg-green-500/10 text-green-500" },
  paused: { label: "Paused", icon: PauseCircle, color: "text-yellow-500", badge: "bg-yellow-500/10 text-yellow-500" },
  shipped: { label: "Shipped", icon: CheckCircle2, color: "text-primary", badge: "bg-primary/10 text-primary" },
};

const ProjectsPanel = ({ projects, linkedRepos, onCreateProject, onUpdateStatus, onClose }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkedRepo, setLinkedRepo] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateProject(name.trim(), description.trim() || undefined, linkedRepo || null);
    setName("");
    setDescription("");
    setLinkedRepo("");
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border w-96 shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Projects</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{projects.length}</span>
        </div>
        <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 border-b border-border bg-muted/20 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name"
          className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are we building?"
          rows={3}
          className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <select
          value={linkedRepo}
          onChange={(e) => setLinkedRepo(e.target.value)}
          className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">No linked repo</option>
          {linkedRepos.map((repo) => (
            <option key={repo} value={repo}>{repo}</option>
          ))}
        </select>
        <button onClick={handleCreate} disabled={!name.trim()}
          className="w-full py-2 rounded-lg gradient-primary text-sm text-white font-medium disabled:opacity-40 flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Create Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {projects.map((project) => {
            const config = STATUS_CONFIG[project.status];
            const Icon = config.icon;
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border bg-card p-3 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    {project.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{project.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${config.badge}`}>{config.label}</span>
                  {project.linked_repo_full_name && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {project.linked_repo_full_name}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {(Object.keys(STATUS_CONFIG) as WorkspaceProject["status"][]).map((status) => (
                    <button
                      key={status}
                      onClick={() => onUpdateStatus(project.id, status)}
                      className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${
                        project.status === status ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {projects.length === 0 && (
          <div className="text-center py-10">
            <FolderKanban className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No projects yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPanel;
