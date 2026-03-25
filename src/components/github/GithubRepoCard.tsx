import { useEffect, useState } from "react";
import { Star, GitFork, Circle, ExternalLink, AlertCircle } from "lucide-react";
import { useGithub } from "@/hooks/useGithub";
import type { GithubRepo } from "@/hooks/useGithub";

interface Props { owner: string; repo: string; isMine: boolean; }

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  CSS: "#563d7c", HTML: "#e34c26", Shell: "#89e051",
};

const GithubRepoCard = ({ owner, repo, isMine }: Props) => {
  const { fetchRepoPreview } = useGithub();
  const [data, setData] = useState<GithubRepo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepoPreview(owner, repo).then((r) => { setData(r); setLoading(false); });
  }, [owner, repo]);

  if (loading) return (
    <div className={`mt-1 rounded-xl border p-3 w-64 animate-pulse ${isMine ? "border-white/20 bg-white/10" : "border-border bg-muted/50"}`}>
      <div className="h-3 bg-current opacity-20 rounded w-3/4 mb-2" />
      <div className="h-2 bg-current opacity-10 rounded w-full mb-1" />
      <div className="h-2 bg-current opacity-10 rounded w-2/3" />
    </div>
  );

  if (!data) return null;
  const langColor = data.language ? (LANG_COLORS[data.language] || "#8b949e") : null;

  return (
    <a href={data.html_url} target="_blank" rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`mt-1 flex flex-col gap-2 rounded-xl border p-3 w-64 hover:opacity-90 transition-opacity ${
        isMine ? "border-white/20 bg-white/10" : "border-border bg-card"
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <svg className="h-3.5 w-3.5 shrink-0 opacity-70" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span className={`text-xs font-semibold truncate ${isMine ? "text-white" : "text-foreground"}`}>{data.full_name}</span>
            {data.private && <span className={`text-[9px] px-1 py-0.5 rounded border ${isMine ? "border-white/30 text-white/60" : "border-border text-muted-foreground"}`}>Private</span>}
          </div>
          {data.description && <p className={`text-[11px] line-clamp-2 ${isMine ? "text-white/70" : "text-muted-foreground"}`}>{data.description}</p>}
        </div>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
      </div>
      <div className={`flex items-center gap-3 text-[11px] ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
        {langColor && <span className="flex items-center gap-1"><Circle className="h-2.5 w-2.5 shrink-0" style={{ color: langColor, fill: langColor }} />{data.language}</span>}
        <span className="flex items-center gap-1"><Star className="h-3 w-3" />{data.stargazers_count}</span>
        <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{data.forks_count}</span>
        {data.open_issues_count > 0 && <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />{data.open_issues_count}</span>}
      </div>
    </a>
  );
};

export default GithubRepoCard;
