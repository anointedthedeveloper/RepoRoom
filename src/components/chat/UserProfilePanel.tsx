import { useState, useEffect, useRef } from "react";
import { X, Phone, Video, MessageSquare, Camera, Loader2, UserPlus, Check, Pencil, ZoomIn, Shield, ShieldOff, Trash2, LogOut, Archive, ArchiveX, Eraser } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarBubble from "./AvatarBubble";
import ImageCropper from "./ImageCropper";
import type { EnrichedChatRoom } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const AvatarLightbox = ({ url, name, onClose }: { url: string; name: string; onClose: () => void }) => (
  <AnimatePresence>
    <motion.div
      key="avatar-lb"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
        <X className="h-5 w-5" />
      </button>
      <motion.img
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        src={url} alt={name}
        className="max-w-xs w-full rounded-2xl object-cover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-8 text-white/70 text-sm font-medium">{name}</p>
    </motion.div>
  </AnimatePresence>
);

interface UserProfilePanelProps {
  chat: EnrichedChatRoom;
  open: boolean;
  onClose: () => void;
  onStartCall: (type: "audio" | "video") => void;
  onRefresh?: () => void;
  onClearChat?: (chatRoomId: string) => Promise<void>;
  onArchiveChat?: (chatRoomId: string, archive: boolean) => Promise<void>;
  onRemoveMember?: (chatRoomId: string, userId: string, displayName: string) => Promise<void>;
  onLeaveGroup?: (chatRoomId: string, displayName: string) => Promise<void>;
  onPromoteToAdmin?: (chatRoomId: string, userId: string, displayName: string) => Promise<void>;
  onDemoteAdmin?: (chatRoomId: string, userId: string, displayName: string) => Promise<void>;
  onSendSystemMessage?: (chatRoomId: string, text: string) => Promise<void>;
}

interface UserProfile { id: string; username: string; display_name: string | null; avatar_url: string | null; status: string; }

