import { X, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkspaceMember, WorkspaceProject } from "@/hooks/useWorkspace";
import type { LinkedRepo } from "@/hooks/useWorkspaceGithub";

interface WorkspaceModalsProps {
  // Create workspace
  showCreateWs: boolean;
  wsName: string;
  wsDesc: string;
  onWsNameChange: (v: string) => void;
  onWsDescChange: (v: string) => void;
  onCreateWorkspace: () => void;
  onCloseCreateWs: () => void;

  // Join workspace
  showJoinWs: boolean;
  inviteCode: string;
  onInviteCodeChange: (v: string) => void;
  onJoinWorkspace: () => void;
  onCloseJoinWs: () => void;

  // Create channel
  showCreateCh: boolean;
  chName: string;
  onChNameChange: (v: string) => void;
  onCreateChannel: () => void;
  onCloseCreateCh: () => void;

  // Add people
  showAddPeople: boolean;
  activeWorkspaceName: string;
  activeWorkspaceInviteCode: string;
  members: WorkspaceMember[];
  addUsername: string;
  addError: string;
  addSuccess: string;
  onAddUsernameChange: (v: string) => void;
  onAddPeople: () => void;
  onCloseAddPeople: () => void;

  // Convert to task
  taskFromMsg: { id: string; content: string } | null;
  taskTitle: string;
  onTaskTitleChange: (v: string) => void;
  onCreateTask: () => void;
  onCloseTask: () => void;

  // GitHub issue
  githubIssueFrom: { id: string; content: string } | null;
  githubIssueTitle: string;
  githubIssueBody: string;
  githubToken: string | null;
  linkedRepos: LinkedRepo[];
  selectedLinkedRepoId: string;
  creatingGithubIssue: boolean;
  projects: WorkspaceProject[];
  onGithubIssueTitleChange: (v: string) => void;
  onGithubIssueBodyChange: (v: string) => void;
  onSelectedLinkedRepoChange: (v: string) => void;
  onCreateGithubIssue: () => void;
  onCloseGithubIssue: () => void;
  onOpenGithubPanel: () => void;
}

const Backdrop = ({ onClick }: { onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    onClick={onClick}
  />
);

const Modal = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClick}>
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      className="bg-card rounded-2xl w-full max-w-sm p-5 border border-border shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </div>
);

