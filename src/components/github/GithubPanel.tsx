import { useState, useEffect } from "react";
import { X, Star, GitFork, GitCommit, AlertCircle, RefreshCw, ExternalLink, ChevronRight, Circle, GitPullRequest, Plus, GitBranch } from "lucide-react";
import { useGithub } from "@/hooks/useGithub";
import type { GithubRepo, GithubCommit, GithubIssue } from "@/hooks/useGithub";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  CSS: "#563d7c", HTML: "#e34c26", Shell: "#89e051",
};

const GH_ICON = (cls = "h-4 w-4") => (
  <svg className={`${cls} text-foreground`} viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

interface Props {
  onClose: () => void;
  onOpenFiles?: (owner: string, repo: string, branch: string) => void;
  /** Pre-fill issue creation from a chat message */
  createIssueFrom?: { title: string; body: string } | null;
  onIssueDone?: () => void;
}

const GithubPanel = ({ onClose, onOpenFiles, createIssueFrom, onIssueDone }: Props) => {
  const { token, githubUser, repos, loading, error, fetchRepos, fetchCommits, fetchIssues, fetchPRs, createIssue, connectWithToken, disconnect } = useGithub();
  const [pat, setPat] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [issues, setIssues] = useState<GithubIssue[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [repoTab, setRepoTab] = useState<"commits" | "issues" | "prs">("commits");
  const [repoLoading, setRepoLoading] = useState(false);
  // Create issue
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issueResult, setIssueResult] = useState<{ number: number; url: string } | null>(null);

  useEffect(() => { if (token || githubUser) fetchRepos(); }, [token, githubUser]);

  // Auto-open issue creation if triggered from chat
  useEffect(() => {
    if (createIssueFrom && selectedRepo) {
      setIssueTitle(createIssueFrom.title);
      setIssueBody(createIssueFrom.body);
      setShowCreateIssue(true);
    }
  }, [createIssueFrom, selectedRepo]);

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
    const [c, i, p] = await Promise.all([fetchCommits(owner, name), fetchIssues(owner, name), fetchPRs(owner, name)]);
    setCommits(c);
    setIssues(i);
    setPrs(p);
    setRepoLoading(false);
  };

  const handleCreateIssue = async () => {
    if (!selectedRepo || !issueTitle.trim()) return;
    setCreatingIssue(true);
    const [owner, name] = selectedRepo.full_name.split("/");
    const result = await createIssue(owner, name, issueTitle.trim(), issueBody.trim());
    if (result) {
      setIssueResult({ number: result.number, url: result.html_url });
      setIssueTitle(""); setIssueBody("");
      // Refresh issues
      const updated = await fetchIssues(owner, name);
      setIssues(updated);
      onIssueDone?.();
    }
    setCreatingIssue(false);
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border w-80 shrink-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {GH_ICON()}
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
          {GH_ICON("h-12 w-12 text-muted-foreground/40")}
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground mb-1">Connect GitHub</p>
            <p className="text-xs text-muted-foreground">Paste a Personal Access Token</p>
            <a href="https://github.com/settings/tokens/new?scopes=repo,read:user" target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1 inline-block">Generate token →</a>
          </div>
          <div className="w-full space-y-2">
            <input value={pat} onChange={e => setPat(e.target.value)} onKeyDown={e => e.key === "Enter" && handleConnect()}
              type="password" placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-muted text-sm text-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-primary font-mono" autoFocus />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button onClick={handleConnect} disabled={!pat.trim() || connecting}
              className="w-full gradient-primary text-white text-sm rounded-xl py-2 font-medium disabled:opacity-40">
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      )}

      {/* Repo list */}
      {(token || githubUser) && !selectedRepo && (
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!loading && repos.map(repo => {
            const langColor = repo.language ? (LANG_COLORS[repo.language] || "#8b949e") : null;
            return (
              <div key={repo.id} className="border-b border-border/50">
                <button onClick={() => handleSelectRepo(repo)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left">
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
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {onOpenFiles && (
                      <button onClick={e => { e.stopPropagation(); const [o, n] = repo.full_name.split("/"); onOpenFiles(o, n, repo.default_branch); }}
                        className="text-[10px] text-primary hover:underline px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors">
                        Browse files
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              </div>
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
            <button onClick={() => { setSelectedRepo(null); setShowCreateIssue(false); setIssueResult(null); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</button>
            <span className="text-sm font-semibold truncate flex-1">{selectedRepo.name}</span>
            {onOpenFiles && (
              <button onClick={() => { const [o, n] = selectedRepo.full_name.split("/"); onOpenFiles(o, n, selectedRepo.default_branch); }}
                className="text-[10px] text-primary hover:underline shrink-0">Files</button>
            )}
            <a href={selectedRepo.html_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {(["commits", "issues", "prs"] as const).map(t => (
              <button key={t} onClick={() => { setRepoTab(t); setShowCreateIssue(false); setIssueResult(null); }}
                className={`flex-1 text-[11px] py-2 font-medium transition-colors ${repoTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "prs" ? "PRs" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {repoLoading && <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

            {/* Commits */}
            {!repoLoading && repoTab === "commits" && (
              <div>
                {commits.map(c => (
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

            {/* Issues */}
            {!repoLoading && repoTab === "issues" && (
              <div>
                {/* Create issue */}
                <div className="px-4 py-2 border-b border-border">
                  <button onClick={() => { setShowCreateIssue(v => !v); setIssueResult(null); }}
                    className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity">
                    <Plus className="h-3.5 w-3.5" /> New Issue
                  </button>
                </div>
                {showCreateIssue && (
                  <div className="px-4 py-3 border-b border-border space-y-2 bg-muted/20">
                    <input value={issueTitle} onChange={e => setIssueTitle(e.target.value)}
                      placeholder="Issue title" autoFocus
                      className="w-full bg-muted text-xs text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
                    <textarea value={issueBody} onChange={e => setIssueBody(e.target.value)}
                      placeholder="Description (optional)" rows={3}
                      className="w-full bg-muted text-xs text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none" />
                    {issueResult && (
                      <a href={issueResult.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-500 hover:underline block">
                        ✓ Issue #{issueResult.number} created →
                      </a>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setShowCreateIssue(false); setIssueResult(null); }}
                        className="flex-1 py-1.5 rounded-lg bg-muted text-xs text-muted-foreground">Cancel</button>
                      <button onClick={handleCreateIssue} disabled={!issueTitle.trim() || creatingIssue}
                        className="flex-1 py-1.5 rounded-lg gradient-primary text-xs text-white font-medium disabled:opacity-40">
                        {creatingIssue ? "Creating..." : "Create Issue"}
                      </button>
                    </div>
                  </div>
                )}
                {issues.map(issue => (
                  <a key={issue.id} href={issue.html_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50">
                    <AlertCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2">#{issue.number} {issue.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-[10px] text-muted-foreground">{issue.user.login} · {timeAgo(issue.created_at)}</p>
                        {issue.labels.slice(0, 2).map(l => (
                          <span key={l.name} className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `#${l.color}20`, color: `#${l.color}` }}>{l.name}</span>
                        ))}
                      </div>
                    </div>
                  </a>
                ))}
                {issues.length === 0 && !showCreateIssue && <p className="text-xs text-muted-foreground text-center py-6">No open issues</p>}
              </div>
            )}

            {/* PRs */}
            {!repoLoading && repoTab === "prs" && (
              <div>
                {prs.map((pr: any) => (
                  <a key={pr.id} href={pr.html_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors border-b border-border/50">
                    <GitPullRequest className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2">#{pr.number} {pr.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-muted-foreground">{pr.user?.login} · {timeAgo(pr.created_at)}</p>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <GitBranch className="h-2.5 w-2.5" />{pr.head?.ref} → {pr.base?.ref}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
                {prs.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No open PRs</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GithubPanel;
