import { useState, useCallback } from "react";

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  open_issues_count: number;
  private: boolean;
  default_branch: string;
}

export interface GithubCommit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
  html_url: string;
  author: { login: string; avatar_url: string } | null;
}

export interface GithubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  user: { login: string };
  created_at: string;
  labels: { name: string; color: string }[];
}

const GH_TOKEN_KEY = "chatflow_github_token";
const GH_USER_KEY  = "chatflow_github_user";

export function useGithub() {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(GH_TOKEN_KEY));
  const [githubUser, setGithubUser] = useState<string | null>(() => localStorage.getItem(GH_USER_KEY));
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ghFetch = useCallback(async (url: string, tok?: string) => {
    const t = tok || token;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (t) headers["Authorization"] = `Bearer ${t}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  }, [token]);

  const connectWithToken = useCallback(async (pat: string) => {
    setLoading(true);
    setError(null);
    try {
      const user = await ghFetch("https://api.github.com/user", pat);
      localStorage.setItem(GH_TOKEN_KEY, pat);
      localStorage.setItem(GH_USER_KEY, user.login);
      setTokenState(pat);
      setGithubUser(user.login);
      return true;
    } catch {
      setError("Invalid token or network error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [ghFetch]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(GH_TOKEN_KEY);
    localStorage.removeItem(GH_USER_KEY);
    setTokenState(null);
    setGithubUser(null);
    setRepos([]);
  }, []);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = token
        ? "https://api.github.com/user/repos?sort=updated&per_page=30"
        : `https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=30`;
      const data = await ghFetch(url);
      setRepos(data as GithubRepo[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, githubUser, ghFetch]);

  const fetchRepoPreview = useCallback(async (owner: string, repo: string): Promise<GithubRepo | null> => {
    try {
      return await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
    } catch { return null; }
  }, [ghFetch]);

  const fetchCommits = useCallback(async (owner: string, repo: string): Promise<GithubCommit[]> => {
    try {
      return await ghFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`);
    } catch { return []; }
  }, [ghFetch]);

  const fetchIssues = useCallback(async (owner: string, repo: string): Promise<GithubIssue[]> => {
    try {
      return await ghFetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=10`);
    } catch { return []; }
  }, [ghFetch]);

  // Parse a GitHub URL into owner/repo
  const parseGithubUrl = useCallback((url: string): { owner: string; repo: string } | null => {
    const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }, []);

  return {
    token, githubUser, repos, loading, error,
    connectWithToken, disconnect, fetchRepos,
    fetchRepoPreview, fetchCommits, fetchIssues, parseGithubUrl,
  };
}