const RoleBadge = ({ role }: { role: string | null | undefined }) => {
  if (!role || role === "member") return null;
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${role === "owner" ? "bg-yellow-500/20 text-yellow-500" : "bg-primary/20 text-primary"}`}>
      {role === "owner" ? "Owner" : "Admin"}
    </span>
  );
};

const UserProfilePanel = ({ chat, open, onClose, onStartCall, onRefresh, onClearChat, onArchiveChat, onRemoveMember, onLeaveGroup, onPromoteToAdmin, onDemoteAdmin, onSendSystemMessage }: UserProfilePanelProps) => {
  const { user } = useAuth();
  const otherMember = chat.members.find((m) => m.user_id !== user?.id);
  const profile = otherMember?.profiles;
  const currentUserRole = chat.currentUserRole;
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin" || isOwner;
  const onlineCount = chat.onlineCount ?? 0;

  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState(chat.displayName);
  const [groupDesc, setGroupDesc] = useState((chat as any).description || "");
  const [groupIcon, setGroupIcon] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [archivingChat, setArchivingChat] = useState(false);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGroupName(chat.displayName);
    setGroupDesc((chat as any).description || "");
    setEditingGroup(false);
    setShowAddMembers(false);
    setSelectedToAdd([]);
  }, [chat.id, chat.displayName]);

  useEffect(() => {
    if (showAddMembers) {
      const existingIds = chat.members.map((m) => m.user_id);
      supabase.from("profiles").select("id, username, display_name, avatar_url, status")
        .not("id", "in", `(${existingIds.join(",")})`)
        .then(({ data }) => { if (data) setAllUsers(data as UserProfile[]); });
    }
  }, [showAddMembers, chat.members]);

  const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCroppedIcon = async (blob: Blob) => {
    setCropSrc(null);
    setUploadingIcon(true);
    setIconError(null);
    // Use a fixed path per group so the same URL always works (overwrite)
    const path = `group-icons/${chat.id}.jpg`;
    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) {
      setIconError(`Upload failed: ${error.message}`);
      setUploadingIcon(false);
      return;
    }
    const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    // Append cache-buster so browser fetches the new image
    const url = data.publicUrl;
    const busted = `${url}?t=${Date.now()}`;
    // Update DB with the clean URL (no cache-buster)
    const { error: updateError } = await supabase
      .from("chat_rooms")
      .update({ icon_url: busted })
      .eq("id", chat.id);
    if (updateError) {
      setIconError(`Upload OK but DB update failed: ${updateError.message}`);
    } else {
      setGroupIcon(busted);
      onRefresh?.();
    }
    setUploadingIcon(false);
  };

  const saveGroupChanges = async () => {
    if (!groupName.trim()) return;
    setSavingGroup(true);
    const updates: any = { name: groupName.trim(), description: groupDesc.trim() || null };
    if (groupIcon) updates.icon_url = groupIcon.split("?t=")[0];
    const oldName = chat.displayName;
    const { error } = await supabase.from("chat_rooms").update(updates).eq("id", chat.id);
    if (error) {
      setIconError(`Failed to save: ${error.message}`);
      setSavingGroup(false);
      return;
    }
    if (groupName.trim() !== oldName) {
      await onSendSystemMessage?.(chat.id, `Group name changed to "${groupName.trim()}"`);
    }
    setSavingGroup(false);
    setEditingGroup(false);
    onRefresh?.();
  };

  const handleAddMembers = async () => {
    if (!selectedToAdd.length) return;
    setAddingMembers(true);
    await supabase.from("chat_members").insert(
      selectedToAdd.map((uid) => ({ chat_room_id: chat.id, user_id: uid, role: "member" })) as any
    );
    const names = allUsers.filter((u) => selectedToAdd.includes(u.id)).map((u) => u.display_name || u.username).join(", ");
    await onSendSystemMessage?.(chat.id, `${names} ${selectedToAdd.length > 1 ? "were" : "was"} added to the group`);
    setAddingMembers(false);
    setShowAddMembers(false);
    setSelectedToAdd([]);
    onRefresh?.();
  };

  const handleRemoveMember = async (userId: string) => {
    const member = chat.members.find((m) => m.user_id === userId);
    const name = member?.profiles?.display_name || member?.profiles?.username || "Member";
    if (!window.confirm(`Remove ${name} from the group?`)) return;
    await onRemoveMember?.(chat.id, userId, name);
    onRefresh?.();
  };

  const handlePromote = async (userId: string) => {
    const member = chat.members.find((m) => m.user_id === userId);
    const name = member?.profiles?.display_name || member?.profiles?.username || "Member";
    await onPromoteToAdmin?.(chat.id, userId, name);
    onRefresh?.();
  };

  const handleDemote = async (userId: string) => {
    const member = chat.members.find((m) => m.user_id === userId);
    const name = member?.profiles?.display_name || member?.profiles?.username || "Member";
    await onDemoteAdmin?.(chat.id, userId, name);
    onRefresh?.();
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Leave this group?")) return;
    setLeavingGroup(true);
    const myProfile = chat.members.find((m) => m.user_id === user?.id);
    const myName = myProfile?.profiles?.display_name || myProfile?.profiles?.username || "Someone";
    await onLeaveGroup?.(chat.id, myName);
    setLeavingGroup(false);
    onClose();
  };

  const deleteGroup = async () => {
    if (!window.confirm("Delete this group? This cannot be undone.")) return;
    setDeletingGroup(true);
    await supabase.from("chat_rooms").delete().eq("id", chat.id);
    setDeletingGroup(false);
    onClose();
    onRefresh?.();
  };

  const handleClearChat = async () => {
    if (!window.confirm("Clear all messages in this chat? This cannot be undone.")) return;
    setClearingChat(true);
    await onClearChat?.(chat.id);
    setClearingChat(false);
  };

  const handleArchiveToggle = async () => {
    setArchivingChat(true);
    await onArchiveChat?.(chat.id, !chat.isArchived);
    setArchivingChat(false);
    onClose();
  };

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(addSearch.toLowerCase()) ||
    (u.display_name?.toLowerCase().includes(addSearch.toLowerCase()) ?? false)
  );

  return (
    <>
      {avatarLightbox && profile?.avatar_url && (
        <AvatarLightbox url={profile.avatar_url} name={chat.displayName} onClose={() => setAvatarLightbox(false)} />
      )}
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCrop={handleCroppedIcon}
          onCancel={() => setCropSrc(null)}
        />
      )}
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-20 sm:block"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-full sm:w-80 bg-card border-l border-border z-30 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold text-foreground">{chat.is_group ? "Group Info" : "Profile"}</span>
              <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Avatar + name */}
              <div className="flex flex-col items-center py-6 px-4 border-b border-border">
                {chat.is_group ? (
                  <div className="relative group" onClick={() => isAdmin && iconRef.current?.click()} style={{ cursor: isAdmin ? "pointer" : "default" }}>
                    {groupIcon || (chat as any).icon_url ? (
                      <img src={groupIcon || (chat as any).icon_url} alt="Group" className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary ring-offset-2 ring-offset-card" />
                    ) : (
                      <div className="h-24 w-24 rounded-2xl gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground">
                        {chat.displayAvatar}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        {uploadingIcon ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <>
                          <Camera className="h-6 w-6 text-white" />
                          <span className="text-[10px] text-white/80">Change photo</span>
                        </>}
                      </div>
                    )}
                    <input ref={iconRef} type="file" className="hidden" accept="image/*" onChange={handleIconSelect} disabled={!isAdmin} />
                  </div>
                ) : (
                  <div className="relative group cursor-pointer" onClick={() => profile?.avatar_url && setAvatarLightbox(true)}>
                    <AvatarBubble letter={chat.displayAvatar} status={chat.otherMemberStatus as "online" | "offline"} size="lg" imageUrl={profile?.avatar_url} />
                    {profile?.avatar_url && (
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                )}

                {iconError && (
                  <p className="text-xs text-destructive mt-1 text-center px-2">{iconError}</p>
                )}
                {editingGroup ? (
                  <div className="mt-3 w-full space-y-2">
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary text-center"
                      autoFocus
                    />
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      placeholder="Description (optional)"
                      rows={2}
                      className="w-full bg-muted text-xs text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingGroup(false)} className="flex-1 text-xs py-2 rounded-lg bg-muted text-muted-foreground">Cancel</button>
                      <button onClick={saveGroupChanges} disabled={savingGroup} className="flex-1 text-xs py-2 rounded-lg gradient-primary text-primary-foreground font-medium">
                        {savingGroup ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 mt-3">
                      <h3 className="text-base font-semibold text-foreground">{chat.displayName}</h3>
                      {chat.is_group && isAdmin && (
                        <button onClick={() => setEditingGroup(true)} className="text-muted-foreground hover:text-primary transition-colors" title="Edit group">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {chat.is_group && (chat as any).description && (
                      <p className="text-xs text-muted-foreground mt-1 text-center px-2">{(chat as any).description}</p>
                    )}
                    {chat.is_group && isAdmin && !editingGroup && (
                      <button
                        onClick={() => setEditingGroup(true)}
                        className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity"
                      >
                        <Pencil className="h-3 w-3" />Edit group details
                      </button>
                    )}
                    {!chat.is_group && profile?.username && (
                      <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
                    )}
                    {!chat.is_group && (profile as any)?.bio && (
                      <p className="text-xs text-muted-foreground mt-1 text-center px-3 italic">{(profile as any).bio}</p>
                    )}
                  </>
                )}

                <span className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  chat.is_group ? "bg-primary/10 text-primary"
                  : chat.otherMemberStatus === "online" ? "bg-green-500/10 text-green-500"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {chat.is_group
                    ? `${chat.members.length} members · ${onlineCount} online`
                    : chat.otherMemberStatus === "online" ? "Online" : "Offline"}
                </span>
              </div>

              {/* DM actions */}
              {!chat.is_group && (
                <div className="border-b border-border px-4 py-4">
                  <div className="flex gap-2">
                  <button onClick={() => { onStartCall("audio"); onClose(); }} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Audio</span>
                  </button>
                  <button onClick={() => { onStartCall("video"); onClose(); }} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                    <Video className="h-5 w-5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Video</span>
                  </button>
                  <button onClick={onClose} className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span className="text-[11px] text-muted-foreground">Message</span>
                  </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={handleClearChat} disabled={clearingChat}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl py-2 transition-colors border border-border">
                      <Eraser className="h-3.5 w-3.5" />{clearingChat ? "Clearing..." : "Clear Chat"}
                    </button>
                    <button onClick={handleArchiveToggle} disabled={archivingChat}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl py-2 transition-colors border border-border">
                      {chat.isArchived ? <ArchiveX className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {archivingChat ? "..." : chat.isArchived ? "Unarchive" : "Archive"}
                    </button>
                  </div>
                </div>
              )}

              {/* Group members */}
              {chat.is_group && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Members</p>
                    {isAdmin && (
                      <button onClick={() => setShowAddMembers(!showAddMembers)} className="flex items-center gap-1 text-[11px] text-primary hover:opacity-80 transition-opacity">
                        <UserPlus className="h-3.5 w-3.5" />Add
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {showAddMembers && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                        <input
                          value={addSearch}
                          onChange={(e) => setAddSearch(e.target.value)}
                          placeholder="Search users..."
                          className="w-full bg-muted text-xs text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary mb-2"
                        />
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {filteredUsers.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => setSelectedToAdd((prev) => prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id])}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-muted ${selectedToAdd.includes(u.id) ? "bg-primary/10" : ""}`}
                            >
                              <AvatarBubble letter={u.username[0]?.toUpperCase() || "?"} size="sm" imageUrl={u.avatar_url} />
                              <span className="text-xs text-foreground flex-1 truncate">{u.display_name || u.username}</span>
                              {selectedToAdd.includes(u.id) && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                            </button>
                          ))}
                          {filteredUsers.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No users found</p>}
                        </div>
                        {selectedToAdd.length > 0 && (
                          <button onClick={handleAddMembers} disabled={addingMembers} className="w-full mt-2 text-xs gradient-primary text-primary-foreground rounded-lg py-2 font-medium">
                            {addingMembers ? "Adding..." : `Add ${selectedToAdd.length} member${selectedToAdd.length > 1 ? "s" : ""}`}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    {chat.members.map((m) => {
                      const isMe = m.user_id === user?.id;
                      const memberRole = m.role;
                      const memberName = m.profiles?.display_name || m.profiles?.username || "Unknown";
                      const canManage = isAdmin && !isMe && memberRole !== "owner";
                      const canPromote = canManage && memberRole !== "admin";
                      const canDemote = isOwner && memberRole === "admin";
                      const canRemove = canManage;

                      return (
                        <div key={m.user_id} className="flex items-center gap-2.5">
                          <AvatarBubble letter={m.profiles?.username?.[0]?.toUpperCase() || "?"} status={m.profiles?.status as "online" | "offline"} size="sm" imageUrl={m.profiles?.avatar_url} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                              {memberName}
                              {isMe && <span className="text-muted-foreground">(you)</span>}
                              <RoleBadge role={memberRole} />
                            </span>
                            <span className="text-[10px] text-muted-foreground">@{m.profiles?.username}</span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {canPromote && (
                              <button onClick={() => handlePromote(m.user_id)} title="Make admin" className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                                <Shield className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canDemote && (
                              <button onClick={() => handleDemote(m.user_id)} title="Remove admin" className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors">
                                <ShieldOff className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canRemove && (
                              <button onClick={() => handleRemoveMember(m.user_id)} title="Remove from group" className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Clear + Archive */}
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleClearChat} disabled={clearingChat}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl py-2 transition-colors border border-border">
                      <Eraser className="h-3.5 w-3.5" />{clearingChat ? "Clearing..." : "Clear Chat"}
                    </button>
                    <button onClick={handleArchiveToggle} disabled={archivingChat}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl py-2 transition-colors border border-border">
                      {chat.isArchived ? <ArchiveX className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {archivingChat ? "..." : chat.isArchived ? "Unarchive" : "Archive"}
                    </button>
                  </div>

                  {/* Leave group */}
                  <button
                    onClick={handleLeaveGroup}
                    disabled={leavingGroup}
                    className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl py-2.5 transition-colors border border-border"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {leavingGroup ? "Leaving..." : "Leave Group"}
                  </button>

                  {/* Delete group — owner only */}
                  {isOwner && (
                    <button
                      onClick={deleteGroup}
                      disabled={deletingGroup}
                      className="mt-2 w-full flex items-center justify-center gap-2 text-xs text-destructive hover:bg-destructive/10 rounded-xl py-2.5 transition-colors border border-destructive/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingGroup ? "Deleting..." : "Delete Group"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
};

export default UserProfilePanel;
