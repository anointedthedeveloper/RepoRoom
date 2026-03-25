import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/hooks/useChat";
import { useWebRTC } from "@/hooks/useWebRTC";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatPanel from "@/components/chat/ChatPanel";
import EmptyChatPanel from "@/components/chat/EmptyChatPanel";
import CallOverlay from "@/components/chat/CallOverlay";
import { AnimatePresence } from "framer-motion";

const ChatPage = () => {
  const { user } = useAuth();
  const {
    chatRooms,
    activeChat,
    activeChatId,
    setActiveChatId,
    messages,
    sendMessage,
    createDirectMessage,
    createGroupChat,
  } = useChat();

  const {
    callState,
    callType,
    remoteUsername,
    localStream,
    remoteStream,
    callDuration,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC();

  const handleCreateDM = useCallback(
    async (userId: string) => {
      const roomId = await createDirectMessage(userId);
      if (roomId) setActiveChatId(roomId);
    },
    [createDirectMessage, setActiveChatId]
  );

  const handleCreateGroup = useCallback(
    async (name: string, memberIds: string[]) => {
      const roomId = await createGroupChat(name, memberIds);
      if (roomId) setActiveChatId(roomId);
    },
    [createGroupChat, setActiveChatId]
  );

  const handleStartCall = useCallback(
    (type: "audio" | "video") => {
      if (!activeChat) return;
      // Find the other user in DM
      const otherMember = activeChat.members.find(
        (m: any) => m.user_id !== user?.id
      );
      if (otherMember) {
        startCall(otherMember.user_id, type);
      }
    },
    [activeChat, user, startCall]
  );

  const handleAcceptCall = useCallback(() => {
    const signal = (window as any).__pendingCallSignal;
    if (signal) {
      acceptCall(signal);
      delete (window as any).__pendingCallSignal;
    }
  }, [acceptCall]);

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="w-80 shrink-0">
        <ChatSidebar
          chats={chatRooms}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onCreateDM={handleCreateDM}
          onCreateGroup={handleCreateGroup}
        />
      </div>
      <div className="flex-1">
        {activeChat ? (
          <ChatPanel
            chat={activeChat}
            messages={messages}
            onSendMessage={(text, fileUrl, fileType, fileName) => sendMessage(text, fileUrl, fileType, fileName)}
            onStartCall={handleStartCall}
          />
        ) : (
          <EmptyChatPanel />
        )}
      </div>

      <AnimatePresence>
        {callState !== "idle" && (
          <CallOverlay
            callState={callState}
            callType={callType}
            remoteUsername={remoteUsername}
            localStream={localStream}
            remoteStream={remoteStream}
            callDuration={callDuration}
            onAccept={handleAcceptCall}
            onEnd={endCall}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
