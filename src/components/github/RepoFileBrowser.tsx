import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Eye, ExternalLink, FileText, Folder, FolderOpen, GitCommit, Maximize2, Minimize2, Pencil, Play, Save, TerminalSquare, X } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import type { Language } from "prism-react-renderer";
import { useGithub } from "@/hooks/useGithub";

interface TreeNode {
  path: string;
  name: string;
  type: "blob" | "tree";
  sha: string;
  url: string;
}

interface TreeResponse {
  tree?: Array<{ path: string; type: "blob" | "tree"; sha: string; url: string }>;
}

interface BranchResponse {
  name: string;
}

interface ContentResponse {
  content: string;
  sha: string;
}

interface ConsoleLine {
  id: string;
  kind: "info" | "stdout" | "stderr" | "input";
  text: string;
}

interface Props {
  owner: string;
  repo: string;
  defaultBranch: string;
  onClose: () => void;
}

const EXT_LANG: Record<string, Language> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  css: "css",
  html: "html",
  json: "json",
  md: "markdown",
  py: "python",
  sql: "sql",
  yml: "yaml",
  yaml: "yaml",
};

const decodeGithubContent = (content: string) => decodeURIComponent(escape(atob(content.replace(/\n/g, ""))));

const markdownBlocks = (content: string) => {
  const lines = content.split("\n");
  return lines.map((line, index) => {
    if (!line.trim()) return <div key={`s-${index}`} className="h-2" />;
    if (line.startsWith("# ")) return <h1 key={index} className="text-3xl font-semibold">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={index} className="text-2xl font-semibold">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={index} className="text-xl font-semibold">{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <li key={index} className="ml-5 list-disc">{line.slice(2)}</li>;
    if (line.startsWith("> ")) return <blockquote key={index} className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground">{line.slice(2)}</blockquote>;
    return <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">{line}</p>;
  });
};

const previewDoc = (path: string, content: string) => {
  if (/\.html?$/i.test(path)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><script>const s=(k,a)=>parent.postMessage({source:"chatflow-preview",kind:k,args:a.map(String)},"*");console.log=(...a)=>s("stdout",a);console.error=(...a)=>s("stderr",a);console.warn=(...a)=>s("stderr",a);window.onerror=(m)=>s("stderr",[m]);</script></head><body>${content}</body></html>`;
  }
  if (/\.css$/i.test(path)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><style>${content}</style></head><body style="font-family:system-ui;padding:24px"><div class="card"><h1>CSS Preview</h1><p>Stylesheet mounted in sandbox.</p><button>Button</button></div></body></html>`;
  }
  if (/\.(js|mjs)$/i.test(path)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><script>const s=(k,a)=>parent.postMessage({source:"chatflow-preview",kind:k,args:a.map(String)},"*");console.log=(...a)=>s("stdout",a);console.error=(...a)=>s("stderr",a);console.warn=(...a)=>s("stderr",a);window.onerror=(m)=>s("stderr",[m]);</script></head><body><script>${content}</scr` + `ipt></body></html>`;
  }
  if (/\.json$/i.test(path)) {
    try {
      return `<!doctype html><html><body style="margin:0;background:#0f172a;color:#dbeafe;padding:16px;font-family:ui-monospace,monospace"><pre>${JSON.stringify(JSON.parse(content), null, 2)}</pre></body></html>`;
    } catch {
      return "";
    }
  }
  return "";
};

const RepoFileBrowser = ({ owner, repo, defaultBranch, onClose }: Props) => {
  const { token, commitFile } = useGithub();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [fileSha, setFileSha] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [branch, setBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("code");
  const [fullscreen, setFullscreen] = useState(false);
  const [consoleInput, setConsoleInput] = useState("");
  const [previewNonce, setPreviewNonce] = useState(0);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([
    { id: "boot", kind: "info", text: "Sandbox ready. Commands: help, run, preview, info, clear" },
  ]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const ghFetch = useCallback(async <T,>(url: string): Promise<T> => {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<T>;
  }, [token]);

  const pushConsole = (kind: ConsoleLine["kind"], text: string) => {
    setConsoleLines((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, kind, text }]);
  };

  useEffect(() => {
    Promise.all([
      ghFetch<TreeResponse>(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`),
      ghFetch<BranchResponse[]>(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`),
    ]).then(([treeData, branchData]) => {
      setTree((treeData.tree || []).filter((node) => node.type === "blob" || node.type === "tree").map((node) => ({
        path: node.path,
        name: node.path.split("/").pop() || node.path,
        type: node.type,
        sha: node.sha,
        url: node.url,
      })));
      setBranches(branchData.map((item) => item.name));
    }).finally(() => setLoading(false));
  }, [owner, repo, branch, ghFetch]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLines]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { source?: string; kind?: "stdout" | "stderr"; args?: string[] };
      if (data.source !== "chatflow-preview" || !data.kind) return;
      pushConsole(data.kind, (data.args || []).join(" "));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const openFile = async (node: TreeNode) => {
    if (node.type !== "blob") return;
    setSelectedFile(node);
    setLoadingFile(true);
    setEditing(false);
    try {
      const data = await ghFetch<ContentResponse>(`https://api.github.com/repos/${owner}/${repo}/contents/${node.path}?ref=${branch}`);
      const next = decodeGithubContent(data.content);
      setFileContent(next);
      setEditContent(next);
      setFileSha(data.sha);
      setViewMode(/README|\.md$/i.test(node.path) ? "preview" : "code");
      pushConsole("info", `Opened ${node.path}`);
    } catch {
      setFileContent("// Could not load file");
      setEditContent("// Could not load file");
      pushConsole("stderr", `Could not load ${node.path}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const runFile = () => {
    if (!selectedFile) {
      pushConsole("stderr", "No file selected.");
      return;
    }
    const current = editing ? editContent : fileContent;
    pushConsole("input", `run ${selectedFile.path}`);
    if (/\.md$/i.test(selectedFile.path)) {
      setViewMode("preview");
      pushConsole("info", "Markdown preview updated.");
      return;
    }
    if (/\.(html|css|js|mjs|json)$/i.test(selectedFile.path)) {
      setViewMode("split");
      setPreviewNonce((value) => value + 1);
      if (/\.json$/i.test(selectedFile.path)) {
        try {
          const parsed = JSON.parse(current);
          pushConsole("stdout", `JSON valid with ${Object.keys(parsed).length} top-level key(s).`);
        } catch (error) {
          pushConsole("stderr", `JSON parse error: ${(error as Error).message}`);
        }
      } else {
        pushConsole("info", `Rendered sandbox preview for ${selectedFile.path}`);
      }
      return;
    }
    pushConsole("stderr", "This file type needs a backend runtime/compiler. The current sandbox supports markdown and web files only.");
  };

  const handleCommit = async () => {
    if (!selectedFile || !commitMsg.trim() || !token) return;
    setCommitting(true);
    const ok = await commitFile(owner, repo, selectedFile.path, editContent, commitMsg.trim(), fileSha, branch);
    if (ok) {
      setFileContent(editContent);
      setEditing(false);
      setCommitMsg("");
      pushConsole("info", `Committed ${selectedFile.path} to ${branch}`);
    } else {
      pushConsole("stderr", "Commit failed. Check GitHub permissions.");
    }
    setCommitting(false);
  };

  const runConsoleCommand = () => {
    const command = consoleInput.trim();
    if (!command) return;
    pushConsole("input", command);
    setConsoleInput("");
    if (command === "help") {
      ["help", "run", "preview", "info", "clear"].forEach((item) => pushConsole("info", item));
      return;
    }
    if (command === "clear") {
      setConsoleLines([]);
      return;
    }
    if (command === "run") {
      runFile();
      return;
    }
    if (command === "preview") {
      setPreviewNonce((value) => value + 1);
      pushConsole("info", "Preview reloaded.");
      return;
    }
    if (command === "info") {
      pushConsole("info", `${owner}/${repo} on ${branch}`);
      pushConsole("info", selectedFile ? selectedFile.path : "No file selected");
      return;
    }
    pushConsole("stderr", `Unknown command: ${command}`);
  };

  const getChildren = (parentPath: string) => tree.filter((node) => {
    const relative = parentPath ? node.path.slice(parentPath.length + 1) : node.path;
    return node.path.startsWith(parentPath ? `${parentPath}/` : "") && !relative.includes("/");
  });

  const renderTree = (parentPath = "", depth = 0): React.ReactNode => getChildren(parentPath).map((node) => {
    const isOpen = expanded.has(node.path);
    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (node.type === "tree") {
              setExpanded((prev) => {
                const next = new Set(prev);
                if (next.has(node.path)) next.delete(node.path);
                else next.add(node.path);
                return next;
              });
            } else {
              void openFile(node);
            }
          }}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          className={`w-full flex items-center gap-1.5 py-1.5 pr-2 text-left hover:bg-muted rounded-lg text-xs ${selectedFile?.path === node.path ? "bg-primary/10 text-primary" : "text-foreground"}`}
        >
          {node.type === "tree" ? (isOpen ? <FolderOpen className="h-3.5 w-3.5 text-yellow-500" /> : <Folder className="h-3.5 w-3.5 text-yellow-500" />) : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="truncate">{node.name}</span>
          {node.type === "tree" && (isOpen ? <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" /> : <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />)}
        </button>
        {node.type === "tree" && isOpen && renderTree(node.path, depth + 1)}
      </div>
    );
  });

  const currentContent = editing ? editContent : fileContent;
  const ext = selectedFile?.name.split(".").pop()?.toLowerCase() || "";
  const language = EXT_LANG[ext] || "text";
  const previewEnabled = !!selectedFile && (/\.(md|html|css|js|mjs|json)$/i.test(selectedFile.path));
  const isMarkdown = !!selectedFile && /\.md$/i.test(selectedFile.path);
  const showCode = viewMode === "code" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";
  const preview = selectedFile ? previewDoc(selectedFile.path, currentContent) : "";
  const markdownPreview = useMemo(() => isMarkdown ? markdownBlocks(currentContent) : null, [currentContent, isMarkdown]);

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background" : "h-full w-[980px] border-l border-border bg-background shrink-0"}>
      <div className="h-full flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-card/80">
          <svg className="h-4 w-4 text-foreground shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{owner}/{repo}</p>
            <p className="text-[11px] text-muted-foreground truncate">README preview, fullscreen editing, sandbox run surface, and integrated console</p>
          </div>
          <select value={branch} onChange={(e) => { setBranch(e.target.value); setSelectedFile(null); }} className="text-xs bg-muted text-foreground rounded-lg px-2 py-1 outline-none border border-border">
            {branches.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>
          <button onClick={() => setFullscreen((value) => !value)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">{fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 shrink-0 border-r border-border bg-card/40 overflow-y-auto py-2 px-1">
            {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading files...</p> : renderTree()}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedFile ? (
              <>
                <div className="px-3 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/40">
                  <span className="text-xs text-muted-foreground flex-1 truncate font-mono">{selectedFile.path}</span>
                  <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
                    <button onClick={() => setViewMode("code")} className={`h-7 px-2 rounded-lg text-[11px] ${viewMode === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>Code</button>
                    <button onClick={() => setViewMode("preview")} disabled={!previewEnabled} className={`h-7 px-2 rounded-lg text-[11px] flex items-center gap-1 ${viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"} disabled:opacity-40`}><Eye className="h-3.5 w-3.5" />Preview</button>
                    <button onClick={() => setViewMode("split")} disabled={!previewEnabled} className={`h-7 px-2 rounded-lg text-[11px] ${viewMode === "split" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"} disabled:opacity-40`}>Split</button>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(currentContent); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">{copied ? "Copied" : <><Copy className="h-3.5 w-3.5" />Copy</>}</button>
                  <button onClick={runFile} className="flex items-center gap-1 text-xs text-primary hover:opacity-80"><Play className="h-3.5 w-3.5" />Run</button>
                  {token && <button onClick={() => setEditing((value) => !value)} className="flex items-center gap-1 text-xs text-primary hover:opacity-80"><Pencil className="h-3.5 w-3.5" />{editing ? "Preview edits" : "Edit"}</button>}
                </div>

                {editing && editContent !== fileContent && (
                  <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                    <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />
                    <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCommit()} placeholder="Commit message..." className="flex-1 bg-muted text-xs text-foreground rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary" />
                    <button onClick={handleCommit} disabled={!commitMsg.trim() || committing} className="flex items-center gap-1 text-xs gradient-primary text-white px-3 py-1.5 rounded-lg disabled:opacity-40"><Save className="h-3 w-3" />{committing ? "Committing..." : "Commit"}</button>
                  </div>
                )}

                <div className="flex-1 flex overflow-hidden">
                  {showCode && (
                    <div className={`${showPreview ? "w-1/2 border-r border-border" : "w-full"} overflow-auto`}>
                      {loadingFile ? <p className="text-xs text-muted-foreground text-center py-8">Loading file...</p> : editing ? (
                        <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-full bg-[#0f172a] text-[#dbeafe] text-xs font-mono p-4 outline-none resize-none leading-6" style={{ minHeight: "100%", tabSize: 2 }} spellCheck={false} />
                      ) : (
                        <Highlight theme={themes.nightOwl} code={currentContent} language={language}>
                          {({ className, style, tokens, getLineProps, getTokenProps }) => (
                            <pre className={`${className} text-xs p-4 m-0 min-h-full`} style={{ ...style, background: "#0f172a", fontSize: "11px" }}>
                              {tokens.map((line, index) => (
                                <div key={index} {...getLineProps({ line })} className="flex">
                                  <span className="select-none text-white/20 mr-4 text-[10px] w-8 text-right shrink-0">{index + 1}</span>
                                  <span>{line.map((token, tokenIndex) => <span key={tokenIndex} {...getTokenProps({ token })} />)}</span>
                                </div>
                              ))}
                            </pre>
                          )}
                        </Highlight>
                      )}
                    </div>
                  )}

                  {showPreview && (
                    <div className={`${showCode ? "w-1/2" : "w-full"} overflow-auto bg-card/30`}>
                      {isMarkdown ? (
                        <div className="max-w-4xl px-6 py-6 space-y-4">{markdownPreview}</div>
                      ) : preview ? (
                        <iframe key={`${selectedFile.path}-${previewNonce}-${editing ? "edit" : "view"}`} title="Preview sandbox" sandbox="allow-scripts" className="h-full w-full border-0 bg-white" srcDoc={preview} />
                      ) : (
                        <div className="h-full flex items-center justify-center px-6 text-center text-xs text-muted-foreground">This file type can be edited and committed here, but true compilation or execution needs a backend runtime.</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-44 border-t border-border bg-[#090d18] text-slate-200 flex flex-col">
                  <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 text-xs"><TerminalSquare className="h-4 w-4 text-primary" />Console</div>
                  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 text-xs font-mono">
                    {consoleLines.map((line) => <div key={line.id} className={line.kind === "stderr" ? "text-rose-300" : line.kind === "stdout" ? "text-emerald-300" : line.kind === "input" ? "text-sky-300" : "text-slate-400"}>{line.kind === "input" ? "> " : ""}{line.text}</div>)}
                    <div ref={consoleEndRef} />
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-2">
                      <span className="text-sky-300 font-mono text-xs">&gt;</span>
                      <input value={consoleInput} onChange={(e) => setConsoleInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runConsoleCommand()} placeholder="help | run | preview | info | clear" className="flex-1 bg-transparent text-xs text-white outline-none" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                <FileText className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-medium text-foreground">Select a file to open the IDE workspace</p>
                  <p className="text-xs text-muted-foreground mt-1">README files preview nicely, web files can run in the sandbox, and edits can be committed directly to GitHub.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-8 border-t border-border bg-card/80 px-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{owner}/{repo}</span>
            <span>{branch}</span>
            {selectedFile && <span>{selectedFile.path}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span>{editing ? "Editing" : "Read only"}</span>
            <span>{previewEnabled ? "Preview enabled" : "Source view"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoFileBrowser;
