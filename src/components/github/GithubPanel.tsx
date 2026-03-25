import { useState, useEffect } from "react";
import { X, Star, GitFork, GitCommit, AlertCircle, RefreshCw, ExternalLink, ChevronRight, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGithub } from "@/hooks/useGithub";
import type { GithubRepo, GithubCommit, GithubIssue } from "@/hooks/useGithub";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  CSS: "#563d7c", HTML: "#e34c26", Shell: "#89e051",
};

interface Props { onClose: () => void; }

const GithubPanel = ({ onClose }: Props) => {
  const { token, githubUser, repos, loading, error, fetchRepos, fetchCommits, fetchIssues, connectWithToken, disconnect } = useGithub();
  const [pat, setPat] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [issues, setIssues] = useState<GithubIssue[]>([]);
  const [repoTab, setRepoTab] = useState<"commits" | "issues">("commits");
  const [repoLoading, setRepoLoading] = useState(false);

  useEffect(() => { if (token || githubUser) fetchRepos(); }, [token, githubUser]);

  const handleConnect = async () => {
    if (!pat.trim()) return;
    setConnecting(true);
    await connectWithToken(pat.trim());
    setConnecting(false);
    setPat("");
  };

  const handleSelectRepo = async (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setRepoLoading(true);
    const [owner, name] = repo.full_name.split("/");
    const [c, i] = await Promise.all([fetchCommits(owner, name), fetchIssues(owner, name)]);
    setCommits(c);
    setIssues(i);
    setRepoLoading(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border w-80 shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-foreground" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span className="text-sm font-semibold">GitHub</span>
          {githubUser && <span className="text-xs text-muted-foreground">@{githubUser}</span>}
        </div>
        <div className="flex items-center gap-1">
          {(token || githubUser) && (
            <button onClick={fetchRepos} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground" title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
          <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Not connected */}
      {!token && !githubUser && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <svg className="h-12 w-12 text-muted-foreground/40" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Connect GitHub</p>
            <p className="text-xs text-muted-foreground">Paste a Personal Access Token to view your repos</p>
            <a href="https://github.com/settings/tokens/new?scopes=repo,read:user" target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1 inline-block">
              Generate token →
            </a>
          </div>
          <div className="w-full space-y-2">
            <input value={pat} onChange={(e) => setPat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              type="password" placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary font-mono"
              autoFocus />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button onClick={handleConnect} disabled={!pat.trim() || connecting}
              className="w-full gradient-primary text-white text-sm rounded-xl py-2 font-medium disabled:opacity-40">
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      )}

      {/* Connected — repo list */}
      {(token || githubUser) && !selectedRepo && (
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!loading && repos.map((repo) => {
            const langColor = repo.language ? (LANG_COLORS[repo.language] || "#8b949e") : null;
            return (
              <button key={repo.id} onClick={() => handleSelectRepo(repo)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium text-foreground truncate">{repo.name}</span>
                    {repo.private && <span className="text-[9px] px-1 py-0.5 rounded border border-border text-muted-foreground shrink-0">Private</span>}
                  </div>
                  {repo.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-1">{repo.description}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {langColor && <span className="flex items-center gap-1"><Circle className="h-2 w-2 shrink-0" style={{ color: langColor, fill: langColor }} />{repo.language}</span>}
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" />{repo.stargazers_count}</span>
                    <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{repo.forks_count}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            );
          })}
          {!loading && repos.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No repos found</p>}
          <div className="px-4 py-3 border-t border-border">
            <button onClick={disconnect} className="text-xs text-destructive hover:opacity-80 transition-opacity">Disconnect GitHub</button>
          </div>
        </div>
      )}

      {/* Repo detail */}
      {(token || githubUser) && selectedRepo && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
            <button onClick={() => setSelectedRepo(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</button>
            <span className="text-sm font-semibold truncate flex-1">{selectedRepo.name}</span>
            <a href={selectedRepo.html_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="flex border-b border-border shrink-0">
            {(["commits", "issues"] as const).map((t) => (
              <button key={t} onClick={() => setRepoTab(t)}
                className={`flex-1 text-xs py-2 font-medium capitalize transition-colors ${repoTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "commits" ? `Commits` : `Issues`}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {repoLoading && <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
            {!repoLoading && repoTab === "commits" && (
              <div>
                {commits.map((c) => (
                  <a key={c.sha} href={c.html_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50">
                    {c.author?.avatar_url
                      ? <img src={c.author.avatar_url} className="h-6 w-6 rounded-full shrink-0 mt-0.5" alt="" />
                      : <div className="h-6 w-6 rounded-full bg-muted shrink-0 mt-0.5 flex items-center justify-center"><GitCommit className="h-3 w-3 text-muted-foreground" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2">{c.commit.message.split("\n")[0]}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.commit.author.name} · {timeAgo(c.commit.author.date)}</p>
                    </div>
                  </a>
                ))}
                {commits.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No commits</p>}
              </div>
            )}
            {!repoLoading && repoTab === "issues" && (
              <div>
                {issues.map((issue) => (
                  <a key={issue.id} href={issue.html_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50">
                    <AlertCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2">#{issue.number} {issue.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-[10px] text-muted-foreground">{issue.user.login} · {timeAgo(issue.created_at)}</p>
                        {issue.labels.slice(0, 2).map((l) => (
                          <span key={l.name} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `#${l.color}20`, color: `#${l.color}` }}>{l.name}</span>
                        ))}
                      </div>
                    </div>
                  </a>
                ))}
                {issues.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No open issues</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GithubPanel;
