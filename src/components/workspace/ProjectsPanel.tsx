import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, FolderKanban, Rocket, PauseCircle, Compass, CheckCircle2, Link2, FileText, ChevronDown, ChevronRight, Trash2, FolderOpen, ExternalLink, FilePlus, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkspaceProject, WorkspaceProjectFile } from "@/hooks/useWorkspace";

interface Props {
  projects: WorkspaceProject[];
  linkedRepos: string[];
  projectFiles: WorkspaceProjectFile[];
  onCreateProject: (name: string, description?: string, linkedRepoFullName?: string | null) => void;
  onUpdateStatus: (projectId: string, status: WorkspaceProject["status"]) => void;
  onUpdateRepo: (projectId: string, linkedRepoFullName: string | null) => void;
  onRemoveFile?: (fileId: string) => Promise<void> | void;
  onOpenFileBrowser?: (owner: string, repo: string, branch: string) => void;
  onClose: () => void;
  fullPage?: boolean;
}

const STATUS_CONFIG = {
  planning: { label: "Planning", icon: Compass,      color: "text-sky-500",   badge: "bg-sky-500/10 text-sky-500" },
  active:   { label: "Active",   icon: Rocket,       color: "text-green-500", badge: "bg-green-500/10 text-green-500" },
  paused:   { label: "Paused",   icon: PauseCircle,  color: "text-yellow-500",badge: "bg-yellow-500/10 text-yellow-500" },
  shipped:  { label: "Shipped",  icon: CheckCircle2, color: "text-primary",   badge: "bg-primary/10 text-primary" },
};

const ProjectsPanel = ({ projects, linkedRepos, projectFiles, onCreateProject, onUpdateStatus, onUpdateRepo, onRemoveFile, onOpenFileBrowser, onClose, fullPage = false }: Props) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkedRepo, setLinkedRepo] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [removingFile, setRemovingFile] = useState<string | null>(null);

  const filesByProject = projectFiles.reduce<Record<string, WorkspaceProjectFile[]>>((acc, f) => {
    (acc[f.project_id] ||= []).push(f);
    return acc;
  }, {});

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreateProject(name.trim(), description.trim() || undefined, linkedRepo || null);
    setName(""); setDescription(""); setLinkedRepo(""); setShowForm(false);
  };

  return (
    <div className={`h-full flex flex-col bg-background ${fullPage ? "rounded-[28px] border border-border/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)]" : "border-l border-border w-96 shrink-0"}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Projects</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{projects.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowForm(v => !v)} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${showForm ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}>
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border">
            <div className="p-3 space-y-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" autoFocus
                className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)"
                className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
              {linkedRepos.length > 0 && (
                <select value={linkedRepo} onChange={e => setLinkedRepo(e.target.value)}
                  className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary">
                  <option value="">No linked repo</option>
                  {linkedRepos.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-muted text-sm text-muted-foreground">Cancel</button>
                <button onClick={handleCreate} disabled={!name.trim()} className="flex-1 py-2 rounded-lg gradient-primary text-sm text-white font-medium disabled:opacity-40">Create</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {projects.map(project => {
            const cfg = STATUS_CONFIG[project.status];
            const Icon = cfg.icon;
            const files = filesByProject[project.id] || [];
            return (
              <motion.div key={project.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="rounded-2xl border border-border bg-card p-3 space-y-2.5">
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    {project.description && <p className="text-xs text-muted-foreground mt-0.5">{project.description}</p>}
                  </div>
                </div>

                {/* Open Editor button */}
                {project.linked_repo_full_name && (
                  <button
                    onClick={() => navigate(`/project/${project.id}/editor`)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Open Editor
                  </button>
                )}

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                  {project.linked_repo_full_name && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" />{project.linked_repo_full_name.split("/")[1] ?? project.linked_repo_full_name}
                    </span>
                  )}
                  {files.length > 0 && (
                    <button
                      onClick={() => setExpandedFiles(prev => { const n = new Set(prev); n.has(project.id) ? n.delete(project.id) : n.add(project.id); return n; })}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1 hover:bg-muted/80 transition-colors"
                    >
                      <FileText className="h-3 w-3" />{files.length} file{files.length !== 1 ? "s" : ""}
                      {expandedFiles.has(project.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  )}
                </div>

                {/* File Manager */}
                <AnimatePresence>
                  {expandedFiles.has(project.id) && files.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="bg-muted/30 rounded-xl border border-border/40 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Files</span>
                          {project.linked_repo_full_name && onOpenFileBrowser && (
                            <button
                              onClick={() => {
                                const [owner, repo] = project.linked_repo_full_name!.split("/");
                                onOpenFileBrowser(owner, repo, "main");
                              }}
                              className="text-[10px] text-primary hover:underline flex items-center gap-1"
                            >
                              <FilePlus className="h-3 w-3" /> Add files
                            </button>
                          )}
                        </div>
                        {files.map(file => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors border-b border-border/20 last:border-0 group">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate font-medium">{file.file_name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{file.file_path}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {onOpenFileBrowser && (
                                <button
                                  onClick={() => onOpenFileBrowser(file.repo_owner, file.repo_name, file.branch_name)}
                                  className="p-1 hover:bg-background rounded text-muted-foreground hover:text-primary"
                                  title="Open in file browser"
                                >
                                  <FolderOpen className="h-3 w-3" />
                                </button>
                              )}
                              {onRemoveFile && (
                                <button
                                  onClick={async () => {
                                    setRemovingFile(file.id);
                                    await onRemoveFile(file.id);
                                    setRemovingFile(null);
                                  }}
                                  disabled={removingFile === file.id}
                                  className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500 disabled:opacity-40"
                                  title="Remove file"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Repo picker */}
                {linkedRepos.length > 0 && (
                  <select value={project.linked_repo_full_name || ""} onChange={e => onUpdateRepo(project.id, e.target.value || null)}
                    className="w-full bg-muted text-[11px] text-foreground rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary">
                    <option value="">No linked repo</option>
                    {linkedRepos.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}

                {/* Status buttons */}
                <div className="flex gap-1.5">
                  {(Object.keys(STATUS_CONFIG) as WorkspaceProject["status"][]).map(status => (
                    <button key={status} onClick={() => onUpdateStatus(project.id, status)}
                      className={`text-[10px] px-2 py-1 rounded-lg transition-colors ${project.status === status ? "bg-primary/10 text-primary font-medium" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
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
            <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-primary hover:underline">Create one</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPanel;
