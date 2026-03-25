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
  created_at: string;
}

export interface EnrichedChatRoom extends ChatRoom {
  members: ChatMember[];
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
  displayName: string;
  displayAvatar: string;
  otherMemberStatus?: string;
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

    // Batch all queries in parallel
    const [roomsRes, allMembersRes] = await Promise.all([
      supabase.from("chat_rooms").select("*").in("id", roomIds),
      supabase.from("chat_members").select("chat_room_id, user_id").in("chat_room_id", roomIds),
    ]);

    const rooms = roomsRes.data;
    if (!rooms) { setLoading(false); return; }

    const allMemberRows = allMembersRes.data || [];
    const allUserIds = [...new Set(allMemberRows.map((m) => m.user_id))];

    const [profilesRes, lastMsgsRes] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url, status, last_seen").in("id", allUserIds),
      supabase.from("messages").select("*").in("chat_room_id", roomIds).order("created_at", { ascending: false }),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    const allMessages = lastMsgsRes.data || [];

    const enriched: EnrichedChatRoom[] = rooms.map((room) => {
      const roomMemberIds = allMemberRows.filter((m) => m.chat_room_id === room.id).map((m) => m.user_id);
      const members: ChatMember[] = roomMemberIds.map((uid) => ({
        user_id: uid,
        profiles: profileMap.get(uid) as ChatMember["profiles"],
      })).filter((m) => m.profiles);

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
  }, [activeChatId, user]);

  // Send message
  const sendMessage = useCallback(
    async (text: string, fileUrl?: string, fileType?: string, fileName?: string) => {
      if (!user || !activeChatId || (!text.trim() && !fileUrl)) return;

      const insertData: any = {
        chat_room_id: activeChatId,
        sender_id: user.id,
        content: text.trim() || (fileName ? `📎 ${fileName}` : "File"),
      };
      if (fileUrl) insertData.file_url = fileUrl;
      if (fileType) insertData.file_type = fileType;
      if (fileName) insertData.file_name = fileName;

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

      const members = [user.id, ...memberIds].map((id) => ({
        chat_room_id: newRoom.id,
        user_id: id,
      }));

      await supabase.from("chat_members").insert(members);
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
              supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
            }
          } else if (newMsg.sender_id !== user.id && document.hidden) {
            // Push notification when app is in background
            if (Notification.permission === "granted") {
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
