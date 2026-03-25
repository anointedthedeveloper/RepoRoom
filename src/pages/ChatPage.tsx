import { useCallback, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/hooks/useChat";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatPanel from "@/components/chat/ChatPanel";
import EmptyChatPanel from "@/components/chat/EmptyChatPanel";
import CallOverlay from "@/components/chat/CallOverlay";
import UserProfilePanel from "@/components/chat/UserProfilePanel";
import { AnimatePresence, motion } from "framer-motion";

const ChatPage = () => {
  const { user, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [secondChatId, setSecondChatId] = useState<string | null>(null);
  const [secondMessages, setSecondMessages] = useState<any[]>([]);
  const [secondProfileOpen, setSecondProfileOpen] = useState(false);

  const {
    chatRooms, activeChat, activeChatId, setActiveChatId,
    messages, reactions, sendMessage, createDirectMessage, createGroupChat,
    acceptRequest, declineRequest,
    removeMember, leaveGroup, promoteToAdmin, demoteAdmin,
    editMessage, deleteMessage, sendSystemMessage,
    toggleReaction, pinMessage, unpinMessage,
    isOtherTyping, sendTyping, fetchChatRooms,
    clearChat, archiveChat, forwardMessage,
  } = useChat();

  const { callState, callType, remoteUserId, remoteUsername, localStream, remoteStream,
    callDuration, isScreenSharing, isMuted, isVideoOff, remoteVideoOff, facingMode,
    startCall, startGroupCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo, startScreenShare, stopScreenShare,
    upgradeToVideo, flipCamera,
  } = useWebRTC();

  // Resolve remote user's avatar from any chat room they're in
  const remoteAvatarUrl = chatRooms
    .flatMap((r) => r.members)
    .find((m) => m.user_id === remoteUserId)?.profiles?.avatar_url ?? null;

  const handleCreateDM = useCallback(async (userId: string) => {
    const roomId = await createDirectMessage(userId);
    if (roomId) { setActiveChatId(roomId); setSidebarOpen(false); }
  }, [createDirectMessage, setActiveChatId]);

  const handleCreateGroup = useCallback(async (name: string, memberIds: string[]) => {
    const roomId = await createGroupChat(name, memberIds);
    if (roomId) { setActiveChatId(roomId); setSidebarOpen(false); }
  }, [createGroupChat, setActiveChatId]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [setActiveChatId]);

  const handleStartCall = useCallback((type: "audio" | "video") => {
    if (!activeChat) return;
    if (activeChat.is_group) {
      // Call all group members except self
      const otherMembers = activeChat.members
        .filter((m: any) => m.user_id !== user?.id)
        .map((m: any) => m.user_id);
      if (otherMembers.length > 0) {
        startGroupCall(otherMembers, type, activeChat.id);
      }
    } else {
      const otherMember = activeChat.members.find((m: any) => m.user_id !== user?.id);
      if (otherMember) startCall(otherMember.user_id, type);
    }
  }, [activeChat, user, startCall, startGroupCall]);

  const handleAcceptCall = useCallback(() => {
    const signal = (window as any).__pendingCallSignal;
    if (signal) acceptCall(signal);
  }, [acceptCall]);

  // Fetch + subscribe messages for second panel
  useEffect(() => {
    if (!secondChatId) { setSecondMessages([]); return; }
    supabase.from("messages").select("*").eq("chat_room_id", secondChatId).order("created_at", { ascending: true })
      .then(({ data }) => setSecondMessages(data || []));
    const ch = supabase.channel(`second-msgs-${secondChatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_room_id=eq.${secondChatId}` },
        (payload) => setSecondMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new as any]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [secondChatId]);

  const handleSendSecondMessage = useCallback(async (text: string, fileUrl?: string, fileType?: string, fileName?: string, replyToId?: string, replyToText?: string, replyToSender?: string) => {
    if (!user || !secondChatId || (!text.trim() && !fileUrl)) return;
    const insertData: any = { chat_room_id: secondChatId, sender_id: user.id, content: text.trim() || (fileName ? `📎 ${fileName}` : "File") };
    if (fileUrl) insertData.file_url = fileUrl;
    if (fileType) insertData.file_type = fileType;
    if (fileName) insertData.file_name = fileName;
    if (replyToId) insertData.reply_to_id = replyToId;
    if (replyToText) insertData.reply_to_text = replyToText;
    if (replyToSender) insertData.reply_to_sender = replyToSender;
    await supabase.from("messages").insert(insertData);
  }, [user, secondChatId]);

  // Open a second chat in split view
  const handleOpenSecondChat = useCallback((id: string) => {
    setSecondChatId(id === secondChatId ? null : id);
    setSecondProfileOpen(false);
  }, [secondChatId]);

  const secondChat = chatRooms.find((c) => c.id === secondChatId) || null;

  return (
    <div className="h-screen flex overflow-hidden bg-background">

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-30 w-80 shrink-0 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <ChatSidebar
          chats={chatRooms}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onCreateDM={handleCreateDM}
          onCreateGroup={handleCreateGroup}
          onOpenSecondChat={handleOpenSecondChat}
          secondChatId={secondChatId}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Primary chat — full width on mobile/tablet, half on desktop when split */}
        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${
          secondChat ? "hidden lg:flex lg:w-1/2 lg:border-r lg:border-border" : "flex-1"
        }`}>
          {activeChat ? (
            <ChatPanel
              chat={activeChat}
              messages={messages}
              reactions={reactions}
              allChats={chatRooms.map((r) => ({ id: r.id, displayName: r.displayName }))}
              onSendMessage={(text, fileUrl, fileType, fileName, replyToId, replyToText, replyToSender) =>
                sendMessage(text, fileUrl, fileType, fileName, replyToId, replyToText, replyToSender)}
              onEditMessage={editMessage}
              onDeleteMessage={deleteMessage}
              onReact={(msgId, emoji) => toggleReaction(msgId, emoji)}
              onPin={(msgId, text) => pinMessage(activeChat.id, msgId, text)}
              onUnpin={() => unpinMessage(activeChat.id)}
              onForward={(content, fileUrl, fileType, fileName, targetRoomIds) =>
                forwardMessage(content, fileUrl, fileType, fileName, targetRoomIds || [])}
              onClearChat={() => clearChat(activeChat.id)}
              onAcceptRequest={() => acceptRequest(activeChat.id)}
              onDeclineRequest={() => { declineRequest(activeChat.id); setActiveChatId(null); }}
              onStartCall={handleStartCall}
              onTyping={sendTyping}
              isOtherTyping={isOtherTyping}
              onToggleSidebar={() => setSidebarOpen(true)}
              onToggleProfile={() => setProfileOpen((p) => !p)}
              onCloseChat={() => { setActiveChatId(null); setProfileOpen(false); }}
              profileOpen={profileOpen}
            />
          ) : (
            <EmptyChatPanel onToggleSidebar={() => setSidebarOpen(true)} />
          )}
        </div>

        {/* Second chat panel — only on desktop lg+ */}
        <AnimatePresence>
          {secondChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "50%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="hidden lg:flex overflow-hidden flex-col"
            >
              <ChatPanel
                chat={secondChat}
                messages={secondMessages}
                onSendMessage={handleSendSecondMessage}
                onStartCall={() => {}}
                onToggleSidebar={() => { setSecondChatId(null); setSecondProfileOpen(false); }}
                profileOpen={false}
                isSecondPanel
                onToggleSecondProfile={() => setSecondProfileOpen((p) => !p)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile panel */}
        {activeChat && (
          <UserProfilePanel
            chat={activeChat}
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            onStartCall={handleStartCall}
            onRefresh={fetchChatRooms}
            onClearChat={clearChat}
            onArchiveChat={archiveChat}
            onRemoveMember={removeMember}
            onLeaveGroup={leaveGroup}
            onPromoteToAdmin={promoteToAdmin}
            onDemoteAdmin={demoteAdmin}
            onSendSystemMessage={sendSystemMessage}
          />
        )}

        {/* Second panel profile */}
        {secondChat && (
          <UserProfilePanel
            chat={secondChat}
            open={secondProfileOpen}
            onClose={() => setSecondProfileOpen(false)}
            onStartCall={() => {}}
            onRefresh={fetchChatRooms}
            onRemoveMember={removeMember}
            onLeaveGroup={leaveGroup}
            onPromoteToAdmin={promoteToAdmin}
            onDemoteAdmin={demoteAdmin}
            onSendSystemMessage={sendSystemMessage}
          />
        )}
      </div>

      <AnimatePresence>
        {callState !== "idle" && (
          <CallOverlay
            callState={callState}
            callType={callType}
            remoteUsername={remoteUsername}
            remoteAvatarUrl={remoteAvatarUrl}
            localAvatarUrl={profile?.avatar_url ?? null}
            localUsername={profile?.display_name || profile?.username || "You"}
            localStream={localStream}
            remoteStream={remoteStream}
            callDuration={callDuration}
            isScreenSharing={isScreenSharing}
            onAccept={handleAcceptCall}
            onEnd={endCall}
            onReject={rejectCall}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onUpgradeToVideo={upgradeToVideo}
            onFlipCamera={flipCamera}
            facingMode={facingMode}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            remoteVideoOff={remoteVideoOff}
            onStartScreenShare={startScreenShare}
            onStopScreenShare={stopScreenShare}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
