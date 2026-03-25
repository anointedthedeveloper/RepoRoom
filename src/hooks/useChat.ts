import { useState, useEffect, useCallback } from "react";
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

    const { data: rooms } = await supabase
      .from("chat_rooms")
      .select("*")
      .in("id", roomIds);

    if (!rooms) {
      setLoading(false);
      return;
    }

    const enriched: EnrichedChatRoom[] = await Promise.all(
      rooms.map(async (room) => {
        // Get members
        const { data: roomMemberRows } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_room_id", room.id);

        const memberUserIds = (roomMemberRows || []).map((m) => m.user_id);
        const { data: memberProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, status, last_seen")
          .in("id", memberUserIds);

        const members: ChatMember[] = (memberProfiles || []).map((p) => ({
          user_id: p.id,
          profiles: p,
        }));

        // Get last message
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // Get unread count
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_room_id", room.id)
          .eq("is_read", false)
          .neq("sender_id", user.id);

        const otherMember = members.find(
          (m) => m.user_id !== user.id
        );

        const displayName = room.is_group
          ? room.name || "Group Chat"
          : otherMember?.profiles?.display_name || otherMember?.profiles?.username || "Unknown";

        const displayAvatar = displayName[0]?.toUpperCase() || "?";

        return {
          ...room,
          members,
          messages: [],
          lastMessage: msgs?.[0] || undefined,
          unreadCount: count || 0,
          displayName,
          displayAvatar,
          otherMemberStatus: otherMember?.profiles?.status,
        };
      })
    );

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

      // Check if DM already exists
      const { data: myRooms } = await supabase
        .from("chat_members")
        .select("chat_room_id")
        .eq("user_id", user.id);

      if (myRooms) {
        for (const room of myRooms) {
          const { data: otherMember } = await supabase
            .from("chat_members")
            .select("user_id")
            .eq("chat_room_id", room.chat_room_id)
            .eq("user_id", otherUserId)
            .single();

          if (otherMember) {
            const { data: roomData } = await supabase
              .from("chat_rooms")
              .select("*")
              .eq("id", room.chat_room_id)
              .eq("is_group", false)
              .single();

            if (roomData) return roomData.id;
          }
        }
      }

      // Create new DM room
      const { data: newRoom } = await supabase
        .from("chat_rooms")
        .insert({ is_group: false, created_by: user.id })
        .select()
        .single();

      if (!newRoom) return null;

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

  useEffect(() => {
    if (!user) return;

    let channel: RealtimeChannel;

    channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          // If it's for the active chat, add to messages
          if (newMsg.chat_room_id === activeChatId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Mark as read
            if (newMsg.sender_id !== user.id) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMsg.id);
            }
          }
          // Refresh chat list
          fetchChatRooms();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          fetchChatRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
  };
}
