import { useState, useEffect, useRef } from "react";
import { X, Phone, Video, MessageSquare, Camera, Loader2, UserPlus, Check, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AvatarBubble from "./AvatarBubble";
import type { EnrichedChatRoom } from "@/hooks/useChat";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UserProfilePanelProps {
  chat: EnrichedChatRoom;
  open: boolean;
  onClose: () => void;
  onStartCall: (type: "audio" | "video") => void;
  onRefresh?: () => void;
}

interface UserProfile { id: string; username: string; display_name: string | null; avatar_url: string | null; status: string; }

const UserProfilePanel = ({ chat, open, onClose, onStartCall, onRefresh }: UserProfilePanelProps) => {
  const { user } = useAuth();
  const otherMember = chat.members.find((m) => m.user_id !== user?.id);
  const profile = otherMember?.profiles;

  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState(chat.displayName);
  const [groupIcon, setGroupIcon] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGroupName(chat.displayName);
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

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    const ext = file.name.split(".").pop();
    const path = `group-icons/${chat.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setGroupIcon(`${data.publicUrl}?t=${Date.now()}`);
    }
    setUploadingIcon(false);
    e.target.value = "";
  };

  const saveGroupChanges = async () => {
    if (!groupName.trim()) return;
    setSavingGroup(true);
    const updates: any = { name: groupName.trim() };
    if (groupIcon) updates.icon_url = groupIcon.split("?t=")[0];
    await supabase.from("chat_rooms").update(updates).eq("id", chat.id);
    setSavingGroup(false);
    setEditingGroup(false);
    onRefresh?.();
  };

  const handleAddMembers = async () => {
    if (!selectedToAdd.length) return;
    setAddingMembers(true);
    await supabase.from("chat_members").insert(
      selectedToAdd.map((uid) => ({ chat_room_id: chat.id, user_id: uid }))
    );
    setAddingMembers(false);
    setShowAddMembers(false);
    setSelectedToAdd([]);
    onRefresh?.();
  };

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(addSearch.toLowerCase()) ||
    (u.display_name?.toLowerCase().includes(addSearch.toLowerCase()) ?? false)
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-20"
            onClick={onClose}
          />
          {/* Panel — always fixed overlay, never takes layout space */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-72 bg-card border-l border-border z-30 flex flex-col shadow-2xl"
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
                  <div className="relative group cursor-pointer" onClick={() => iconRef.current?.click()}>
                    {groupIcon || (chat as any).icon_url ? (
                      <img src={groupIcon || (chat as any).icon_url} alt="Group" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-card" />
                    ) : (
                      <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                        {chat.displayAvatar}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {uploadingIcon ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                    </div>
                    <input ref={iconRef} type="file" className="hidden" accept="image/*" onChange={handleIconUpload} />
                  </div>
                ) : (
                  <AvatarBubble letter={chat.displayAvatar} status={chat.otherMemberStatus as "online" | "offline"} size="lg" imageUrl={profile?.avatar_url} />
                )}

                {editingGroup ? (
                  <div className="mt-3 w-full space-y-2">
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full bg-muted text-sm text-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary text-center"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingGroup(false)} className="flex-1 text-xs py-1.5 rounded-lg bg-muted text-muted-foreground">Cancel</button>
                      <button onClick={saveGroupChanges} disabled={savingGroup} className="flex-1 text-xs py-1.5 rounded-lg gradient-primary text-primary-foreground font-medium">
                        {savingGroup ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 mt-3">
                      <h3 className="text-base font-semibold text-foreground">{chat.displayName}</h3>
                      {chat.is_group && (
                        <button onClick={() => setEditingGroup(true)} className="text-muted-foreground hover:text-primary transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {!chat.is_group && profile?.username && (
                      <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
                    )}
                  </>
                )}

                <span className={`mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  chat.is_group ? "bg-primary/10 text-primary"
                  : chat.otherMemberStatus === "online" ? "bg-green-500/10 text-green-500"
                  : "bg-muted text-muted-foreground"
                }`}>
                  {chat.is_group ? `${chat.members.length} members` : chat.otherMemberStatus === "online" ? "Online" : "Offline"}
                </span>
              </div>

              {/* DM actions */}
              {!chat.is_group && (
                <div className="flex gap-2 px-4 py-4 border-b border-border">
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
              )}

              {/* Group members */}
              {chat.is_group && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Members</p>
                    <button onClick={() => setShowAddMembers(!showAddMembers)} className="flex items-center gap-1 text-[11px] text-primary hover:opacity-80 transition-opacity">
                      <UserPlus className="h-3.5 w-3.5" />Add
                    </button>
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
                    {chat.members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2.5">
                        <AvatarBubble letter={m.profiles?.username?.[0]?.toUpperCase() || "?"} status={m.profiles?.status as "online" | "offline"} size="sm" imageUrl={m.profiles?.avatar_url} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-foreground truncate">
                            {m.profiles?.display_name || m.profiles?.username}
                            {m.user_id === user?.id && <span className="text-muted-foreground"> (you)</span>}
                          </span>
                          <span className="text-[10px] text-muted-foreground">@{m.profiles?.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserProfilePanel;
