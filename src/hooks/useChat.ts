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
  created_at: string;
  file_type?: string | null;
  reply_to_id?: string | null;
  reply_to_text?: string | null;
  reply_to_sender?: string | null;
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
}

export function useChat() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<EnrichedChatRoom[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
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
      supabase.from("profiles").select("id, username, display_name, avatar_url, status, last_seen").in("id", allUserIds),
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
      return;
    }

    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_room_id", activeChatId)
      .order("created_at", { ascending: true });

    setMessages(data || []);

    // Mark unread as read
    if (user) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("chat_room_id", activeChatId)
        .eq("is_read", false)
        .neq("sender_id", user.id);
    }
    // Mark as delivered — silently skip if column doesn't exist
    if (user) {
      supabase
        .from("messages")
        .update({ is_delivered: true } as any)
        .eq("chat_room_id", activeChatId)
        .neq("sender_id", user.id)
        .then(() => {}) // fire and forget, ignore 400 if column missing
        .catch(() => {});
    }
  }, [activeChatId, user]);

  // Send message
  const sendMessage = useCallback(
    async (text: string, fileUrl?: string, fileType?: string, fileName?: string, replyToId?: string, replyToText?: string, replyToSender?: string) => {
      if (!user || !activeChatId || (!text.trim() && !fileUrl)) return;

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

      await supabase.from("messages").insert(insertData);
    },
    [user, activeChatId]
  );

  // Create DM
  const createDirectMessage = useCallback(
    async (otherUserId: string) => {
      if (!user) return null;

      // Find existing DM by checking shared non-group rooms
      const { data: myRooms } = await supabase
        .from("chat_members")
        .select("chat_room_id")
        .eq("user_id", user.id);

      const { data: theirRooms } = await supabase
        .from("chat_members")
        .select("chat_room_id")
        .eq("user_id", otherUserId);

      if (myRooms && theirRooms) {
        const myIds = new Set(myRooms.map((r) => r.chat_room_id));
        const shared = theirRooms.find((r) => myIds.has(r.chat_room_id));
        if (shared) {
          // Verify it's a non-group room
          const { data: roomData } = await supabase
            .from("chat_rooms")
            .select("id, is_group")
            .eq("id", shared.chat_room_id)
            .eq("is_group", false)
            .maybeSingle();
          if (roomData) {
            await fetchChatRooms();
            return roomData.id;
          }
        }
      }

      // Create new DM room
      const { data: newRoom, error } = await supabase
        .from("chat_rooms")
        .insert({ is_group: false, created_by: user.id })
        .select()
        .single();

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

      // Creator gets admin role — silently skip role if column doesn't exist
      const baseMembers = [
        { chat_room_id: newRoom.id, user_id: user.id },
        ...memberIds.map((id) => ({ chat_room_id: newRoom.id, user_id: id })),
      ];
      await supabase.from("chat_members").insert(baseMembers);
      // Try to set admin role — ignore error if column missing
      supabase.from("chat_members").update({ role: "admin" } as any)
        .eq("chat_room_id", newRoom.id).eq("user_id", user.id).then(() => {}).catch(() => {});
      await fetchChatRooms();
      return newRoom.id;
    },
    [user, fetchChatRooms]
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

  // Request push notification permission
  useEffect(() => {
    if (!user || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let channel: RealtimeChannel;

    channel = supabase
      .channel("messages-realtime")
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
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, is_read: updated.is_read, is_delivered: (updated as any).is_delivered } : m));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeChatId, fetchChatRooms]);

  return {
    chatRooms,
    activeChat,
    activeChatId,
    setActiveChatId,
    messages,
    sendMessage,
    createDirectMessage,
    createGroupChat,
    loading,
    fetchChatRooms,
    isOtherTyping,
    sendTyping,
  };
}
