import { useState } from "react";
import { X, Plus, CheckSquare, Circle, Clock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Task, WorkspaceMember } from "@/hooks/useWorkspace";
import { useAuth } from "@/context/AuthContext";

interface Props {
  tasks: Task[];
  members: WorkspaceMember[];
  workspaceId: string;
  onUpdateStatus: (taskId: string, status: Task["status"]) => void;
  onCreateTask: (title: string, description?: string) => void;
  onClose: () => void;
  fullPage?: boolean;
}

const STATUS_CONFIG = {
  open:        { label: "Open",        icon: Circle,       color: "text-muted-foreground",  bg: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock,        color: "text-yellow-500",         bg: "bg-yellow-500/10 text-yellow-500" },
  done:        { label: "Done",        icon: CheckCircle2, color: "text-green-500",          bg: "bg-green-500/10 text-green-500" },
};

const TasksPanel = ({ tasks, members, onUpdateStatus, onCreateTask, onClose, fullPage = false }: Props) => {
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<"all" | Task["status"]>("all");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    onCreateTask(newTitle.trim());
    setNewTitle("");
  };

  return (
    <div className={`h-full flex flex-col bg-background ${fullPage ? "rounded-[28px] border border-border/70 shadow-[0_18px_50px_rgba(15,23,42,0.08)]" : "border-l border-border w-80 shrink-0"}`}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Tasks</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{tasks.filter(t => t.status !== "done").length} open</span>
        </div>
        <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border shrink-0">
        {(["all", "open", "in_progress", "done"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 text-[11px] py-2 font-medium transition-colors ${
              filter === f ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            {f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* New task input */}
      <div className="px-3 py-2 border-b border-border flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="New task..."
          className="flex-1 bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={handleCreate} disabled={!newTitle.trim()}
          className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-white disabled:opacity-40">
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence>
          {filtered.map((task) => {
            const cfg = STATUS_CONFIG[task.status];
            const Icon = cfg.icon;
            const assignee = members.find((m) => m.user_id === task.assigned_to);
            return (
              <motion.div key={task.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="bg-card border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  {/* Status icon — click to open dropdown */}
                  <div className="relative shrink-0 mt-0.5">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === task.id ? null : task.id)}
                      className={`${cfg.color} hover:opacity-70 transition-opacity`}
                      title="Change status"
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {openDropdown === task.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute left-0 top-6 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden w-36"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(Object.entries(STATUS_CONFIG) as [Task["status"], typeof STATUS_CONFIG["open"]][]).map(([status, s]) => (
                            <button key={status}
                              onClick={() => { onUpdateStatus(task.id, status); setOpenDropdown(null); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left ${
                                task.status === status ? "font-semibold" : ""
                              }`}>
                              <s.icon className={`h-3.5 w-3.5 shrink-0 ${s.color}`} />
                              {s.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {task.title}
                    </p>
                    {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg}`}>{cfg.label}</span>
                  {assignee && <span className="text-[10px] text-muted-foreground">@{assignee.profiles.username}</span>}
                  {task.message_id && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">from message</span>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <CheckSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksPanel;
