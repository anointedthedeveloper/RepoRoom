import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Users, CheckSquare, GitCommit, Phone, ArrowLeft, LayoutGrid, Circle, FolderKanban, Github, Activity, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGithub } from "@/hooks/useGithub";
import type { GithubCommit } from "@/hooks/useGithub";
import AvatarBubble from "@/components/chat/AvatarBubble";

const DEV_STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500", coding: "bg-blue-500", reviewing: "bg-yellow-500",
  in_call: "bg-purple-500", idle: "bg-gray-400", offline: "bg-gray-600",
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { workspaces, activeWorkspace, members, tasks, channels, selectWorkspace } = useWorkspace();
  const { repos, githubUser, fetchRepos, fetchCommits } = useGithub();
  const [recentCommits, setRecentCommits] = useState<GithubCommit[]>([]);
  const [stats, setStats] = useState({ messages: 0, chats: 0, calls: 0 });

  // Auto-select first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspace) selectWorkspace(workspaces[0]);
  }, [workspaces, activeWorkspace, selectWorkspace]);

  // Fetch GitHub commits for first repo
  useEffect(() => {
    if (githubUser) fetchRepos();
  }, [githubUser, fetchRepos]);

  useEffect(() => {
    if (repos.length > 0) {
      const [owner, repo] = repos[0].full_name.split("/");
      fetchCommits(owner, repo).then(setRecentCommits);
    }
  }, [repos, fetchCommits]);

  // Fetch chat stats
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
      supabase.from("chat_members").select("chat_room_id").eq("user_id", user.id),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id).like("file_type", "call/%"),
    ]).then(([msgs, chats, calls]) => {
      setStats({ messages: msgs.count || 0, chats: chats.data?.length || 0, calls: calls.count || 0 });
    });

    supabase.from("chat_members").select("chat_room_id").eq("user_id", user.id).then(async ({ data }) => {
      if (!data?.length) return;
      const roomIds = data.map(r => r.chat_room_id);
      await supabase.from("chat_rooms").select("id, name, is_group").in("id", roomIds).limit(5);
    });
  }, [user]);

  const openTasks = tasks.filter(t => t.status === "open").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const doneTasks = tasks.filter(t => t.status === "done").length;

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const statCards = [
    { label: "Messages Sent", value: stats.messages, icon: MessageSquare, color: "text-primary" },
    { label: "Active Chats", value: stats.chats, icon: Users, color: "text-blue-500" },
    { label: "Calls Made", value: stats.calls, icon: Phone, color: "text-green-500" },
    { label: "Open Tasks", value: openTasks, icon: CheckSquare, color: "text-yellow-500" },
  ];

  const completionRate = useMemo(() => {
    const total = tasks.length || 1;
    return Math.round((doneTasks / total) * 100);
  }, [doneTasks, tasks.length]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_24%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/60 bg-card/80 backdrop-blur-xl flex items-center gap-4 shrink-0">
        <button onClick={() => navigate("/workspace")} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground">Welcome back, {profile?.display_name || profile?.username}</p>
        </div>
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
          <MessageSquare className="h-3.5 w-3.5" /> Chats
        </button>
        <button onClick={() => navigate("/workspace")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">
          <LayoutGrid className="h-3.5 w-3.5" /> Workspace
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden rounded-[30px] border border-border/70 bg-card/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.10)]"
        >
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] p-6 lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground mb-4">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Workspace command center
              </div>
              <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
                {activeWorkspace ? activeWorkspace.name : "Your developer workspace"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Track team activity, GitHub momentum, and task delivery from one place without bouncing between tools.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => navigate("/workspace")} className="rounded-xl gradient-primary px-4 py-2.5 text-sm font-medium text-white">
                  Open Workspace
                </button>
                <button onClick={() => navigate("/")} className="rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-medium text-foreground">
                  Go to Chats
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  Delivery pulse
                </div>
                <p className="text-2xl font-semibold text-foreground">{completionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Tasks completed across the active workspace</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Github className="h-3.5 w-3.5 text-primary" />
                  Repo coverage
                </div>
                <p className="text-2xl font-semibold text-foreground">{repos.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Repositories currently visible to this account</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Tasks overview */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] xl:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Tasks</span>
              <button onClick={() => navigate("/workspace")} className="text-xs text-primary hover:underline">View all</button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Open", count: openTasks, color: "bg-muted", text: "text-muted-foreground" },
                { label: "In Progress", count: inProgressTasks, color: "bg-yellow-500/20", text: "text-yellow-500" },
                { label: "Done", count: doneTasks, color: "bg-green-500/20", text: "text-green-500" },
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${t.color.replace("/20", "")}`} />
                    <span className="text-xs text-muted-foreground">{t.label}</span>
                  </div>
                  <span className={`text-xs font-semibold ${t.text}`}>{t.count}</span>
                </div>
              ))}
              {tasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No tasks yet</p>}
            </div>
            {tasks.length > 0 && (
              <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                {tasks.filter(t => t.status !== "done").slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
                    <CheckSquare className={`h-3 w-3 shrink-0 ${t.status === "in_progress" ? "text-yellow-500" : "text-muted-foreground"}`} />
                    <span className="text-xs text-foreground truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Workspace members */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] xl:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Team</span>
              <span className="text-xs text-muted-foreground">{members.length} members</span>
            </div>
            <div className="space-y-2">
              {members.slice(0, 6).map(m => {
                const stColor = DEV_STATUS_COLORS[m.dev_status || "online"] || "bg-gray-400";
                return (
                  <div key={m.user_id} className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <AvatarBubble letter={m.profiles.username[0]?.toUpperCase() || "?"} imageUrl={m.profiles.avatar_url} size="sm" />
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${stColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.profiles.display_name || m.profiles.username}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{(m.dev_status || "online").replace("_", " ")}</p>
                    </div>
                    {m.role === "owner" && <span className="text-[9px] text-primary font-bold">OWNER</span>}
                  </div>
                );
              })}
              {members.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No workspace selected</p>}
            </div>
          </motion.div>

          {/* GitHub recent commits */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] xl:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-foreground" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <span className="text-sm font-semibold text-foreground">Recent Commits</span>
              </div>
              {repos[0] && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{repos[0].name}</span>}
            </div>
            {!githubUser ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">GitHub not connected</p>
                <button onClick={() => navigate("/")} className="text-xs text-primary hover:underline">Connect in Settings →</button>
              </div>
            ) : recentCommits.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No repos or commits found</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentCommits.slice(0, 6).map(c => (
                  <a key={c.sha} href={c.html_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors">
                    <GitCommit className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-1">{c.commit.message.split("\n")[0]}</p>
                      <p className="text-[10px] text-muted-foreground">{c.commit.author.name} · {timeAgo(c.commit.author.date)}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </motion.div>

          {/* Channels */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] xl:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Channels</span>
              <button onClick={() => navigate("/workspace")} className="text-xs text-primary hover:underline">Open</button>
            </div>
            <div className="space-y-1">
              {channels.slice(0, 6).map(ch => (
                <button key={ch.id} onClick={() => navigate("/workspace")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors text-left">
                  <span className="text-muted-foreground text-sm">#</span>
                  <span className="text-xs text-foreground truncate">{ch.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto capitalize">{ch.type}</span>
                </button>
              ))}
              {channels.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No channels</p>}
            </div>
          </motion.div>

          {/* Workspaces */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] xl:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Workspaces</span>
              <button onClick={() => navigate("/workspace")} className="text-xs text-primary hover:underline">Manage</button>
            </div>
            <div className="space-y-2">
              {workspaces.map(ws => (
                <button key={ws.id} onClick={() => navigate("/workspace")}
                  className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors text-left ${activeWorkspace?.id === ws.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"}`}>
                  <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {ws.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{ws.name}</p>
                    {ws.description && <p className="text-[10px] text-muted-foreground truncate">{ws.description}</p>}
                  </div>
                  {activeWorkspace?.id === ws.id && <Circle className="h-2 w-2 fill-primary text-primary shrink-0" />}
                </button>
              ))}
              {workspaces.length === 0 && (
                <div className="text-center py-3">
                  <p className="text-xs text-muted-foreground mb-2">No workspaces yet</p>
                  <button onClick={() => navigate("/workspace")} className="text-xs text-primary hover:underline">Create one →</button>
                </div>
              )}
            </div>
          </motion.div>

          {/* GitHub repos */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] xl:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Repositories</span>
              {githubUser && <span className="text-[10px] text-muted-foreground">@{githubUser}</span>}
            </div>
            {!githubUser ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">Connect GitHub to see repos</p>
                <button onClick={() => navigate("/")} className="text-xs text-primary hover:underline">Connect →</button>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {repos.slice(0, 6).map(r => (
                  <a key={r.id} href={r.html_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.language || "—"} · ⭐ {r.stargazers_count}</p>
                    </div>
                    {r.private && <span className="text-[9px] border border-border text-muted-foreground px-1 py-0.5 rounded shrink-0">Private</span>}
                  </a>
                ))}
                {repos.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No repos found</p>}
              </div>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-card/85 border border-border/70 rounded-2xl p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-foreground">Quick View</span>
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Workspace</p>
                <p className="mt-1 text-sm font-medium text-foreground truncate">{activeWorkspace?.name || "None selected"}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">In Progress</p>
                <p className="mt-1 text-sm font-medium text-foreground">{inProgressTasks} task{inProgressTasks === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">GitHub</p>
                <p className="mt-1 text-sm font-medium text-foreground">{githubUser ? `@${githubUser}` : "Not connected"}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