const WorkspaceModals = (props: WorkspaceModalsProps) => {
  const {
    showCreateWs, wsName, wsDesc, onWsNameChange, onWsDescChange, onCreateWorkspace, onCloseCreateWs,
    showJoinWs, inviteCode, onInviteCodeChange, onJoinWorkspace, onCloseJoinWs,
    showCreateCh, chName, onChNameChange, onCreateChannel, onCloseCreateCh,
    showAddPeople, activeWorkspaceName, activeWorkspaceInviteCode, members, addUsername, addError, addSuccess,
    onAddUsernameChange, onAddPeople, onCloseAddPeople,
    taskFromMsg, taskTitle, onTaskTitleChange, onCreateTask, onCloseTask,
    githubIssueFrom, githubIssueTitle, githubIssueBody, githubToken, linkedRepos, selectedLinkedRepoId,
    creatingGithubIssue, onGithubIssueTitleChange, onGithubIssueBodyChange, onSelectedLinkedRepoChange,
    onCreateGithubIssue, onCloseGithubIssue, onOpenGithubPanel,
  } = props;

  return (
    <AnimatePresence>
      {showCreateWs && (
        <>
          <Backdrop onClick={onCloseCreateWs} />
          <Modal onClick={onCloseCreateWs}>
            <h3 className="text-sm font-semibold mb-4">Create Workspace</h3>
            <div className="space-y-3 mb-4">
              <input value={wsName} onChange={(e) => onWsNameChange(e.target.value)} placeholder="Workspace name"
                className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary" autoFocus />
              <input value={wsDesc} onChange={(e) => onWsDescChange(e.target.value)} placeholder="Description (optional)"
                className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex gap-2">
              <button onClick={onCloseCreateWs} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
              <button onClick={onCreateWorkspace} disabled={!wsName.trim()}
                className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Create</button>
            </div>
          </Modal>
        </>
      )}

      {showJoinWs && (
        <>
          <Backdrop onClick={onCloseJoinWs} />
          <Modal onClick={onCloseJoinWs}>
            <h3 className="text-sm font-semibold mb-4">Join Workspace</h3>
            <input value={inviteCode} onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter invite code (e.g. ABC123)"
              className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary mb-4 font-mono tracking-widest" autoFocus />
            <div className="flex gap-2">
              <button onClick={onCloseJoinWs} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
              <button onClick={onJoinWorkspace} disabled={inviteCode.length < 6}
                className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Join</button>
            </div>
          </Modal>
        </>
      )}

      {showCreateCh && (
        <>
          <Backdrop onClick={onCloseCreateCh} />
          <Modal onClick={onCloseCreateCh}>
            <h3 className="text-sm font-semibold mb-4">New Channel</h3>
            <input value={chName} onChange={(e) => onChNameChange(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              placeholder="channel-name"
              className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary mb-4 font-mono" autoFocus />
            <div className="flex gap-2">
              <button onClick={onCloseCreateCh} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
              <button onClick={onCreateChannel} disabled={!chName.trim()}
                className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Create</button>
            </div>
          </Modal>
        </>
      )}

      {showAddPeople && (
        <>
          <Backdrop onClick={onCloseAddPeople} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCloseAddPeople}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl w-full max-w-sm p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Add People to {activeWorkspaceName}</h3>
                <button onClick={onCloseAddPeople} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-muted rounded-xl px-3 py-2.5 mb-4">
                <p className="text-[10px] text-muted-foreground mb-1">Share invite code</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-lg font-bold text-primary tracking-widest">{activeWorkspaceInviteCode}</span>
                  <button onClick={() => navigator.clipboard.writeText(activeWorkspaceInviteCode)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-sidebar-accent">Copy</button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Others can join with this code</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Or add directly by username</p>
              <div className="flex gap-2 mb-2">
                <input value={addUsername}
                  onChange={(e) => onAddUsernameChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onAddPeople()}
                  placeholder="@username"
                  className="flex-1 bg-muted text-sm text-foreground rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary" autoFocus />
                <button onClick={onAddPeople} disabled={!addUsername.trim()}
                  className="px-3 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Add</button>
              </div>
              {addError && <p className="text-xs text-destructive">{addError}</p>}
              {addSuccess && <p className="text-xs text-green-500">{addSuccess}</p>}
              <div className="mt-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Members · {members.length}</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                      <div className="h-6 w-6 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {m.profiles.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.profiles.display_name || m.profiles.username}</p>
                        <p className="text-[10px] text-muted-foreground">@{m.profiles.username}</p>
                      </div>
                      <span className={`text-[9px] font-bold ${m.role === "owner" ? "text-primary" : m.role === "admin" ? "text-yellow-500" : "text-muted-foreground"}`}>
                        {m.role.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}

      {taskFromMsg && (
        <>
          <Backdrop onClick={onCloseTask} />
          <Modal onClick={onCloseTask}>
            <h3 className="text-sm font-semibold mb-3">Convert to Task</h3>
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-3 line-clamp-2">{taskFromMsg.content}</p>
            <input value={taskTitle} onChange={(e) => onTaskTitleChange(e.target.value)}
              placeholder="Task title..."
              className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary mb-3" autoFocus />
            <div className="flex gap-2">
              <button onClick={onCloseTask} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
              <button onClick={onCreateTask} disabled={!taskTitle.trim()}
                className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Create Task</button>
            </div>
          </Modal>
        </>
      )}

      {githubIssueFrom && (
        <>
          <Backdrop onClick={onCloseGithubIssue} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCloseGithubIssue}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card rounded-2xl w-full max-w-lg p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Convert Message to GitHub Issue</h3>
                  <p className="text-xs text-muted-foreground mt-1">Create a tracked issue without leaving chat.</p>
                </div>
                <button onClick={onCloseGithubIssue} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-muted rounded-xl px-3 py-2.5 mb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Message</p>
                <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-4">{githubIssueFrom.content}</p>
              </div>
              {linkedRepos.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linked repo</label>
                    <select value={selectedLinkedRepoId || linkedRepos[0]?.id || ""}
                      onChange={(e) => onSelectedLinkedRepoChange(e.target.value)}
                      className="mt-1 w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary">
                      {linkedRepos.map((repo) => (
                        <option key={repo.id} value={repo.id}>{repo.repo_full_name} ({repo.default_branch})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Issue title</label>
                    <input value={githubIssueTitle} onChange={(e) => onGithubIssueTitleChange(e.target.value)}
                      className="mt-1 w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary" autoFocus />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Issue body</label>
                    <textarea value={githubIssueBody} onChange={(e) => onGithubIssueBodyChange(e.target.value)}
                      rows={7} className="mt-1 w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={onCloseGithubIssue} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
                    <button onClick={onCreateGithubIssue} disabled={!githubToken || !githubIssueTitle.trim() || creatingGithubIssue}
                      className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">
                      {creatingGithubIssue ? "Creating..." : "Create Issue"}
                    </button>
                  </div>
                  {!githubToken && <p className="text-xs text-destructive">Connect GitHub first so RepoRoom can create issues on your behalf.</p>}
                </div>
              ) : (
                <div className="bg-muted rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">No linked repos yet</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Open the GitHub panel, connect your account, and link at least one repo to this workspace first.</p>
                  <button onClick={onOpenGithubPanel} className="text-xs gradient-primary text-white px-3 py-2 rounded-xl font-medium">
                    Open GitHub Panel
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default WorkspaceModals;
