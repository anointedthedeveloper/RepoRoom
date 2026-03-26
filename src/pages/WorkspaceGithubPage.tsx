import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useGithub } from "@/hooks/useGithub";
import { useWorkspaceGithub } from "@/hooks/useWorkspaceGithub";
import GithubPanel from "@/components/github/GithubPanel";
import RepoFileBrowser from "@/components/github/RepoFileBrowser";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import type { GithubRepo } from "@/hooks/useGithub";

const WorkspaceGithubPage = () => {
  const navigate = useNavigate();
  const {
    workspaces, activeWorkspace, channels, members, tasks, projects, projectFiles, loading,
    selectWorkspace, createWorkspace, joinWorkspace, createChannel,
    setDevStatus, updateProjectRepo, importProjectFile,
  } = useWorkspace();
  const { createIssue } = useGithub();
  const { linkedRepos, fetchLinkedRepos, linkRepo } = useWorkspaceGithub();
  const [fileBrowserRepo, setFileBrowserRepo] = useState<{ owner: string; repo: string; branch: string } | null>(null);

  useEffect(() => {
    if (!loading && workspaces.length > 0 && !activeWorkspace) {
      selectWorkspace(workspaces[0]);
    }
  }, [loading, workspaces, activeWorkspace, selectWorkspace]);

  useEffect(() => {
    if (activeWorkspace) fetchLinkedRepos(activeWorkspace.id);
  }, [activeWorkspace, fetchLinkedRepos]);

  const handleLinkRepo = async (repo: GithubRepo) => {
    if (!activeWorkspace) return;
    const result = await linkRepo(activeWorkspace.id, repo);
    if (!result.ok) toast.error(result.error || "Could not link repo");
    else toast.success(`${repo.full_name} linked`);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <div className="w-72 shrink-0 border-r border-border/60">
        <WorkspaceSidebar
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          channels={channels}
          members={members}
          tasks={tasks}
          projects={projects}
          linkedRepoCount={linkedRepos.length}
          activeChannelId={null}
          onSelectWorkspace={selectWorkspace}
          onSelectChannel={() => navigate("/workspace")}
          onCreateWorkspace={createWorkspace as never}
          onJoinWorkspace={joinWorkspace as never}
          onCreateChannel={createChannel as never}
          onSetDevStatus={(s) => activeWorkspace && setDevStatus(activeWorkspace.id, s)}
          onOpenTasks={() => navigate("/workspace/tasks")}
          onOpenProjects={() => navigate("/workspace/projects")}
          onOpenGithub={() => navigate("/workspace/github")}
        />
      </div>
      <div className="flex-1 p-4 overflow-hidden flex gap-4">
        <div className={fileBrowserRepo ? "w-80 shrink-0" : "flex-1"}>
          <GithubPanel
            onClose={() => navigate("/workspace")}
            workspaceId={activeWorkspace?.id || null}
            linkedRepoNames={linkedRepos.map((r) => r.repo_full_name)}
            onLinkRepo={handleLinkRepo}
            projects={projects}
            onLinkRepoToProject={async (projectId, repoFullName) => {
              if (!activeWorkspace) return;
              await updateProjectRepo(projectId, repoFullName, activeWorkspace.id);
              toast.success("Repo linked to project");
            }}
            onOpenFiles={(owner, repo, branch) => setFileBrowserRepo({ owner, repo, branch })}
            fullPage
          />
        </div>
        {fileBrowserRepo && (
          <div className="flex-1 overflow-hidden">
            <RepoFileBrowser
              owner={fileBrowserRepo.owner}
              repo={fileBrowserRepo.repo}
              defaultBranch={fileBrowserRepo.branch}
              projects={projects}
              onImportToProject={async (projectId, repoFullName, branchName, filePath, fileSha) => {
                if (!activeWorkspace) return;
                const result = await importProjectFile(activeWorkspace.id, projectId, repoFullName, branchName, filePath, fileSha);
                if (result.ok) toast.success("File imported");
                else toast.error(result.error || "Could not import file");
              }}
              onClose={() => setFileBrowserRepo(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceGithubPage;
