import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useWorkspaceGithub } from "@/hooks/useWorkspaceGithub";
import ProjectsPanel from "@/components/workspace/ProjectsPanel";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";

const WorkspaceProjectsPage = () => {
  const navigate = useNavigate();
  const {
    workspaces, activeWorkspace, channels, members, tasks, projects, projectFiles, loading,
    selectWorkspace, createWorkspace, joinWorkspace, createChannel,
    setDevStatus, createProject, updateProjectStatus, updateProjectRepo,
  } = useWorkspace();
  const { linkedRepos } = useWorkspaceGithub();

  useEffect(() => {
    if (!loading && workspaces.length > 0 && !activeWorkspace) {
      selectWorkspace(workspaces[0]);
    }
  }, [loading, workspaces, activeWorkspace, selectWorkspace]);

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
      <div className="flex-1 p-4 overflow-hidden">
        {activeWorkspace ? (
          <ProjectsPanel
            projects={projects}
            linkedRepos={linkedRepos.map((r) => r.repo_full_name)}
            projectFiles={projectFiles}
            onCreateProject={(name, desc, repo) => createProject(activeWorkspace.id, name, desc, repo)}
            onUpdateStatus={(id, status) => updateProjectStatus(id, status, activeWorkspace.id)}
            onUpdateRepo={(id, repo) => updateProjectRepo(id, repo, activeWorkspace.id)}
            onClose={() => navigate("/workspace")}
            fullPage
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {loading ? "Loading..." : "Select a workspace first"}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceProjectsPage;
