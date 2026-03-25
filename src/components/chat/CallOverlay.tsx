import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useState } from "react";

interface CallOverlayProps {
  callState: "idle" | "calling" | "receiving" | "connected";
  callType: "audio" | "video";
  remoteUsername: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  onAccept: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const CallOverlay = ({
  callState,
  callType,
  remoteUsername,
  localStream,
  remoteStream,
  callDuration,
  onAccept,
  onEnd,
  onToggleMute,
  onToggleVideo,
}: CallOverlayProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === "idle") return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center"
    >
      {/* Video area */}
      {callType === "video" && callState === "connected" ? (
        <div className="relative w-full h-full">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 w-32 h-24 rounded-xl object-cover border-2 border-primary"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={callState === "calling" || callState === "receiving" ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-primary-foreground"
          >
            {remoteUsername[0]?.toUpperCase() || "?"}
          </motion.div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">{remoteUsername}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {callState === "calling" && "Calling..."}
              {callState === "receiving" && "Incoming call..."}
              {callState === "connected" && formatDuration(callDuration)}
            </p>
          </div>
          {/* Hidden audio element for audio-only calls */}
          <audio ref={remoteVideoRef as any} autoPlay />
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-12 flex items-center gap-4">
        <button
          onClick={() => { setIsMuted(!isMuted); onToggleMute(); }}
          className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground hover:bg-muted-foreground/20"
          }`}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {callType === "video" && (
          <button
            onClick={() => { setIsVideoOff(!isVideoOff); onToggleVideo(); }}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
              isVideoOff ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground hover:bg-muted-foreground/20"
            }`}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}

        {callState === "receiving" && (
          <button
            onClick={onAccept}
            className="h-14 w-14 rounded-full bg-online flex items-center justify-center text-primary-foreground"
          >
            <Phone className="h-6 w-6" />
          </button>
        )}

        <button
          onClick={onEnd}
          className="h-14 w-14 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </motion.div>
  );
};

export default CallOverlay;
