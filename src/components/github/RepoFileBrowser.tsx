import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  ChevronDown, ChevronRight, Copy, Download, Eye, ExternalLink, FileText, Folder, FolderOpen, 
  GitCommit, Maximize2, Menu, Minimize2, Pencil, Play, Save, TerminalSquare, X, 
  Files, Search, GitBranch, Settings, User, Bug, PlayCircle, Code2, Monitor, Info, Check, AlertCircle, FileCode, FileJson, FilePlus, FolderPlus, RefreshCw, MoreVertical, Layout, PanelLeft, PanelBottom, Sidebar, Trash2, Package, Globe, ArrowLeft, ArrowRight, RotateCw
} from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import type { Language } from "prism-react-renderer";
import { useGithub } from "@/hooks/useGithub";
import type { WorkspaceProject } from "@/hooks/useWorkspace";
import { useThemeContext } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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

interface Tab {
  path: string;
  name: string;
  sha: string;
  content: string;
  editContent: string;
  isModified: boolean;
  loading: boolean;
}

interface Props {
  owner: string;
  repo: string;
  defaultBranch: string;
  projects?: WorkspaceProject[];
  onImportToProject?: (projectId: string, repoFullName: string, branchName: string, filePath: string, fileSha?: string | null) => Promise<void> | void;
  onClose: () => void;
  fullMode?: boolean;
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

const getFileIcon = (name: string, isOpen?: boolean) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (name === "package.json") return <FileJson className="h-4 w-4 text-[#cbcb41]" />;
  if (name === "tsconfig.json") return <FileJson className="h-4 w-4 text-[#3178c6]" />;
  if (ext === "ts" || ext === "tsx") return <FileCode className="h-4 w-4 text-[#3178c6]" />;
  if (ext === "js" || ext === "jsx") return <FileCode className="h-4 w-4 text-[#f7df1e]" />;
  if (ext === "html") return <Code2 className="h-4 w-4 text-[#e34f26]" />;
  if (ext === "css") return <Code2 className="h-4 w-4 text-[#1572b6]" />;
  if (ext === "json") return <FileJson className="h-4 w-4 text-[#cbcb41]" />;
  if (ext === "md") return <FileText className="h-4 w-4 text-[#007acc]" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const decodeGithubContent = (content: string) => decodeURIComponent(escape(atob(content.replace(/\n/g, ""))));

const markdownBlocks = (content: string) => {
  const lines = content.split("\n");
  return lines.map((line, index) => {
    if (!line.trim()) return <div key={`s-${index}`} className="h-2" />;
    if (line.startsWith("# ")) return <h1 key={index} className="text-3xl font-semibold mb-4 text-foreground">{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={index} className="text-2xl font-semibold mb-3 text-foreground">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={index} className="text-xl font-semibold mb-2 text-foreground">{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <li key={index} className="ml-5 list-disc mb-1 text-foreground/80">{line.slice(2)}</li>;
    if (line.startsWith("> ")) return <blockquote key={index} className="border-l-4 border-primary/50 pl-4 py-1 italic text-muted-foreground bg-muted/30 my-2 rounded-r">{line.slice(2)}</blockquote>;
    return <p key={index} className="whitespace-pre-wrap text-sm leading-7 text-foreground/90 mb-2">{line}</p>;
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
      return `<!doctype html><html><body style="margin:0;background:#1e1e1e;color:#d4d4d4;padding:16px;font-family:ui-monospace,monospace"><pre>${JSON.stringify(JSON.parse(content), null, 2)}</pre></body></html>`;
    } catch {
      return "";
    }
  }
  return "";
};

const RepoFileBrowser = ({ owner, repo, defaultBranch, projects = [], onImportToProject, onClose, fullMode = false }: Props) => {
  const { token, commitFile } = useGithub();
  const { mode } = useThemeContext();
  const navigate = useNavigate();
  
  // Workspace State
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<string[]>([]);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"explorer" | "search" | "git">("explorer");
  const [showTerminal, setShowTerminal] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [fullscreen, setFullscreen] = useState(fullMode);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("code");
  const [commitMsg, setCommitMsg] = useState("");
  const [committing, setCommitting] = useState(false);
  const [consoleInput, setConsoleInput] = useState("");
  const [previewNonce, setPreviewNonce] = useState(0);
  const [newItemParent, setNewItemParent] = useState<string | null>(null);
  const [newItemType, setNewItemType] = useState<"file" | "folder">("file");
  const [newItemName, setNewItemName] = useState("");
  const [creatingItem, setCreatingItem] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [terminalTab, setTerminalTab] = useState<"terminal" | "npm" | "browser">("terminal");
  const [npmInput, setNpmInput] = useState("");
  const [npmLines, setNpmLines] = useState<ConsoleLine[]>([
    { id: "npm-boot", kind: "info", text: "npm sandbox — commands: install <pkg>, uninstall <pkg>, list, clear" },
  ]);
  const [browserUrl, setBrowserUrl] = useState("https://chatflowv.vercel.app");
  const [browserInput, setBrowserInput] = useState("https://chatflowv.vercel.app");
  const [browserKey, setBrowserKey] = useState(0);
  const [goLiveUrl, setGoLiveUrl] = useState<string | null>(null);
  const npmEndRef = useRef<HTMLDivElement>(null);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([
    { id: "boot", kind: "info", text: "Sandbox ready. Commands: help, run, preview, info, clear" },
  ]);
  
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const activeTab = useMemo(() => tabs.find(t => t.path === activeTabPath), [tabs, activeTabPath]);

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

  const fetchRepoData = useCallback(async () => {
    setLoading(true);
    try {
      const [treeData, branchData] = await Promise.all([
        ghFetch<TreeResponse>(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`),
        ghFetch<BranchResponse[]>(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=30`),
      ]);
      setTree((treeData.tree || []).filter((node) => node.type === "blob" || node.type === "tree").map((node) => ({
        path: node.path,
        name: node.path.split("/").pop() || node.path,
        type: node.type,
        sha: node.sha,
        url: node.url,
      })));
      setBranches(branchData.map((item) => item.name));
    } catch (err) {
      pushConsole("stderr", "Failed to pull from source.");
    } finally {
      setLoading(false);
    }
  }, [owner, repo, branch, ghFetch]);

  useEffect(() => {
    void fetchRepoData();
  }, [fetchRepoData]);

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
    
    // Check if already open
    const existingTab = tabs.find(t => t.path === node.path);
    if (existingTab) {
      setActiveTabPath(node.path);
      return;
    }

    const newTab: Tab = {
      path: node.path,
      name: node.name,
      sha: node.sha,
      content: "",
      editContent: "",
      isModified: false,
      loading: true
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabPath(node.path);

    try {
      const data = await ghFetch<ContentResponse>(`https://api.github.com/repos/${owner}/${repo}/contents/${node.path}?ref=${branch}`);
      const content = decodeGithubContent(data.content);
      
      setTabs(prev => prev.map(t => t.path === node.path ? {
        ...t,
        content,
        editContent: content,
        sha: data.sha,
        loading: false
      } : t));
      
      if (/README|\.md$/i.test(node.path)) {
        setViewMode("preview");
      }
      pushConsole("info", `Opened ${node.path}`);
    } catch {
      setTabs(prev => prev.map(t => t.path === node.path ? {
        ...t,
        content: "// Could not load file",
        editContent: "// Could not load file",
        loading: false
      } : t));
      pushConsole("stderr", `Could not load ${node.path}`);
    }
  };

  const closeTab = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tabIndex = tabs.findIndex(t => t.path === path);
    const newTabs = tabs.filter(t => t.path !== path);
    setTabs(newTabs);
    
    if (activeTabPath === path) {
      if (newTabs.length > 0) {
        const nextTab = newTabs[Math.min(tabIndex, newTabs.length - 1)];
        setActiveTabPath(nextTab.path);
      } else {
        setActiveTabPath(null);
      }
    }
  };

  const updateActiveTabContent = (value: string) => {
    if (!activeTabPath) return;
    setTabs(prev => prev.map(t => t.path === activeTabPath ? {
      ...t,
      editContent: value,
      isModified: value !== t.content
    } : t));
  };

  const runFile = () => {
    if (!activeTab) {
      pushConsole("stderr", "No file selected.");
      return;
    }
    pushConsole("input", `run ${activeTab.path}`);
    if (/\.md$/i.test(activeTab.path)) {
      setViewMode("preview");
      pushConsole("info", "Markdown preview updated.");
      return;
    }
    if (/\.(html|css|js|mjs|json)$/i.test(activeTab.path)) {
      setViewMode("split");
      setPreviewNonce((value) => value + 1);
      if (/\.json$/i.test(activeTab.path)) {
        try {
          const parsed = JSON.parse(activeTab.editContent);
          pushConsole("stdout", `JSON valid with ${Object.keys(parsed).length} top-level key(s).`);
        } catch (error) {
          pushConsole("stderr", `JSON parse error: ${(error as Error).message}`);
        }
      } else {
        pushConsole("info", `Rendered sandbox preview for ${activeTab.path}`);
      }
      return;
    }
    pushConsole("stderr", "This file type needs a backend runtime/compiler. The current sandbox supports markdown and web files only.");
  };

  const handleCommit = async () => {
    if (!activeTab || !commitMsg.trim() || !token) return;
    setCommitting(true);
    const ok = await commitFile(owner, repo, activeTab.path, activeTab.editContent, commitMsg.trim(), activeTab.sha, branch);
    if (ok) {
      setTabs(prev => prev.map(t => t.path === activeTab.path ? {
        ...t,
        content: t.editContent,
        isModified: false
      } : t));
      setCommitMsg("");
      pushConsole("info", `Committed ${activeTab.path} to ${branch}`);
    } else {
      pushConsole("stderr", "Commit failed. Check GitHub permissions.");
    }
    setCommitting(false);
  };

  const deleteFile = async (node: TreeNode) => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${node.path}`, {
        method: "DELETE",
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Delete ${node.path}`, sha: node.sha, branch }),
      });
      if (res.ok) {
        pushConsole("info", `Deleted ${node.path}`);
        closeTab(node.path);
        await fetchRepoData();
      } else {
        pushConsole("stderr", `Failed to delete ${node.path}`);
      }
    } catch {
      pushConsole("stderr", `Error deleting ${node.path}`);
    }
    setDeleting(false);
    setDeleteConfirm(null);
  };

  const runNpmCommand = () => {
    const cmd = npmInput.trim();
    if (!cmd) return;
    const pushNpm = (kind: ConsoleLine["kind"], text: string) =>
      setNpmLines(prev => [...prev, { id: `${Date.now()}-${prev.length}`, kind, text }]);
    pushNpm("input", `$ npm ${cmd}`);
    setNpmInput("");
    const [action, ...args] = cmd.split(" ");
    if (action === "clear") { setNpmLines([]); return; }
    if (action === "list") {
      const pkgNode = tree.find(n => n.name === "package.json" && !n.path.includes("/"));
      if (!pkgNode) { pushNpm("stderr", "No package.json found at root"); return; }
      const tab = tabs.find(t => t.path === pkgNode.path);
      if (tab?.content) {
        try {
          const pkg = JSON.parse(tab.content) as { dependencies?: Record<string,string>; devDependencies?: Record<string,string> };
          const deps = Object.keys(pkg.dependencies || {});
          const dev = Object.keys(pkg.devDependencies || {});
          if (deps.length) { pushNpm("info", "dependencies:"); deps.forEach(d => pushNpm("stdout", `  ${d}`)); }
          if (dev.length) { pushNpm("info", "devDependencies:"); dev.forEach(d => pushNpm("stdout", `  ${d}`)); }
          if (!deps.length && !dev.length) pushNpm("info", "No dependencies found");
        } catch { pushNpm("stderr", "Could not parse package.json"); }
      } else {
        pushNpm("info", "Open package.json first to list dependencies");
      }
      return;
    }
    if (action === "install" || action === "i") {
      const pkg = args[0];
      if (!pkg) { pushNpm("stderr", "Usage: install <package-name>"); return; }
      pushNpm("info", `Simulating: npm install ${pkg}`);
      pushNpm("stdout", `added ${pkg} (sandbox — no actual install runs in browser)`);
      pushNpm("info", "To actually install, run this in your local terminal.");
      return;
    }
    if (action === "uninstall" || action === "un") {
      const pkg = args[0];
      if (!pkg) { pushNpm("stderr", "Usage: uninstall <package-name>"); return; }
      pushNpm("info", `Simulating: npm uninstall ${pkg}`);
      pushNpm("stdout", `removed ${pkg} (sandbox)`);
      return;
    }
    pushNpm("stderr", `Unknown: npm ${cmd}. Try: install <pkg>, uninstall <pkg>, list, clear`);
  };

  const goLive = () => {
    if (!activeTab) return;
    const doc = previewDoc(activeTab.path, activeTab.editContent);
    if (!doc) { pushConsole("stderr", "Go Live only supports html/css/js files"); return; }
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setGoLiveUrl(url);
    setTerminalTab("browser");
    setBrowserUrl(url);
    setBrowserInput(url);
    setBrowserKey(k => k + 1);
    pushConsole("info", "Go Live: opened in mini browser");
  };

  const startNewItem = (type: "file" | "folder", parentPath: string) => {
    setNewItemType(type);
    setNewItemParent(parentPath);
    setNewItemName("");
    setActiveSidebarTab("explorer");
    setShowSidebar(true);
  };

  const createNewItem = async () => {
    if (!newItemName.trim() || !token) return;
    setCreatingItem(true);
    const parent = newItemParent === "root" ? "" : newItemParent + "/";
    const filePath = newItemType === "folder"
      ? `${parent}${newItemName.trim()}/.gitkeep`
      : `${parent}${newItemName.trim()}`;
    const encoded = btoa("");
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: "PUT",
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Create ${filePath}`, content: encoded, branch }),
      });
      if (res.ok) {
        pushConsole("info", `Created ${filePath}`);
        setNewItemParent(null);
        setNewItemName("");
        await fetchRepoData();
        if (newItemType === "folder") {
          const folderPath = `${parent}${newItemName.trim()}`;
          setExpanded(prev => new Set([...prev, folderPath]));
        } else {
          const data = await res.json() as { content: { sha: string } };
          const name = filePath.split("/").pop() || filePath;
          const newTab: Tab = { path: filePath, name, sha: data.content.sha, content: "", editContent: "", isModified: false, loading: false };
          setTabs(prev => [...prev, newTab]);
          setActiveTabPath(filePath);
        }
      } else {
        pushConsole("stderr", `Failed to create ${filePath}. Check token permissions.`);
      }
    } catch {
      pushConsole("stderr", `Error creating ${filePath}`);
    }
    setCreatingItem(false);
  };

  useEffect(() => { npmEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [npmLines]);

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
      pushConsole("info", activeTab ? activeTab.path : "No file selected");
      return;
    }
    pushConsole("stderr", `Unknown command: ${command}. Try: help, run, preview, info, clear`);
  };

  const getChildren = (parentPath: string) => tree.filter((node) => {
    if (parentPath === "root") {
      return !node.path.includes("/");
    }
    const relative = node.path.slice(parentPath.length + 1);
    return node.path.startsWith(`${parentPath}/`) && !relative.includes("/");
  });

  const renderTree = (parentPath = "root", depth = 0): React.ReactNode => getChildren(parentPath).map((node) => {
    const isOpen = expanded.has(node.path);
    const isActive = activeTabPath === node.path;
    return (
      <div key={node.path}>
        <div
          className={cn(
            "w-full flex items-center gap-2 py-1 px-3 text-left hover:bg-muted/40 transition-all rounded-lg group mb-0.5 cursor-pointer",
            isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground/70"
          )}
          style={{ paddingLeft: `${depth * 12 + 16}px` }}
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
        >
          {node.type === "tree" ? (
            <>
              {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              {isOpen ? <FolderOpen className="h-4 w-4 text-primary/80 shrink-0" /> : <Folder className="h-4 w-4 text-primary/80 shrink-0" />}
            </>
          ) : (
            <>
              <span className="w-3.5" />
              <div className="shrink-0">{getFileIcon(node.name)}</div>
            </>
          )}
          <span className="truncate text-[13px] flex-1">{node.name}</span>
          <div className="hidden group-hover:flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            {node.type === "tree" && (
              <>
                <button onClick={() => startNewItem("file", node.path)} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground" title="New File"><FilePlus className="h-3 w-3" /></button>
                <button onClick={() => startNewItem("folder", node.path)} className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground" title="New Folder"><FolderPlus className="h-3 w-3" /></button>
              </>
            )}
            {node.type === "blob" && token && (
              deleteConfirm === node.path ? (
                <>
                  <button onClick={() => void deleteFile(node)} disabled={deleting} className="p-1 rounded text-rose-500 hover:bg-rose-500/10 text-[10px] font-bold" title="Confirm delete">{deleting ? <RefreshCw className="h-3 w-3 animate-spin" /> : "del?"}</button>
                  <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </>
              ) : (
                <button onClick={() => setDeleteConfirm(node.path)} className="p-1 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500" title="Delete file"><Trash2 className="h-3 w-3" /></button>
              )
            )}
          </div>
        </div>
        {node.type === "tree" && isOpen && (
          <>
            {newItemParent === node.path && (
              <div className="flex items-center gap-1.5 bg-muted/40 rounded-xl px-3 py-2 mx-2 mb-1" style={{ marginLeft: `${(depth + 1) * 12 + 8}px` }}>
                {newItemType === "file" ? <FilePlus className="h-3.5 w-3.5 text-primary shrink-0" /> : <FolderPlus className="h-3.5 w-3.5 text-primary shrink-0" />}
                <input
                  autoFocus
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void createNewItem(); if (e.key === "Escape") setNewItemParent(null); }}
                  placeholder={newItemType === "file" ? "filename.ts" : "folder-name"}
                  className="flex-1 bg-transparent text-xs text-foreground outline-none font-mono"
                />
                <button onClick={() => void createNewItem()} disabled={!newItemName.trim() || creatingItem} className="text-primary disabled:opacity-40">
                  {creatingItem ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </button>
                <button onClick={() => setNewItemParent(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
              </div>
            )}
            {renderTree(node.path, depth + 1)}
          </>
        )}
      </div>
    );
  });

  const editorTheme = mode === "light" ? themes.github : themes.nightOwl;

  return (
    <div className={cn(
      "flex flex-col overflow-hidden bg-background/95 backdrop-blur-xl text-foreground font-sans selection:bg-primary/30 border border-border/50 transition-all duration-300 shadow-2xl",
      fullscreen ? "fixed inset-0 z-50 rounded-none" : "h-full w-full rounded-[28px]"
    )}>
      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-14 bg-muted/40 backdrop-blur-md flex flex-col items-center py-6 gap-5 shrink-0 border-r border-border/40">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/20">
            <Code2 className="h-5 w-5 text-white" />
          </div>
          <button 
            onClick={() => { setActiveSidebarTab("explorer"); setShowSidebar(true); }}
            className={cn("p-2.5 rounded-xl transition-all duration-200", activeSidebarTab === "explorer" && showSidebar ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <Files className="h-5 w-5" />
          </button>
          <button 
            onClick={() => { setActiveSidebarTab("search"); setShowSidebar(true); }}
            className={cn("p-2.5 rounded-xl transition-all duration-200", activeSidebarTab === "search" && showSidebar ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <Search className="h-5 w-5" />
          </button>
          <button 
            onClick={() => { setActiveSidebarTab("git"); setShowSidebar(true); }}
            className={cn("p-2.5 rounded-xl transition-all duration-200", activeSidebarTab === "git" && showSidebar ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            <GitBranch className="h-5 w-5" />
          </button>
          <div className="mt-auto flex flex-col gap-4 mb-4">
            {!fullscreen && (
              <button 
                onClick={() => navigate(`/editor/${owner}/${repo}/${branch}`)} 
                title="Open in Full Editor"
                className="p-2.5 text-primary hover:bg-primary/10 rounded-xl transition-all"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            )}
            <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"><User className="h-5 w-5" /></button>
            <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"><Settings className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-card/30 border-r border-border/40 flex flex-col shrink-0"
            >
              <div className="h-14 flex items-center justify-between px-5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                <span>{activeSidebarTab}</span>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-muted rounded-lg transition-colors"><RefreshCw className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setShowSidebar(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-2">
                {activeSidebarTab === "explorer" && (
                  <div className="py-2">
                    <div className="px-3 py-2 flex items-center justify-between group rounded-xl hover:bg-muted/30 transition-colors mb-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/80">
                        <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center">
                          <ChevronDown className="h-3 w-3 text-primary" />
                        </div>
                        <span>{repo.toUpperCase()}</span>
                      </div>
                      <div className="hidden group-hover:flex gap-1">
                        <button onClick={() => startNewItem("file", "root")} className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground" title="New File"><FilePlus className="h-3.5 w-3.5" /></button>
                        <button onClick={() => startNewItem("folder", "root")} className="p-1.5 hover:bg-background rounded-lg text-muted-foreground hover:text-foreground" title="New Folder"><FolderPlus className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {newItemParent !== null && (
                      <div className="mx-2 mb-2 flex items-center gap-1.5 bg-muted/40 rounded-xl px-3 py-2">
                        {newItemType === "file" ? <FilePlus className="h-3.5 w-3.5 text-primary shrink-0" /> : <FolderPlus className="h-3.5 w-3.5 text-primary shrink-0" />}
                        <input
                          autoFocus
                          value={newItemName}
                          onChange={e => setNewItemName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") void createNewItem(); if (e.key === "Escape") setNewItemParent(null); }}
                          placeholder={newItemType === "file" ? "filename.ts" : "folder-name"}
                          className="flex-1 bg-transparent text-xs text-foreground outline-none font-mono"
                        />
                        <button onClick={() => void createNewItem()} disabled={!newItemName.trim() || creatingItem} className="text-primary disabled:opacity-40">
                          {creatingItem ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </button>
                        <button onClick={() => setNewItemParent(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    {loading ? (
                      <div className="p-3 flex flex-col gap-2">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-5 bg-muted/40 animate-pulse rounded-lg w-full" />)}
                      </div>
                    ) : (
                      renderTree()
                    )}
                  </div>
                )}

                {activeSidebarTab === "git" && (
                  <div className="p-4 space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <GitCommit className="h-4 w-4 text-primary" />
                        <p className="text-[11px] text-foreground font-bold uppercase tracking-wider">Source Control</p>
                      </div>
                      <div className="bg-muted/40 border border-border/50 rounded-2xl p-4 space-y-4">
                        {tabs.filter(t => t.isModified).length > 0 ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] text-muted-foreground">{tabs.filter(t => t.isModified).length} files changed</p>
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            </div>
                            <textarea 
                              value={commitMsg}
                              onChange={(e) => setCommitMsg(e.target.value)}
                              placeholder="What did you change?"
                              className="w-full bg-background/50 border border-border/50 rounded-xl p-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/30 resize-none h-24 transition-all"
                            />
                            <button 
                              onClick={handleCommit}
                              disabled={committing || !commitMsg.trim()}
                              className="w-full gradient-primary hover:opacity-90 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 font-medium text-sm shadow-lg shadow-primary/10"
                            >
                              {committing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GitCommit className="h-4 w-4" />}
                              Commit and Push
                            </button>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <Check className="h-8 w-8 text-primary/20 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground italic">No changes to commit</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Branch Selector at bottom of sidebar */}
              <div className="mt-auto p-4 border-t border-border/20">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pl-1">Branch</p>
                  <select 
                    value={branch} 
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-muted/50 text-xs text-foreground font-medium border border-border/50 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary/20 appearance-none"
                  >
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background/50">
          {/* Tab Bar */}
          <div className="h-14 bg-muted/20 flex overflow-x-auto scrollbar-hide border-b border-border/40 items-center px-2 gap-1">
            {tabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className={cn(
                  "group flex items-center gap-2.5 px-4 py-2 rounded-xl cursor-pointer min-w-[140px] max-w-[220px] transition-all duration-200 relative",
                  activeTabPath === tab.path ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {activeTabPath === tab.path && <div className="absolute -bottom-[1px] left-4 right-4 h-[2px] bg-primary rounded-full" />}
                <div className="shrink-0">{getFileIcon(tab.name)}</div>
                <span className={cn("text-xs font-medium truncate flex-1", tab.isModified && "text-primary italic")}>
                  {tab.name}{tab.isModified ? "*" : ""}
                </span>
                <button 
                  onClick={(e) => closeTab(tab.path, e)}
                  className="p-1 rounded-lg hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Breadcrumbs & Actions */}
          {activeTab && (
            <div className="h-10 flex items-center px-6 text-[11px] text-muted-foreground gap-1 bg-background/30 border-b border-border/20">
              <div className="flex items-center gap-1 overflow-hidden">
                <span 
                  onClick={() => { setActiveSidebarTab("explorer"); setShowSidebar(true); }}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  {owner}
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
                <span 
                  onClick={() => { setActiveSidebarTab("explorer"); setShowSidebar(true); }}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  {repo}
                </span>
                <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
                {activeTab.path.split("/").map((part, i, arr) => {
                  const pathUpToNow = arr.slice(0, i + 1).join("/");
                  const isLast = i === arr.length - 1;
                  
                  return (
                    <div key={`${part}-${i}`} className="flex items-center gap-1">
                      <span 
                        onClick={() => {
                          if (!isLast) {
                            setExpanded(prev => {
                              const next = new Set(prev);
                              next.add(pathUpToNow);
                              return next;
                            });
                            setActiveSidebarTab("explorer");
                            setShowSidebar(true);
                          }
                        }}
                        className={cn("truncate", isLast ? "text-foreground font-semibold" : "hover:text-primary transition-colors cursor-pointer")}
                      >
                        {part}
                      </span>
                      {!isLast && <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />}
                    </div>
                  );
                })}
              </div>
              
              <div className="ml-auto flex items-center gap-4">
                <button 
                  onClick={() => {
                    void fetchRepoData();
                    pushConsole("info", "Pulling from source...");
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium border border-primary/20"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                  <span>Pull from Source</span>
                </button>
                <button 
                  onClick={runFile} 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all font-bold"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Run</span>
                </button>
                <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/40">
                  <button onClick={() => setViewMode("code")} className={cn("p-1.5 rounded-md transition-all", viewMode === "code" ? "bg-background text-primary shadow-sm" : "hover:text-foreground")} title="Code"><Code2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setViewMode("split")} className={cn("p-1.5 rounded-md transition-all", viewMode === "split" ? "bg-background text-primary shadow-sm" : "hover:text-foreground")} title="Split View"><Layout className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setViewMode("preview")} className={cn("p-1.5 rounded-md transition-all", viewMode === "preview" ? "bg-background text-primary shadow-sm" : "hover:text-foreground")} title="Preview"><Eye className="h-3.5 w-3.5" /></button>
                </div>
                <div className="h-4 w-[1px] bg-border/40 mx-1" />
                <button onClick={() => setFullscreen(!fullscreen)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all">
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button onClick={onClose} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-500 transition-all">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Editor/Preview Surface */}
          <div className="flex-1 flex overflow-hidden relative">
            <PanelGroup direction="vertical">
              <Panel defaultSize={75} minSize={20}>
                <div className="h-full flex overflow-hidden">
                  {activeTab ? (
                    <>
                      {/* Code Editor */}
                      {(viewMode === "code" || viewMode === "split") && (
                        <div className={cn("relative flex-1 flex overflow-hidden bg-background/20", viewMode === "split" && "border-r border-border/40 shadow-inner")}>
                          {activeTab.loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm z-10">
                              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground animate-pulse tracking-widest uppercase">Fetching Source</span>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-auto flex">
                              <Highlight
                                theme={editorTheme}
                                code={activeTab.editContent}
                                language={EXT_LANG[activeTab.name.split(".").pop() || ""] || "text"}
                              >
                                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                                  <div className="relative flex-1 min-w-max">
                                    <pre className={cn(className, "m-0 p-6 font-mono text-[14px] outline-none min-w-full leading-relaxed")} style={{ ...style, backgroundColor: "transparent" }}>
                                      {tokens.map((line, i) => (
                                        <div key={i} {...getLineProps({ line, key: i })} className="flex group/line">
                                          <span className="w-12 text-right pr-6 select-none opacity-20 group-hover/line:opacity-50 text-[11px] shrink-0 font-medium transition-opacity">{i + 1}</span>
                                          <span className="flex-1">
                                            {line.map((token, key) => (
                                              <span key={key} {...getTokenProps({ token, key })} />
                                            ))}
                                          </span>
                                        </div>
                                      ))}
                                    </pre>
                                    <textarea
                                      value={activeTab.editContent}
                                      onChange={(e) => updateActiveTabContent(e.target.value)}
                                      className="absolute inset-0 w-full h-full p-6 pl-[4.5rem] bg-transparent text-transparent caret-primary resize-none outline-none font-mono text-[14px] leading-relaxed z-10 overflow-auto"
                                      spellCheck={false}
                                    />
                                  </div>
                                )}
                              </Highlight>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Preview Panel */}
                      {(viewMode === "preview" || viewMode === "split") && (
                        <div className="flex-1 overflow-auto bg-white text-slate-900 shadow-2xl">
                          {/\.md$/i.test(activeTab.path) ? (
                            <div className="max-w-4xl mx-auto px-12 py-12 prose prose-slate">
                              <div className="mb-8 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Markdown Preview</p>
                                <p className="text-xs font-mono text-slate-600 truncate">{activeTab.path}</p>
                              </div>
                              {markdownBlocks(activeTab.editContent)}
                            </div>
                          ) : previewDoc(activeTab.path, activeTab.editContent) ? (
                            <iframe 
                              key={`${activeTab.path}-${previewNonce}`} 
                              title="Preview" 
                              sandbox="allow-scripts" 
                              className="w-full h-full border-0" 
                              srcDoc={previewDoc(activeTab.path, activeTab.editContent)} 
                            />
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-muted/10">
                              <div className="h-16 w-16 rounded-3xl bg-muted/20 flex items-center justify-center mb-6">
                                <Info className="h-8 w-8 text-muted-foreground/40" />
                              </div>
                              <p className="text-sm font-semibold text-foreground">No preview available</p>
                              <p className="text-xs text-muted-foreground mt-2 max-w-[240px]">This file type can be edited but doesn't support live rendering in the sandbox.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                      <div className="relative group">
                        <div className="absolute -inset-8 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
                        <div className="h-28 w-28 rounded-[38px] border-2 border-primary/20 bg-background/50 flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-110">
                          <Code2 className="h-12 w-12 text-primary" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 z-20">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="max-w-md space-y-2 relative z-10">
                        <h3 className="text-xl font-bold text-foreground tracking-tight">ChatFlow Cloud Editor</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed px-10">
                          Open a file from the repository to start building. 
                          Your changes can be committed and pushed directly back to GitHub.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Panel>
              
              {showTerminal && (
                <>
                  <PanelResizeHandle className="h-[2px] bg-border/40 hover:bg-primary transition-colors cursor-row-resize" />
                  <Panel defaultSize={25} minSize={10}>
                    <div className="h-full bg-background/50 backdrop-blur-md flex flex-col border-t border-border/40">
                      <div className="h-12 flex items-center px-6 gap-6 border-b border-border/20">
                        <button className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-b-2 border-primary py-4">Terminal</button>
                        <div className="ml-auto flex items-center gap-2">
                          <button onClick={() => setShowTerminal(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-all"><X className="h-4 w-4" /></button>
                        </div>
                      </div>

                      {/* Terminal tabs */}
                      <div className="flex border-b border-border/20 px-4 gap-4">
                        {(["terminal", "npm", "browser"] as const).map(t => (
                          <button key={t} onClick={() => setTerminalTab(t)}
                            className={cn("text-[10px] font-black uppercase tracking-[0.15em] py-2.5 transition-colors flex items-center gap-1.5",
                              terminalTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
                            {t === "npm" && <Package className="h-3 w-3" />}
                            {t === "browser" && <Globe className="h-3 w-3" />}
                            {t}
                          </button>
                        ))}
                        <div className="ml-auto flex items-center gap-1 pb-1">
                          {terminalTab === "terminal" && <button onClick={() => setConsoleLines([])} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Clear"><RefreshCw className="h-3.5 w-3.5" /></button>}
                          {terminalTab === "npm" && <button onClick={() => setNpmLines([])} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Clear"><RefreshCw className="h-3.5 w-3.5" /></button>}
                        </div>
                      </div>

                      {/* Terminal */}
                      {terminalTab === "terminal" && (
                        <>
                          <div className="flex-1 overflow-y-auto px-6 py-4 font-mono text-[12px] space-y-2">
                            {consoleLines.map((line) => (
                              <div key={line.id} className={cn(
                                "flex gap-3 px-3 py-1.5 rounded-lg",
                                line.kind === "stderr" ? "bg-rose-500/5 text-rose-400" :
                                line.kind === "stdout" ? "bg-emerald-500/5 text-emerald-400" :
                                line.kind === "input" ? "bg-sky-500/5 text-sky-400 font-bold" : "text-muted-foreground"
                              )}>
                                {line.kind === "input" && <span className="opacity-40 tracking-tighter">{">>>"}</span>}
                                <span>{line.text}</span>
                              </div>
                            ))}
                            <div ref={consoleEndRef} />
                          </div>
                          <div className="p-4 px-6 border-t border-border/20 bg-muted/10 flex items-center gap-3">
                            <span className="text-sky-500 font-bold text-xs">$</span>
                            <input value={consoleInput} onChange={e => setConsoleInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && runConsoleCommand()}
                              placeholder="help, run, preview, info, clear"
                              className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground/50" />
                          </div>
                        </>
                      )}

                      {/* NPM */}
                      {terminalTab === "npm" && (
                        <>
                          <div className="flex-1 overflow-y-auto px-6 py-4 font-mono text-[12px] space-y-2">
                            {npmLines.map(line => (
                              <div key={line.id} className={cn(
                                "flex gap-3 px-3 py-1.5 rounded-lg",
                                line.kind === "stderr" ? "bg-rose-500/5 text-rose-400" :
                                line.kind === "stdout" ? "bg-emerald-500/5 text-emerald-400" :
                                line.kind === "input" ? "bg-amber-500/5 text-amber-400 font-bold" : "text-muted-foreground"
                              )}>
                                <span>{line.text}</span>
                              </div>
                            ))}
                            <div ref={npmEndRef} />
                          </div>
                          <div className="p-4 px-6 border-t border-border/20 bg-muted/10 flex items-center gap-3">
                            <Package className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="text-amber-500 font-bold text-xs shrink-0">npm</span>
                            <input value={npmInput} onChange={e => setNpmInput(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && runNpmCommand()}
                              placeholder="install <pkg>  |  uninstall <pkg>  |  list  |  clear"
                              className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground/50" />
                          </div>
                        </>
                      )}

                      {/* Mini Browser */}
                      {terminalTab === "browser" && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 bg-muted/10">
                            <button onClick={() => setBrowserKey(k => k + 1)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"><RotateCw className="h-3.5 w-3.5" /></button>
                            <input
                              value={browserInput}
                              onChange={e => setBrowserInput(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") { setBrowserUrl(browserInput); setBrowserKey(k => k + 1); } }}
                              className="flex-1 bg-muted/50 border border-border/40 rounded-lg px-3 py-1 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <a href={browserUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </div>
                          <iframe
                            key={browserKey}
                            src={browserUrl}
                            title="Mini Browser"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            className="flex-1 border-0 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </div>

          {/* Status Bar */}
          <div className="h-7 bg-primary text-white flex items-center justify-between px-4 text-[10px] shrink-0 font-bold tracking-wider">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 hover:bg-white/10 px-2 py-0.5 rounded-lg cursor-pointer transition-colors">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{branch}</span>
                <Check className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-3 hover:bg-white/10 px-2 py-0.5 rounded-lg cursor-pointer transition-colors">
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bug className="h-3.5 w-3.5" />
                  <span>0</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {activeTab && (
                <div className="hidden sm:flex items-center gap-4">
                  <span className="hover:bg-white/10 px-2 py-0.5 rounded-lg cursor-pointer transition-colors uppercase">{EXT_LANG[activeTab.name.split(".").pop() || ""] || "Plain Text"}</span>
                  <div onClick={goLive} className="flex items-center gap-2 hover:bg-white/10 px-2 py-0.5 rounded-lg cursor-pointer transition-colors">
                    <Monitor className="h-3.5 w-3.5" />
                    <span>Go Live</span>
                  </div>
                </div>
              )}
              <div 
                className={cn("flex items-center gap-2 px-2 py-0.5 rounded-lg cursor-pointer transition-colors", showTerminal ? "bg-white/20" : "hover:bg-white/10")} 
                onClick={() => setShowTerminal(!showTerminal)}
              >
                <PanelBottom className="h-3.5 w-3.5" />
                <span>Layout</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoFileBrowser;
