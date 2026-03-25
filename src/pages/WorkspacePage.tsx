import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, Send, Smile, X, Users, UserPlus, MessageSquare, Github, LayoutDashboard, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGithub } from "@/hooks/useGithub";
import { useWorkspaceGithub } from "@/hooks/useWorkspaceGithub";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import TasksPanel from "@/components/workspace/TasksPanel";
import ProjectsPanel from "@/components/workspace/ProjectsPanel";
import GithubPanel from "@/components/github/GithubPanel";
import RepoFileBrowser from "@/components/github/RepoFileBrowser";
import MessageBubble from "@/components/chat/MessageBubble";
import EmojiPicker from "@/components/chat/EmojiPicker";
import type { Channel, Workspace } from "@/hooks/useWorkspace";
import type { GithubRepo } from "@/hooks/useGithub";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}

const WorkspacePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    workspaces, activeWorkspace, channels, members, tasks, loading,
    selectWorkspace, createWorkspace, joinWorkspace, createChannel,
    setDevStatus, createTask, updateTaskStatus, projects, createProject, updateProjectStatus, addMember,
  } = useWorkspace();
  const { token: githubToken, createIssue } = useGithub();
  const {
    linkedRepos,
    messageLinks,
    fetchLinkedRepos,
    fetchMessageLinks,
    linkRepo,
    saveIssueLink,
  } = useWorkspaceGithub();

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [fileBrowserRepo, setFileBrowserRepo] = useState<{ owner: string; repo: string; branch: string } | null>(null);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showJoinWs, setShowJoinWs] = useState(false);
  const [showCreateCh, setShowCreateCh] = useState(false);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [chName, setChName] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [taskFromMsg, setTaskFromMsg] = useState<{ id: string; content: string } | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [githubIssueFrom, setGithubIssueFrom] = useState<{ id: string; content: string } | null>(null);
  const [githubIssueTitle, setGithubIssueTitle] = useState("");
  const [githubIssueBody, setGithubIssueBody] = useState("");
  const [selectedLinkedRepoId, setSelectedLinkedRepoId] = useState("");
  const [creatingGithubIssue, setCreatingGithubIssue] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-select first workspace
  useEffect(() => {
    if (!loading && workspaces.length > 0 && !activeWorkspace) {
      selectWorkspace(workspaces[0]);
    }
  }, [loading, workspaces, activeWorkspace, selectWorkspace]);

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !activeChannel) {
      setActiveChannel(channels[0]);
    } else if (channels.length > 0 && activeChannel) {
      const still = channels.find((c) => c.id === activeChannel.id);
      if (!still) setActiveChannel(channels[0]);
    }
  }, [channels, activeChannel]);

  useEffect(() => {
    if (!activeWorkspace) return;
    fetchLinkedRepos(activeWorkspace.id);
    fetchMessageLinks(activeWorkspace.id);
  }, [activeWorkspace, fetchLinkedRepos, fetchMessageLinks]);

  // Fetch messages for active channel
  useEffect(() => {
    if (!activeChannel) { setMessages([]); return; }
    supabase.from("channel_messages").select("*")
      .eq("channel_id", activeChannel.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []));

    const ch = supabase.channel(`ch-msgs-${activeChannel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "channel_messages", filter: `channel_id=eq.${activeChannel.id}` },
        (payload) => setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeChannel]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!user || !activeChannel || !input.trim()) return;
    const content = input.trim();
    setInput("");
    await supabase.from("channel_messages").insert({
      channel_id: activeChannel.id,
      workspace_id: activeWorkspace?.id,
      sender_id: user.id,
      content,
    } as never);
  }, [user, activeChannel, activeWorkspace, input]);

  const handleConvertToTask = useCallback((msgId: string, content: string) => {
    setTaskFromMsg({ id: msgId, content });
    setTaskTitle(content.slice(0, 80));
  }, []);

  const handleCreateTaskFromMsg = useCallback(async () => {
    if (!activeWorkspace || !taskTitle.trim()) return;
    await createTask(activeWorkspace.id, taskTitle.trim(), undefined, activeChannel?.id, taskFromMsg?.id);
    setTaskFromMsg(null);
    setTaskTitle("");
    setShowTasks(true);
  }, [activeWorkspace, taskTitle, activeChannel, taskFromMsg, createTask]);

  const handleOpenGithubIssue = useCallback((message: { id: string; text: string }) => {
    setGithubIssueFrom({ id: message.id, content: message.text });
    setGithubIssueTitle(message.text.split("\n")[0].slice(0, 120));
    setGithubIssueBody(`Created from ChatFlow message:\n\n${message.text}`);
    setSelectedLinkedRepoId((prev) => prev || linkedRepos[0]?.id || "");
  }, [linkedRepos]);

  const handleCreateGithubIssue = useCallback(async () => {
    if (!activeWorkspace || !githubIssueFrom || !githubIssueTitle.trim()) return;

    const repoLink = linkedRepos.find((repo) => repo.id === selectedLinkedRepoId) || linkedRepos[0];
    if (!repoLink) {
      toast.error("Link a GitHub repo to this workspace first");
      return;
    }

    setCreatingGithubIssue(true);
    const created = await createIssue(
      repoLink.repo_owner,
      repoLink.repo_name,
      githubIssueTitle.trim(),
      githubIssueBody.trim(),
    );

    if (!created) {
      toast.error("Could not create the GitHub issue");
      setCreatingGithubIssue(false);
      return;
    }

    const saved = await saveIssueLink(
      activeWorkspace.id,
      activeChannel?.id || null,
      githubIssueFrom.id,
      repoLink.repo_full_name,
      {
        number: created.number,
        title: githubIssueTitle.trim(),
        html_url: created.html_url,
      },
    );

    if (!saved.ok) {
      toast.error(saved.error || "Issue created, but linking it to the message failed");
    } else {
      toast.success(`Issue #${created.number} created in ${repoLink.repo_full_name}`);
    }

    setGithubIssueFrom(null);
    setGithubIssueTitle("");
    setGithubIssueBody("");
    setCreatingGithubIssue(false);
  }, [activeWorkspace, activeChannel, createIssue, githubIssueBody, githubIssueFrom, githubIssueTitle, linkedRepos, saveIssueLink, selectedLinkedRepoId]);

  const handleLinkRepoToWorkspace = useCallback(async (repo: GithubRepo) => {
    if (!activeWorkspace) return;
    const result = await linkRepo(activeWorkspace.id, repo);
    if (!result.ok) toast.error(result.error || "Could not link repo");
    else toast.success(`${repo.full_name} linked to ${activeWorkspace.name}`);
  }, [activeWorkspace, linkRepo]);

  const messageLinkById = useCallback((messageId: string) => {
    return messageLinks.find((link) => link.message_id === messageId && link.github_type === "issue") || null;
  }, [messageLinks]);

  const handleAddPeople = useCallback(async () => {
    if (!activeWorkspace || !addUsername.trim()) return;
    setAddError("");
    setAddSuccess("");
    const err = await addMember(activeWorkspace.id, addUsername.trim());
    if (err) { setAddError(err); }
    else { setAddSuccess(`@${addUsername.trim()} added!`); setAddUsername(""); }
  }, [activeWorkspace, addUsername, addMember]);

  const handleSelectWorkspace = useCallback(async (ws: Workspace) => {
    setActiveChannel(null);
    await selectWorkspace(ws);
  }, [selectWorkspace]);

  const handleCreateWorkspace = useCallback(async () => {
    if (!wsName.trim()) return;
    const ws = await createWorkspace(wsName.trim(), wsDesc.trim() || undefined);
    if (ws) { setShowCreateWs(false); setWsName(""); setWsDesc(""); await selectWorkspace(ws); }
  }, [wsName, wsDesc, createWorkspace, selectWorkspace]);

  const handleJoinWorkspace = useCallback(async () => {
    if (!inviteCode.trim()) return;
    const ws = await joinWorkspace(inviteCode.trim());
    if (ws) { setShowJoinWs(false); setInviteCode(""); await selectWorkspace(ws); }
    else alert("Invalid invite code");
  }, [inviteCode, joinWorkspace, selectWorkspace]);

  const handleCreateChannel = useCallback(async () => {
    if (!activeWorkspace || !chName.trim()) return;
    const ch = await createChannel(activeWorkspace.id, chName.trim());
    if (ch) { setShowCreateCh(false); setChName(""); setActiveChannel(ch); }
  }, [activeWorkspace, chName, createChannel]);

  return (
    <div className="h-screen flex overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-r border-border/60 bg-sidebar/95 backdrop-blur-xl">
        <WorkspaceSidebar
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          channels={channels}
          members={members}
          tasks={tasks}
          projects={projects}
          linkedRepoCount={linkedRepos.length}
          activeChannelId={activeChannel?.id || null}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectChannel={setActiveChannel}
          onCreateWorkspace={() => setShowCreateWs(true)}
          onJoinWorkspace={() => setShowJoinWs(true)}
          onCreateChannel={() => setShowCreateCh(true)}
          onSetDevStatus={(s) => activeWorkspace && setDevStatus(activeWorkspace.id, s)}
          onOpenTasks={() => setShowTasks((v) => !v)}
          onOpenProjects={() => setShowProjects((v) => !v)}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-3 lg:p-4 gap-3">
        {/* Channel header */}
        {activeChannel ? (
          <div className="px-4 py-3 rounded-2xl border border-border/70 bg-card/85 backdrop-blur-sm flex items-center gap-3 shrink-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <button onClick={() => navigate("/")} title="Back to chats"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <MessageSquare className="h-4 w-4" />
            </button>
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{activeChannel.name}</h2>
              {activeChannel.description && <p className="text-[11px] text-muted-foreground">{activeChannel.description}</p>}
            </div>
            {activeWorkspace && (
              <div className="hidden xl:flex items-center gap-2 text-[11px]">
                <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">{projects.length} projects</span>
                <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">{linkedRepos.length} repos</span>
              </div>
            )}
            <button onClick={() => { setShowAddPeople(true); setAddError(""); setAddSuccess(""); setAddUsername(""); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted">
              <UserPlus className="h-3.5 w-3.5" /> Add people
            </button>
            <button onClick={() => navigate("/dashboard")} title="Dashboard"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <LayoutDashboard className="h-4 w-4" />
            </button>
            <button onClick={() => setShowGithub(v => !v)}
              title="GitHub"
              className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                showGithub ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              <Github className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />{members.length}
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 rounded-2xl border border-border/70 bg-card/85 flex items-center gap-3 shrink-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <button onClick={() => navigate("/")} title="Back to chats"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <MessageSquare className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              {loading ? "Loading..." : workspaces.length === 0 ? "Create or join a workspace to get started" : "Select a channel"}
            </span>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden gap-3 min-h-0">
          {/* Messages */}
          <div className="flex-1 flex flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card/80 backdrop-blur-sm shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/20 shrink-0">
              <div>
                <p className="text-sm font-semibold text-foreground">{activeChannel ? `#${activeChannel.name}` : "Workspace feed"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {activeChannel ? `${messages.length} message${messages.length === 1 ? "" : "s"} in this channel` : "Choose a channel to start collaborating"}
                </p>
              </div>
              {activeWorkspace && (
                <div className="hidden md:flex items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-muted-foreground">{members.length} members</span>
                  <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-muted-foreground">{tasks.filter((task) => task.status !== "done").length} open tasks</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              {activeChannel && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                  <div className="h-14 w-14 rounded-[20px] gradient-primary flex items-center justify-center shadow-lg">
                    <Hash className="h-6 w-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">Welcome to #{activeChannel.name}</p>
                    <p className="text-xs text-muted-foreground max-w-sm">{activeChannel.description || "Start the conversation, drop GitHub links, or turn messages into tracked work."}</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => {
                const prev = messages[i - 1];
                const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                const issueLink = messageLinkById(msg.id);
                return (
                  <MessageBubble
                    key={msg.id}
                    showDate={showDate}
                    message={{
                      id: msg.id,
                      senderId: msg.sender_id,
                      text: msg.content,
                      timestamp: new Date(msg.created_at),
                      read: true,
                      fileUrl: msg.file_url || undefined,
                      fileType: msg.file_type || undefined,
                      fileName: msg.file_name || undefined,
                      replyTo: msg.reply_to_text ? { text: msg.reply_to_text, senderName: msg.reply_to_sender || "Unknown" } : null,
                      githubIssueLink: issueLink ? {
                        number: issueLink.external_number,
                        title: issueLink.external_title,
                        url: issueLink.external_url,
                        repoFullName: issueLink.repo_full_name,
                      } : null,
                    }}
                    isMine={msg.sender_id === user?.id}
                    reactions={[]}
                    onForward={() => handleConvertToTask(msg.id, msg.content)}
                    onGithubIssue={() => handleOpenGithubIssue({ id: msg.id, text: msg.content })}
                    onReply={() => {}}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {activeChannel && (
              <div className="px-3 py-3 border-t border-border/60 shrink-0 bg-background/80">
                {showEmoji && (
                  <EmojiPicker onSelect={(e) => setInput((p) => p + e)} onClose={() => setShowEmoji(false)} />
                )}
                <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/35 p-2">
                  <button onClick={() => setShowEmoji(!showEmoji)} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <Smile className="h-5 w-5" />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder={`Message #${activeChannel.name}`}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-2 py-2.5 outline-none focus:ring-0 transition-all"
                  />
                  <button onClick={sendMessage} disabled={!input.trim()}
                    className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0 disabled:opacity-40">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tasks panel */}
          <AnimatePresence>
            {showTasks && activeWorkspace && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
                <TasksPanel
                  tasks={tasks}
                  members={members}
                  workspaceId={activeWorkspace.id}
                  onUpdateStatus={(id, status) => updateTaskStatus(id, status, activeWorkspace.id)}
                  onCreateTask={(title, desc) => createTask(activeWorkspace.id, title, desc, activeChannel?.id)}
                  onClose={() => setShowTasks(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showProjects && activeWorkspace && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 384, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
                <ProjectsPanel
                  projects={projects}
                  linkedRepos={linkedRepos.map((repo) => repo.repo_full_name)}
                  onCreateProject={(name, description, linkedRepoFullName) => createProject(activeWorkspace.id, name, description, linkedRepoFullName)}
                  onUpdateStatus={(projectId, status) => updateProjectStatus(projectId, status, activeWorkspace.id)}
                  onClose={() => setShowProjects(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* GitHub panel */}
          <AnimatePresence>
            {showGithub && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
                <GithubPanel
                  onClose={() => setShowGithub(false)}
                  workspaceId={activeWorkspace?.id || null}
                  linkedRepoNames={linkedRepos.map((repo) => repo.repo_full_name)}
                  onLinkRepo={handleLinkRepoToWorkspace}
                  onOpenFiles={(owner, repo, branch) => {
                    setFileBrowserRepo({ owner, repo, branch });
                    setShowFileBrowser(true);
                    setShowGithub(false);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Repo file browser */}
          <AnimatePresence>
            {showFileBrowser && fileBrowserRepo && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 980, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
                <RepoFileBrowser
                  owner={fileBrowserRepo.owner}
                  repo={fileBrowserRepo.repo}
                  defaultBranch={fileBrowserRepo.branch}
                  onClose={() => { setShowFileBrowser(false); setFileBrowserRepo(null); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Convert to task modal */}
      <AnimatePresence>
        {taskFromMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setTaskFromMsg(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-3">Convert to Task</h3>
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-3 line-clamp-2">{taskFromMsg.content}</p>
              <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => setTaskFromMsg(null)} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
                <button onClick={handleCreateTaskFromMsg} disabled={!taskTitle.trim()}
                  className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">
                  Create Task
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {githubIssueFrom && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setGithubIssueFrom(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-lg p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Convert Message to GitHub Issue</h3>
                  <p className="text-xs text-muted-foreground mt-1">Create a tracked issue without leaving chat.</p>
                </div>
                <button onClick={() => setGithubIssueFrom(null)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
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
                    <select
                      value={selectedLinkedRepoId || linkedRepos[0]?.id || ""}
                      onChange={(e) => setSelectedLinkedRepoId(e.target.value)}
                      className="mt-1 w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                    >
                      {linkedRepos.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.repo_full_name} ({repo.default_branch})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Issue title</label>
                    <input
                      value={githubIssueTitle}
                      onChange={(e) => setGithubIssueTitle(e.target.value)}
                      className="mt-1 w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Issue body</label>
                    <textarea
                      value={githubIssueBody}
                      onChange={(e) => setGithubIssueBody(e.target.value)}
                      rows={7}
                      className="mt-1 w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-xl px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">No linked repos yet</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Open the GitHub panel, connect your account, and link at least one repo to this workspace first.</p>
                  <button
                    onClick={() => {
                      setGithubIssueFrom(null);
                      setShowGithub(true);
                    }}
                    className="text-xs gradient-primary text-white px-3 py-2 rounded-xl font-medium"
                  >
                    Open GitHub Panel
                  </button>
                </div>
              )}

              {linkedRepos.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setGithubIssueFrom(null)} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
                  <button
                    onClick={handleCreateGithubIssue}
                    disabled={!githubToken || !githubIssueTitle.trim() || creatingGithubIssue}
                    className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40"
                  >
                    {creatingGithubIssue ? "Creating..." : "Create Issue"}
                  </button>
                </div>
              )}

              {!githubToken && linkedRepos.length > 0 && (
                <p className="text-xs text-destructive mt-3">Connect GitHub first so ChatFlow can create issues on your behalf.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create workspace modal */}
      <AnimatePresence>
        {showCreateWs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowCreateWs(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-4">Create Workspace</h3>
              <div className="space-y-3 mb-4">
                <input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="Workspace name"
                  className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary" autoFocus />
                <input value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} placeholder="Description (optional)"
                  className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreateWs(false)} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
                <button onClick={handleCreateWorkspace} disabled={!wsName.trim()}
                  className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join workspace modal */}
      <AnimatePresence>
        {showJoinWs && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowJoinWs(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-4">Join Workspace</h3>
              <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="Enter invite code (e.g. ABC123)"
                className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary mb-4 font-mono tracking-widest" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowJoinWs(false)} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
                <button onClick={handleJoinWorkspace} disabled={inviteCode.length < 6}
                  className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Join</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add people modal */}
      <AnimatePresence>
        {showAddPeople && activeWorkspace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowAddPeople(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Add People to {activeWorkspace.name}</h3>
                <button onClick={() => setShowAddPeople(false)} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Invite code */}
              <div className="bg-muted rounded-xl px-3 py-2.5 mb-4">
                <p className="text-[10px] text-muted-foreground mb-1">Share invite code</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-lg font-bold text-primary tracking-widest">{activeWorkspace.invite_code}</span>
                  <button onClick={() => { navigator.clipboard.writeText(activeWorkspace.invite_code); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-sidebar-accent">
                    Copy
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Others can join with this code</p>
              </div>
              {/* Add by username */}
              <p className="text-xs font-medium text-muted-foreground mb-2">Or add directly by username</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={addUsername}
                  onChange={(e) => { setAddUsername(e.target.value); setAddError(""); setAddSuccess(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddPeople()}
                  placeholder="@username"
                  className="flex-1 bg-muted text-sm text-foreground rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <button onClick={handleAddPeople} disabled={!addUsername.trim()}
                  className="px-3 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">
                  Add
                </button>
              </div>
              {addError && <p className="text-xs text-destructive">{addError}</p>}
              {addSuccess && <p className="text-xs text-green-500">{addSuccess}</p>}
              {/* Current members */}
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
                      <span className={`text-[9px] font-bold ${
                        m.role === "owner" ? "text-primary" : m.role === "admin" ? "text-yellow-500" : "text-muted-foreground"
                      }`}>{m.role.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create channel modal */}
      <AnimatePresence>
        {showCreateCh && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowCreateCh(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card rounded-2xl w-full max-w-sm p-5 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold mb-4">New Channel</h3>
              <input value={chName} onChange={(e) => setChName(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="channel-name"
                className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary mb-4 font-mono" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowCreateCh(false)} className="flex-1 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
                <button onClick={handleCreateChannel} disabled={!chName.trim()}
                  className="flex-1 py-2 rounded-xl gradient-primary text-sm text-white font-medium disabled:opacity-40">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkspacePage;
