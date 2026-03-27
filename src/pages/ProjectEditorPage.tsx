import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, FolderKanban, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceGithub } from "@/hooks/useWorkspaceGithub";
import RepoFileBrowser from "@/components/github/RepoFileBrowser";
import type { WorkspaceProjectFile } from "@/hooks/useWorkspace";

const ProjectEditorPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    workspaces, activeWorkspace, projects, projectFiles, loading,
    selectWorkspace, importProjectFile, removeProjectFile,
  } = useWorkspace();
  const { linkedRepos } = useWorkspaceGithub();

  const [activeBrowser, setActiveBrowser] = useState<{ owner: string; repo: string; branch: string } | null>(null);
  const [removingFile, setRemovingFile] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (!loading && workspaces.length > 0 && !activeWorkspace) {
      selectWorkspace(workspaces[0]);
    }
  }, [loading, workspaces, activeWorkspace, selectWorkspace]);

  const project = projects.find((p) => p.id === projectId);
  const files: WorkspaceProjectFile[] = projectFiles.filter((f) => f.project_id === projectId);

  // Auto-open the linked repo browser when project loads
  useEffect(() => {
    if (!project || activeBrowser) return;
    if (project.linked_repo_full_name) {
      const [owner, repo] = project.linked_repo_full_name.split("/");
      const branch = linkedRepos.find((r) => r.repo_full_name === project.linked_repo_full_name)?.default_branch || "main";
      setActiveBrowser({ owner, repo, branch });
    }
  }, [project, linkedRepos, activeBrowser]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading project…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <FolderKanban className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Project not found</p>
        <button onClick={() => navigate(-1)} className="text-xs text-primary hover:underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      {/* Left panel — project files */}
      <div className="w-64 shrink-0 flex flex-col border-r border-border/60 bg-sidebar/95">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border/60 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{project.name}</p>
            {project.linked_repo_full_name && (
              <p className="text-[10px] text-muted-foreground truncate">{project.linked_repo_full_name}</p>
            )}
          </div>
        </div>

        {/* Open repo browser button */}
        {project.linked_repo_full_name && (
          <div className="px-3 py-2 border-b border-border/40 shrink-0">
            <button
              onClick={() => {
                const [owner, repo] = project.linked_repo_full_name!.split("/");
                const branch = linkedRepos.find((r) => r.repo_full_name === project.linked_repo_full_name)?.default_branch || "main";
                setActiveBrowser({ owner, repo, branch });
              }}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Browse repo files
            </button>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Imported files · {files.length}
          </p>
          {files.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <FileText className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-[11px] text-muted-foreground">No files imported yet.</p>
              {project.linked_repo_full_name && (
                <p className="text-[10px] text-muted-foreground mt-1">Browse the repo and import files.</p>
              )}
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => setActiveBrowser({ owner: file.repo_owner, repo: file.repo_name, branch: file.branch_name })}
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate font-medium">{file.file_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{file.file_path}</p>
                </div>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    setRemovingFile(file.id);
                    await removeProjectFile(file.id);
                    setRemovingFile(null);
                    toast.success("File removed");
                  }}
                  disabled={removingFile === file.id}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all disabled:opacity-40 shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 overflow-hidden">
        {activeBrowser ? (
          <RepoFileBrowser
            owner={activeBrowser.owner}
            repo={activeBrowser.repo}
            defaultBranch={activeBrowser.branch}
            projects={projects}
            onImportToProject={async (pid, repoFullName, branchName, filePath, fileSha) => {
              if (!activeWorkspace) return;
              const result = await importProjectFile(activeWorkspace.id, pid, repoFullName, branchName, filePath, fileSha);
              if (result.ok) toast.success("File imported to project");
              else toast.error(result.error || "Could not import file");
            }}
            onClose={() => setActiveBrowser(null)}
            fullMode
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
            <div className="h-16 w-16 rounded-[22px] border border-border/70 bg-background/80 flex items-center justify-center">
              <FolderKanban className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{project.name}</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                {project.linked_repo_full_name
                  ? 'Click "Browse repo files" to open the editor.'
                  : "Link a GitHub repo to this project to start editing files."}
              </p>
            </div>
            {!project.linked_repo_full_name && (
              <button
                onClick={() => navigate("/workspace/projects")}
                className="text-xs text-primary hover:underline"
              >
                Go to Projects settings
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectEditorPage;
