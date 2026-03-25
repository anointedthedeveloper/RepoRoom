import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, X, Copy, Check, ExternalLink, Pencil, Save, GitCommit, AlertCircle } from "lucide-react";
import { useGithub } from "@/hooks/useGithub";
import { Highlight, themes } from "prism-react-renderer";

interface TreeNode { path: string; name: string; type: "blob" | "tree"; sha: string; url: string; }

interface Props { owner: string; repo: string; defaultBranch: string; onClose: () => void; }

const EXT_LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
  py: "python", rs: "rust", go: "go", java: "java",
  css: "css", html: "html", json: "json", md: "markdown",
  sh: "bash", yml: "yaml", yaml: "yaml", sql: "sql", c: "c", cpp: "cpp",
};

const GH_ICON = (
  <svg className="h-4 w-4 text-foreground shrink-0" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

const RepoFileBrowser = ({ owner, repo, defaultBranch, onClose }: Props) => {
  const { token, commitFile } = useGithub();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [fileSha, setFileSha] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<"success" | "error" | null>(null);
  const [branch, setBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<string[]>([]);

  const ghFetch = async (url: string) => {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  };

  // Fetch tree + branches
  useEffect(() => {
    setLoading(true);
    Promise.all([
      ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`),
      ghFetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`),
    ]).then(([treeData, branchData]) => {
      const nodes: TreeNode[] = (treeData.tree || [])
        .filter((n: any) => n.type === "blob" || n.type === "tree")
        .map((n: any) => ({ path: n.path, name: n.path.split("/").pop(), type: n.type, sha: n.sha, url: n.url }));
      setTree(nodes);
      setBranches((branchData || []).map((b: any) => b.name));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [owner, repo, branch]);

  const openFile = async (node: TreeNode) => {
    if (node.type !== "blob") return;
    setSelectedFile(node);
    setLoadingFile(true);
    setFileContent(""); setEditContent(""); setEditing(false); setCommitResult(null);
    try {
      const data = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${node.path}?ref=${branch}`);
      const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      setFileContent(content);
      setEditContent(content);
      setFileSha(data.sha);
    } catch { setFileContent("// Could not load file"); }
    setLoadingFile(false);
  };

  const handleCommit = async () => {
    if (!selectedFile || !commitMsg.trim() || !token) return;
    setCommitting(true);
    const ok = await commitFile(owner, repo, selectedFile.path, editContent, commitMsg.trim(), fileSha, branch);
    setCommitResult(ok ? "success" : "error");
    if (ok) {
      setFileContent(editContent);
      setEditing(false);
      setCommitMsg("");
      // Refresh tree to get new sha
      const data = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${selectedFile.path}?ref=${branch}`).catch(() => null);
      if (data) setFileSha(data.sha);
    }
    setCommitting(false);
    setTimeout(() => setCommitResult(null), 3000);
  };

  const getChildren = (parentPath: string) =>
    tree.filter(n => {
      const rel = parentPath ? n.path.slice(parentPath.length + 1) : n.path;
      return n.path.startsWith(parentPath ? parentPath + "/" : "") && !rel.includes("/");
    });

  const renderTree = (parentPath = "", depth = 0): React.ReactNode =>
    getChildren(parentPath).map(node => {
      const isOpen = expanded.has(node.path);
      return (
        <div key={node.path}>
          <button
            onClick={() => {
              if (node.type === "tree") {
                setExpanded(prev => { const n = new Set(prev); n.has(node.path) ? n.delete(node.path) : n.add(node.path); return n; });
              } else { openFile(node); }
            }}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            className={`w-full flex items-center gap-1.5 py-1 pr-2 text-left hover:bg-muted transition-colors rounded text-xs ${
              selectedFile?.path === node.path ? "bg-primary/10 text-primary" : "text-foreground"
            }`}
          >
            {node.type === "tree"
              ? isOpen ? <FolderOpen className="h-3.5 w-3.5 text-yellow-500 shrink-0" /> : <Folder className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
              : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className="truncate">{node.name}</span>
            {node.type === "tree" && (isOpen ? <ChevronDown className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />)}
          </button>
          {node.type === "tree" && isOpen && renderTree(node.path, depth + 1)}
        </div>
      );
    });

  const fileExt = selectedFile?.name.split(".").pop() || "";
  const fileLang = EXT_LANG[fileExt] || "text";
  const hasChanges = editing && editContent !== fileContent;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border w-[640px] shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        {GH_ICON}
        <span className="text-sm font-semibold flex-1 truncate">{owner}/{repo}</span>
        {/* Branch selector */}
        <select value={branch} onChange={e => { setBranch(e.target.value); setSelectedFile(null); }}
          className="text-xs bg-muted text-foreground rounded-lg px-2 py-1 outline-none border border-border">
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File tree */}
        <div className="w-52 shrink-0 border-r border-border overflow-y-auto py-2 px-1">
          {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading...</p> : renderTree()}
        </div>

        {/* File content / editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedFile ? (
            <>
              {/* File toolbar */}
              <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0 flex-wrap">
                <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{selectedFile.path}</span>
                {!editing ? (
                  <>
                    <button onClick={() => { navigator.clipboard.writeText(fileContent); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    {token && (
                      <button onClick={() => setEditing(true)}
                        className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditing(false); setEditContent(fileContent); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    {hasChanges && (
                      <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">unsaved</span>
                    )}
                  </>
                )}
              </div>

              {/* Commit bar (shown when editing with changes) */}
              {editing && hasChanges && (
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2 shrink-0">
                  <GitCommit className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCommit()}
                    placeholder="Commit message..."
                    className="flex-1 bg-muted text-xs text-foreground rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={handleCommit} disabled={!commitMsg.trim() || committing}
                    className="flex items-center gap-1 text-xs gradient-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-40 shrink-0">
                    <Save className="h-3 w-3" />{committing ? "Committing..." : "Commit"}
                  </button>
                </div>
              )}

              {/* Commit result */}
              {commitResult && (
                <div className={`px-3 py-1.5 text-xs flex items-center gap-2 shrink-0 ${commitResult === "success" ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                  {commitResult === "success" ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {commitResult === "success" ? `Committed to ${branch}` : "Commit failed — check token permissions"}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-auto">
                {loadingFile ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Loading file...</p>
                ) : editing ? (
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full h-full bg-transparent text-xs text-foreground font-mono p-4 outline-none resize-none leading-5"
                    style={{ minHeight: "100%", tabSize: 2 }}
                    spellCheck={false}
                  />
                ) : (
                  <Highlight theme={themes.nightOwl} code={fileContent} language={fileLang as any}>
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                      <pre className={`${className} text-xs p-4 m-0 min-h-full`} style={{ ...style, background: "transparent", fontSize: "11px" }}>
                        {tokens.map((line, i) => (
                          <div key={i} {...getLineProps({ line })} className="flex">
                            <span className="select-none text-white/20 mr-4 text-[10px] w-8 text-right shrink-0">{i + 1}</span>
                            <span>{line.map((token, key) => <span key={key} {...getTokenProps({ token })} />)}</span>
                          </div>
                        ))}
                      </pre>
                    )}
                  </Highlight>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Select a file to view or edit</p>
              {token && <p className="text-[10px] text-muted-foreground">Files can be edited and committed directly</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepoFileBrowser;
