import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import TasksPanel from "@/components/workspace/TasksPanel";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";

const WorkspaceTasksPage = () => {
  const navigate = useNavigate();
  const {
    workspaces, activeWorkspace, channels, members, tasks, projects, loading,
    selectWorkspace, createWorkspace, joinWorkspace, createChannel,
    setDevStatus, createTask, updateTaskStatus,
  } = useWorkspace();

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
          linkedRepoCount={0}
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
          <TasksPanel
            tasks={tasks}
            members={members}
            workspaceId={activeWorkspace.id}
            onUpdateStatus={(id, status) => updateTaskStatus(id, status, activeWorkspace.id)}
            onCreateTask={(title) => createTask(activeWorkspace.id, title)}
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

export default WorkspaceTasksPage;
