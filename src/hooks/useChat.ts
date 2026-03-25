import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChatRoom {
  id: string;
  name: string | null;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
  status?: string | null; // 'pending' | 'accepted' | null (null = accepted for old rooms)
}

interface ChatMember {
  user_id: string;
  role?: string | null;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    status: string;
    last_seen: string | null;
  };
}

interface Message {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  is_delivered?: boolean;
  is_edited?: boolean;
  created_at: string;
  file_type?: string | null;
  reply_to_id?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export interface EnrichedChatRoom extends ChatRoom {
  members: ChatMember[];
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  displayName: string;
  displayAvatar: string;
  otherMemberStatus?: string;
  onlineCount?: number;
  currentUserRole?: string | null;
  isPending: boolean;
  isRequester: boolean;
  isArchived: boolean;
}

export function useChat() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<EnrichedChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeChat = chatRooms.find((c) => c.id === activeChatId) || null;

  // Fetch chat rooms
  const fetchChatRooms = useCallback(async () => {
    if (!user) return;

    const { data: memberRows } = await supabase
      .from("chat_members")
      .select("chat_room_id")
      .eq("user_id", user.id);

    if (!memberRows?.length) {
      setChatRooms([]);
      setLoading(false);
      return;
    }

    const roomIds = memberRows.map((m) => m.chat_room_id);

    // Batch all queries in parallel — fetch members without role first, add role if available
    const [roomsRes, allMembersRes] = await Promise.all([
      supabase.from("chat_rooms").select("*").in("id", roomIds),
      supabase.from("chat_members").select("chat_room_id, user_id").in("chat_room_id", roomIds),
    ]);

    const rooms = roomsRes.data;
    if (!rooms) { setLoading(false); return; }

    // Try to fetch role column — silently ignore if it doesn't exist yet
    let roleMap = new Map<string, string | null>();
    const roleRes = await supabase.from("chat_members").select("chat_room_id, user_id, role").in("chat_room_id", roomIds);
    if (!roleRes.error && roleRes.data) {
      roleRes.data.forEach((r: any) => roleMap.set(`${r.chat_room_id}:${r.user_id}`, r.role ?? null));
    }

    const allMemberRows = allMembersRes.data || [];
    if (!allMemberRows.length) { setLoading(false); return; }
    const allUserIds = [...new Set(allMemberRows.map((m) => m.user_id))];

    const [profilesRes, lastMsgsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url, status, last_seen, bio").in("id", allUserIds),
      supabase.from("messages").select("*").in("chat_room_id", roomIds).order("created_at", { ascending: false }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    const allMessages = lastMsgsRes.data || [];

    const enriched: EnrichedChatRoom[] = rooms.map((room) => {
      const roomMemberRows = allMembersRes.data?.filter((m) => m.chat_room_id === room.id) ?? [];
      const members: ChatMember[] = roomMemberRows.map((row) => ({
        user_id: row.user_id,
        role: roleMap.get(`${row.chat_room_id}:${row.user_id}`) ?? null,
        profiles: profileMap.get(row.user_id) as ChatMember["profiles"],
      })).filter((m) => m.profiles);
      const onlineCount = members.filter((m) => m.profiles?.status === "online").length;
      const currentUserRole = members.find((m) => m.user_id === user.id)?.role ?? null;

      const roomMessages = allMessages.filter((m) => m.chat_room_id === room.id);
      const lastMessage = roomMessages[0];
      const unreadCount = roomMessages.filter((m) => !m.is_read && m.sender_id !== user.id).length;

      const otherMember = members.find((m) => m.user_id !== user.id);
      const displayName = room.is_group
        ? room.name || "Group Chat"
        : otherMember?.profiles?.display_name || otherMember?.profiles?.username || "Unknown";
      const displayAvatar = displayName[0]?.toUpperCase() || "?";

      const isPending = !room.is_group && (room as any).status === "pending";
      const isRequester = isPending && room.created_by === user.id;
      const isArchived = (room as any).is_archived === true;

      return {
        ...room,
        members,
        messages: [],
        lastMessage,
        unreadCount,
        displayName,
        displayAvatar,
        otherMemberStatus: otherMember?.profiles?.status,
        onlineCount,
        currentUserRole,
        isPending,
        isRequester,
        isArchived,
      };
    });

    enriched.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setChatRooms(enriched);
    setLoading(false);
  }, [user]);

  // Fetch messages for active chat
  const fetchMessages = useCallback(async () => {
    if (!activeChatId) {
      setMessages([]);
      setReactions([]);
      return;
    }

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_room_id", activeChatId)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    // Fetch reactions for these messages
    if (data?.length) {
      const msgIds = data.map((m) => m.id);
      const { data: rxData } = await supabase.from("reactions").select("*").in("message_id", msgIds);
      setReactions(rxData || []);
    } else {
      setReactions([]);
    }

    // Skip read receipts in ghost mode
    const ghostMode = localStorage.getItem("chatflow_ghost_mode") === "true";
    if (user && !ghostMode) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("chat_room_id", activeChatId)
        .eq("is_read", false)
        .neq("sender_id", user.id);
    }
    if (user) {
      supabase
        .from("messages")
        .update({ is_delivered: true } as any)
        .eq("chat_room_id", activeChatId)
        .neq("sender_id", user.id)
        .then(() => {})
        .catch(() => {});
    }
  }, [activeChatId, user]);

  // Send message — blocked if pending and not the requester, or if requester already sent 1 msg
  const sendMessage = useCallback(
    async (text: string, fileUrl?: string, fileType?: string, fileName?: string, replyToId?: string, replyToText?: string, replyToSender?: string, scheduledFor?: string) => {
      if (!user || !activeChatId || (!text.trim() && !fileUrl)) return;

      const activeRoom = chatRooms.find((r) => r.id === activeChatId);
      if (activeRoom?.isPending) {
        if (!activeRoom.isRequester) return;
        const { count } = await supabase.from("messages").select("id", { count: "exact", head: true })
          .eq("chat_room_id", activeChatId).eq("sender_id", user.id);
        if ((count ?? 0) >= 1) return;
      }

      const insertData: any = {
        chat_room_id: activeChatId,
        sender_id: user.id,
        content: text.trim() || (fileName ? `📎 ${fileName}` : "File"),
      };
      if (fileUrl) insertData.file_url = fileUrl;
      if (fileType) insertData.file_type = fileType;
      if (fileName) insertData.file_name = fileName;
      if (replyToId) insertData.reply_to_id = replyToId;
      if (replyToText) insertData.reply_to_text = replyToText;
      if (replyToSender) insertData.reply_to_sender = replyToSender;
      if (scheduledFor) insertData.scheduled_for = scheduledFor;

      await supabase.from("messages").insert(insertData);
    },
    [user, activeChatId, chatRooms]
  );

  // Create DM — new rooms start as 'pending'
  const createDirectMessage = useCallback(
    async (otherUserId: string) => {
      if (!user) return null;

      const { data: myRooms } = await supabase.from("chat_members").select("chat_room_id").eq("user_id", user.id);
      const { data: theirRooms } = await supabase.from("chat_members").select("chat_room_id").eq("user_id", otherUserId);

      if (myRooms && theirRooms) {
        const myIds = new Set(myRooms.map((r) => r.chat_room_id));
        const shared = theirRooms.find((r) => myIds.has(r.chat_room_id));
        if (shared) {
          const { data: roomData } = await supabase
            .from("chat_rooms").select("id, is_group").eq("id", shared.chat_room_id).eq("is_group", false).maybeSingle();
          if (roomData) { await fetchChatRooms(); return roomData.id; }
        }
      }

      // New DM starts as pending
      const { data: newRoom, error } = await supabase
        .from("chat_rooms")
        .insert({ is_group: false, created_by: user.id, status: "pending" } as any)
        .select().single();

      if (!newRoom || error) return null;

      await supabase.from("chat_members").insert([
        { chat_room_id: newRoom.id, user_id: user.id },
        { chat_room_id: newRoom.id, user_id: otherUserId },
      ]);

      await fetchChatRooms();
      return newRoom.id;
    },
    [user, fetchChatRooms]
  );

  const acceptRequest = useCallback(async (chatRoomId: string) => {
    await supabase.from("chat_rooms").update({ status: "accepted" } as any).eq("id", chatRoomId);
    await fetchChatRooms();
  }, [fetchChatRooms]);

  const declineRequest = useCallback(async (chatRoomId: string) => {
    await supabase.from("chat_rooms").delete().eq("id", chatRoomId);
    await fetchChatRooms();
  }, [fetchChatRooms]);

  // Create group chat
  const createGroupChat = useCallback(
    async (name: string, memberIds: string[]) => {
      if (!user) return null;

      const { data: newRoom } = await supabase
        .from("chat_rooms")
        .insert({ name, is_group: true, created_by: user.id })
        .select()
        .single();

      if (!newRoom) return null;

      const baseMembers = [
        { chat_room_id: newRoom.id, user_id: user.id, role: "owner" },
        ...memberIds.map((id) => ({ chat_room_id: newRoom.id, user_id: id, role: "member" })),
      ];
      await supabase.from("chat_members").insert(baseMembers as any);
      await fetchChatRooms();
      return newRoom.id;
    },
    [user, fetchChatRooms]
  );

  const sendSystemMessage = useCallback(
    async (chatRoomId: string, text: string) => {
      if (!user) return;
      await supabase.from("messages").insert({
        chat_room_id: chatRoomId,
        sender_id: user.id,
        content: text,
        file_type: "system",
      } as any);
    },
    [user]
  );

  const removeMember = useCallback(
    async (chatRoomId: string, userId: string, displayName: string) => {
      await supabase.from("chat_members").delete().eq("chat_room_id", chatRoomId).eq("user_id", userId);
      await sendSystemMessage(chatRoomId, `${displayName} was removed from the group`);
      await fetchChatRooms();
    },
    [sendSystemMessage, fetchChatRooms]
  );

  const leaveGroup = useCallback(
    async (chatRoomId: string, displayName: string) => {
      if (!user) return;
      await supabase.from("chat_members").delete().eq("chat_room_id", chatRoomId).eq("user_id", user.id);
      await sendSystemMessage(chatRoomId, `${displayName} left the group`);
      await fetchChatRooms();
    },
    [user, sendSystemMessage, fetchChatRooms]
  );

  const promoteToAdmin = useCallback(
    async (chatRoomId: string, userId: string, displayName: string) => {
      await supabase.from("chat_members").update({ role: "admin" } as any).eq("chat_room_id", chatRoomId).eq("user_id", userId);
      await sendSystemMessage(chatRoomId, `${displayName} was made an admin`);
      await fetchChatRooms();
    },
    [sendSystemMessage, fetchChatRooms]
  );

  const demoteAdmin = useCallback(
    async (chatRoomId: string, userId: string, displayName: string) => {
      await supabase.from("chat_members").update({ role: "member" } as any).eq("chat_room_id", chatRoomId).eq("user_id", userId);
      await sendSystemMessage(chatRoomId, `${displayName} is no longer an admin`);
      await fetchChatRooms();
    },
    [sendSystemMessage, fetchChatRooms]
  );

  const reactionsRef = useRef<Reaction[]>([]);
  useEffect(() => { reactionsRef.current = reactions; }, [reactions]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;
    // Use ref to avoid stale closure
    const existing = reactionsRef.current.find(
      (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji
    );
    if (existing) {
      // Optimistic remove
      setReactions((prev) => prev.filter((r) => r.id !== existing.id));
      const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
      if (error) {
        // Rollback on failure
        setReactions((prev) => [...prev, existing]);
      }
    } else {
      // Optimistic add with temp id
      const tempId = `temp-${Date.now()}`;
      const optimistic: Reaction = { id: tempId, message_id: messageId, user_id: user.id, emoji };
      setReactions((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select().single();
      if (error) {
        // Rollback
        setReactions((prev) => prev.filter((r) => r.id !== tempId));
      } else if (data) {
        // Replace temp with real
        setReactions((prev) => prev.map((r) => r.id === tempId ? data as Reaction : r));
      }
    }
  }, [user]);

  const pinMessage = useCallback(async (chatRoomId: string, messageId: string, text: string) => {
    await supabase.from("chat_rooms").update({ pinned_message_id: messageId, pinned_message_text: text } as any).eq("id", chatRoomId);
    await fetchChatRooms();
  }, [fetchChatRooms]);

  const unpinMessage = useCallback(async (chatRoomId: string) => {
    await supabase.from("chat_rooms").update({ pinned_message_id: null, pinned_message_text: null } as any).eq("id", chatRoomId);
    await fetchChatRooms();
  }, [fetchChatRooms]);

  const clearChat = useCallback(async (chatRoomId: string) => {
    await supabase.from("messages").delete().eq("chat_room_id", chatRoomId);
    setMessages([]);
    await fetchChatRooms();
  }, [fetchChatRooms]);

  const archiveChat = useCallback(async (chatRoomId: string, archive: boolean) => {
    await supabase.from("chat_rooms").update({ is_archived: archive } as any).eq("id", chatRoomId);
    await fetchChatRooms();
  }, [fetchChatRooms]);

  const forwardMessage = useCallback(async (content: string, fileUrl: string | undefined, fileType: string | undefined, fileName: string | undefined, targetRoomIds: string[]) => {
    if (!user) return;
    await Promise.all(targetRoomIds.map((roomId) =>
      supabase.from("messages").insert({
        chat_room_id: roomId,
        sender_id: user.id,
        content,
        file_url: fileUrl || null,
        file_type: fileType || null,
        file_name: fileName || null,
      })
    ));
  }, [user]);

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      await supabase.from("messages").update({ content: newText, is_edited: true } as any).eq("id", messageId);
    },
    []
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      await supabase.from("messages").update({ content: "🚫 This message was deleted", file_url: null, file_type: "deleted" } as any).eq("id", messageId);
    },
    []
  );

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;
    fetchChatRooms();
  }, [user, fetchChatRooms]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Typing indicator via Realtime presence
  useEffect(() => {
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }
    setIsOtherTyping(false);
    if (!activeChatId || !user) return;

    const channel = supabase.channel(`typing:${activeChatId}`, {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing: boolean }>();
        const others = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .some(([, presences]) => presences.some((p) => p.typing));
        setIsOtherTyping(others);
      })
      .subscribe();

    typingChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [activeChatId, user]);

  const sendTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel || !user) return;
    channel.track({ typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => channel.track({ typing: false }), 2000);
  }, [user]);

  // ── PWA app badge — total unread across all rooms ──
  useEffect(() => {
    const total = chatRooms.reduce((sum, r) => sum + r.unreadCount, 0);
    if ("setAppBadge" in navigator) {
      if (total > 0) {
        (navigator as any).setAppBadge(total).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
    // Also update document title
    document.title = total > 0 ? `(${total}) ChatFlow` : "ChatFlow";
  }, [chatRooms]);

  // Request push notification permission
  useEffect(() => {
    if (!user || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    let channel: RealtimeChannel;

    channel = supabase
      .channel(`messages-realtime-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.chat_room_id === activeChatId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (newMsg.sender_id !== user.id) {
              supabase.from("messages").update({ is_read: true } as any).eq("id", newMsg.id).then(() => {}).catch(() => {});
            }
          } else if (newMsg.sender_id !== user.id) {
            // Mark as delivered — fire and forget, ignore if column missing
            supabase.from("messages").update({ is_delivered: true } as any).eq("id", newMsg.id).then(() => {}).catch(() => {});
          }
          if (newMsg.sender_id !== user.id && document.hidden) {
            // Push notification when app is in background
            if (Notification.permission === "granted" && !newMsg.file_type?.startsWith("call/")) {
              const { data: sender } = await supabase
                .from("profiles")
                .select("display_name, username")
                .eq("id", newMsg.sender_id)
                .single();
              const name = sender?.display_name || sender?.username || "Someone";
              new Notification(`New message from ${name}`, {
                body: newMsg.content,
                icon: "/favicon.ico",
              });
            }
          }
          fetchChatRooms();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => { fetchChatRooms(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms" },
        () => { fetchChatRooms(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => { setReactions((prev) => prev.some((r) => r.id === (payload.new as Reaction).id) ? prev : [...prev, payload.new as Reaction]); }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reactions" },
        (payload) => { setReactions((prev) => prev.filter((r) => r.id !== (payload.old as any).id)); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user, activeChatId, fetchChatRooms]);

  return {
    chatRooms, activeChat, activeChatId, setActiveChatId,
    messages, reactions, sendMessage,
    createDirectMessage, acceptRequest, declineRequest, createGroupChat,
    removeMember, leaveGroup, promoteToAdmin, demoteAdmin,
    editMessage, deleteMessage, sendSystemMessage,
    toggleReaction, pinMessage, unpinMessage,
    loading, fetchChatRooms, isOtherTyping, sendTyping,
    clearChat, archiveChat, forwardMessage,
  };
}
