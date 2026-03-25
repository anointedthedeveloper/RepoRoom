import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  created_by: string;
  invite_code: string;
  created_at: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  type: "text" | "announcement";
  created_at: string;
}

export interface WorkspaceMember {
  user_id: string;
  role: "owner" | "admin" | "member";
  dev_status: string | null;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
  };
}

export interface Task {
  id: string;
  workspace_id: string;
  channel_id: string | null;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done";
  created_by: string;
  assigned_to: string | null;
  message_id: string | null;
  created_at: string;
}

export interface WorkspaceProject {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: "planning" | "active" | "paused" | "shipped";
  linked_repo_full_name: string | null;
  created_by: string;
  created_at: string;
}

export function useWorkspace() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) return;
    const { data: memberRows } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    if (!memberRows?.length) { setWorkspaces([]); setLoading(false); return; }

    const ids = memberRows.map((r) => r.workspace_id);
    const { data } = await supabase.from("workspaces").select("*").in("id", ids).order("created_at");
    setWorkspaces((data as Workspace[]) || []);
    setLoading(false);
  }, [user]);

  const fetchChannels = useCallback(async (workspaceId: string) => {
    const { data } = await supabase
      .from("channels")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at");
    setChannels((data as Channel[]) || []);
  }, []);

  const fetchMembers = useCallback(async (workspaceId: string) => {
    const { data: memberRows } = await supabase
      .from("workspace_members")
      .select("user_id, role, dev_status")
      .eq("workspace_id", workspaceId);

    if (!memberRows?.length) { setMembers([]); return; }
    const userIds = memberRows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, status")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    setMembers(
      memberRows.map((r) => ({
        user_id: r.user_id,
        role: r.role,
        dev_status: r.dev_status,
        profiles: profileMap.get(r.user_id) as WorkspaceMember["profiles"],
      })).filter((m) => m.profiles)
    );
  }, []);

  const fetchTasks = useCallback(async (workspaceId: string) => {
    const { data } = await supabase
      .from("workspace_tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    setTasks((data as Task[]) || []);
  }, []);

  const fetchProjects = useCallback(async (workspaceId: string) => {
    const { data } = await supabase
      .from("workspace_projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    setProjects((data as WorkspaceProject[]) || []);
  }, []);

  const selectWorkspace = useCallback(async (ws: Workspace) => {
    setActiveWorkspace(ws);
    await Promise.all([fetchChannels(ws.id), fetchMembers(ws.id), fetchTasks(ws.id), fetchProjects(ws.id)]);
  }, [fetchChannels, fetchMembers, fetchTasks, fetchProjects]);

  const createWorkspace = useCallback(async (name: string, description?: string) => {
    if (!user) return null;
    const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ name, description: description || null, created_by: user.id, invite_code: inviteCode } as never)
      .select().single();
    if (error || !data) return null;

    await supabase.from("workspace_members").insert({
      workspace_id: data.id, user_id: user.id, role: "owner",
    } as never);

    // Create default channels
    await supabase.from("channels").insert([
      { workspace_id: data.id, name: "general", type: "text", description: "General discussion" },
      { workspace_id: data.id, name: "announcements", type: "announcement", description: "Important updates" },
    ] as never);

    await fetchWorkspaces();
    return data as Workspace;
  }, [user, fetchWorkspaces]);

  const joinWorkspace = useCallback(async (inviteCode: string) => {
    if (!user) return null;
    const { data: ws } = await supabase
      .from("workspaces")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .maybeSingle();
    if (!ws) return null;

    await supabase.from("workspace_members").upsert({
      workspace_id: ws.id, user_id: user.id, role: "member",
    } as never);

    await fetchWorkspaces();
    return ws as Workspace;
  }, [user, fetchWorkspaces]);

  const createChannel = useCallback(async (workspaceId: string, name: string, type: "text" | "announcement" = "text") => {
    const { data } = await supabase
      .from("channels")
      .insert({ workspace_id: workspaceId, name: name.toLowerCase().replace(/\s+/g, "-"), type } as never)
      .select().single();
    if (data) await fetchChannels(workspaceId);
    return data as Channel | null;
  }, [fetchChannels]);

  const setDevStatus = useCallback(async (workspaceId: string, status: string) => {
    if (!user) return;
    await supabase.from("workspace_members")
      .update({ dev_status: status } as never)
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id);
    await fetchMembers(workspaceId);
  }, [user, fetchMembers]);

  const createTask = useCallback(async (workspaceId: string, title: string, description?: string, channelId?: string, messageId?: string) => {
    if (!user) return null;
    const { data } = await supabase
      .from("workspace_tasks")
      .insert({ workspace_id: workspaceId, title, description: description || null, channel_id: channelId || null, message_id: messageId || null, created_by: user.id, status: "open" } as never)
      .select().single();
    if (data) await fetchTasks(workspaceId);
    return data as Task | null;
  }, [user, fetchTasks]);

  const updateTaskStatus = useCallback(async (taskId: string, status: Task["status"], workspaceId: string) => {
    await supabase.from("workspace_tasks").update({ status } as never).eq("id", taskId);
    await fetchTasks(workspaceId);
  }, [fetchTasks]);

  const createProject = useCallback(async (
    workspaceId: string,
    name: string,
    description?: string,
    linkedRepoFullName?: string | null,
  ) => {
    if (!user) return null;
    const { data } = await supabase
      .from("workspace_projects")
      .insert({
        workspace_id: workspaceId,
        name,
        description: description || null,
        linked_repo_full_name: linkedRepoFullName || null,
        status: "planning",
        created_by: user.id,
      } as never)
      .select()
      .single();
    if (data) await fetchProjects(workspaceId);
    return data as WorkspaceProject | null;
  }, [fetchProjects, user]);

  const updateProjectStatus = useCallback(async (projectId: string, status: WorkspaceProject["status"], workspaceId: string) => {
    await supabase.from("workspace_projects").update({ status } as never).eq("id", projectId);
    await fetchProjects(workspaceId);
  }, [fetchProjects]);

  const addMember = useCallback(async (workspaceId: string, username: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();
    if (!profile) return "User not found";
    const { error } = await supabase.from("workspace_members").upsert({
      workspace_id: workspaceId, user_id: profile.id, role: "member",
    } as never);
    if (error) return "Already a member or error adding";
    await fetchMembers(workspaceId);
    return null;
  }, [fetchMembers]);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  return {
    workspaces, activeWorkspace, channels, members, tasks, projects, loading,
    fetchWorkspaces, selectWorkspace, createWorkspace, joinWorkspace,
    createChannel, setDevStatus, createTask, updateTaskStatus, createProject, updateProjectStatus, addMember, fetchTasks, fetchProjects,
  };
}
