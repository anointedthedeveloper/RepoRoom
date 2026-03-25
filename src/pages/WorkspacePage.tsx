import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Hash, ArrowLeft, Send, Smile, X, Users, UserPlus, MessageSquare, Github } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import TasksPanel from "@/components/workspace/TasksPanel";
import GithubPanel from "@/components/github/GithubPanel";
import MessageBubble from "@/components/chat/MessageBubble";
import EmojiPicker from "@/components/chat/EmojiPicker";
import type { Channel } from "@/hooks/useWorkspace";

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
    setDevStatus, createTask, updateTaskStatus, addMember,
  } = useWorkspace();

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
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
  }, [channels]);

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
    } as any);
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

  const handleAddPeople = useCallback(async () => {
    if (!activeWorkspace || !addUsername.trim()) return;
    setAddError("");
    setAddSuccess("");
    const err = await addMember(activeWorkspace.id, addUsername.trim());
    if (err) { setAddError(err); }
    else { setAddSuccess(`@${addUsername.trim()} added!`); setAddUsername(""); }
  }, [activeWorkspace, addUsername, addMember]);

  const handleSelectWorkspace = useCallback(async (ws: any) => {
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

  const senderProfile = useCallback((senderId: string) => {
    return members.find((m) => m.user_id === senderId)?.profiles;
  }, [members]);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <WorkspaceSidebar
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          channels={channels}
          members={members}
          tasks={tasks}
          activeChannelId={activeChannel?.id || null}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectChannel={setActiveChannel}
          onCreateWorkspace={() => setShowCreateWs(true)}
          onJoinWorkspace={() => setShowJoinWs(true)}
          onCreateChannel={() => setShowCreateCh(true)}
          onSetDevStatus={(s) => activeWorkspace && setDevStatus(activeWorkspace.id, s)}
          onOpenTasks={() => setShowTasks((v) => !v)}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Channel header */}
        {activeChannel ? (
          <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 shrink-0">
            <button onClick={() => navigate("/")} title="Back to chats"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <MessageSquare className="h-4 w-4" />
            </button>
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{activeChannel.name}</h2>
              {activeChannel.description && <p className="text-[11px] text-muted-foreground">{activeChannel.description}</p>}
            </div>
            <button onClick={() => { setShowAddPeople(true); setAddError(""); setAddSuccess(""); setAddUsername(""); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted">
              <UserPlus className="h-3.5 w-3.5" /> Add people
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
          <div className="px-4 py-3 border-b border-border bg-card/80 flex items-center gap-3 shrink-0">
            <button onClick={() => navigate("/")} title="Back to chats"
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <MessageSquare className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              {loading ? "Loading..." : workspaces.length === 0 ? "Create or join a workspace to get started" : "Select a channel"}
            </span>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto py-3">
              {activeChannel && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                  <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center">
                    <Hash className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Welcome to #{activeChannel.name}</p>
                  <p className="text-xs text-muted-foreground">{activeChannel.description || "Start the conversation!"}</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const prev = messages[i - 1];
                const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                const profile = senderProfile(msg.sender_id);
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
                    }}
                    isMine={msg.sender_id === user?.id}
                    reactions={[]}
                    onForward={() => handleConvertToTask(msg.id, msg.content)}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {activeChannel && (
              <div className="px-3 py-3 border-t border-border shrink-0">
                {showEmoji && (
                  <EmojiPicker onSelect={(e) => setInput((p) => p + e)} onClose={() => setShowEmoji(false)} />
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowEmoji(!showEmoji)} className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <Smile className="h-5 w-5" />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder={`Message #${activeChannel.name}`}
                    className="flex-1 bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary transition-all"
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

          {/* GitHub panel */}
          <AnimatePresence>
            {showGithub && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden shrink-0">
                <GithubPanel onClose={() => setShowGithub(false)} />
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
