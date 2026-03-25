import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, PhoneMissed, Video, VideoOff, Mic, MicOff } from "lucide-react";

interface CallOverlayProps {
  callState: "idle" | "calling" | "receiving" | "connected";
  callType: "audio" | "video";
  remoteUsername: string;
  remoteAvatarUrl?: string | null;
  localAvatarUrl?: string | null;
  localUsername?: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  onAccept: () => void;
  onEnd: () => void;
  onReject: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const formatDuration = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const CallOverlay = ({
  callState, callType, remoteUsername, remoteAvatarUrl, localAvatarUrl, localUsername,
  localStream, remoteStream, callDuration,
  onAccept, onEnd, onReject, onToggleMute, onToggleVideo,
}: CallOverlayProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);

  // Sync mute/video state from actual track state
  useEffect(() => {
    if (!localStream) { setIsMuted(false); setIsVideoOff(false); return; }
    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    if (audioTrack) setIsMuted(!audioTrack.enabled);
    if (videoTrack) setIsVideoOff(!videoTrack.enabled);
  }, [localStream]);

  // Camera preview for incoming video call (before accepting)
  useEffect(() => {
    if (callState === "receiving" && callType === "video") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          previewStreamRef.current = stream;
          if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
        })
        .catch(() => {});
    } else {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    }
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    };
  }, [callState, callType]);

  // Track whether remote video is actually sending frames
  useEffect(() => {
    if (!remoteStream) { setRemoteVideoActive(false); return; }
    const videoTrack = remoteStream.getVideoTracks()[0];
    if (!videoTrack) { setRemoteVideoActive(false); return; }
    setRemoteVideoActive(videoTrack.enabled && videoTrack.readyState === "live");
    const onMute = () => setRemoteVideoActive(false);
    const onUnmute = () => setRemoteVideoActive(true);
    videoTrack.addEventListener("mute", onMute);
    videoTrack.addEventListener("unmute", onUnmute);
    return () => {
      videoTrack.removeEventListener("mute", onMute);
      videoTrack.removeEventListener("unmute", onUnmute);
    };
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === "idle") return null;

  const isVideo = callType === "video";
  const isConnected = callState === "connected";
  const showRemoteVideo = isVideo && isConnected && remoteStream && remoteVideoActive;
  const showLocalVideo = isVideo && localStream && !isVideoOff;

  // Avatar fallback helpers
  const RemoteAvatar = () => (
    <div className="flex flex-col items-center gap-3">
      {remoteAvatarUrl ? (
        <img src={remoteAvatarUrl} alt={remoteUsername} className="h-24 w-24 rounded-full object-cover border-2 border-white/20 shadow-2xl" />
      ) : (
        <div className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-white shadow-2xl">
          {remoteUsername[0]?.toUpperCase() || "?"}
        </div>
      )}
      <span className="text-white font-semibold text-lg">{remoteUsername}</span>
    </div>
  );

  const LocalAvatar = () => (
    <div className="flex flex-col items-center gap-1">
      {localAvatarUrl ? (
        <img src={localAvatarUrl} alt={localUsername} className="h-full w-full rounded-xl object-cover" />
      ) : (
        <div className="h-full w-full rounded-xl gradient-primary flex items-center justify-center text-lg font-bold text-white">
          {localUsername?.[0]?.toUpperCase() || "?"}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      <div className={`absolute inset-0 ${isVideo && isConnected ? "bg-black" : "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900"}`} />

      {/* Remote video — full screen */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showRemoteVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Remote avatar — shown when remote camera is off during connected video call */}
      {isVideo && isConnected && !showRemoteVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <RemoteAvatar />
        </div>
      )}

      {/* Local video (connected) or preview (receiving) */}
      <video
        ref={localVideoRef}
        autoPlay playsInline muted
        className={`absolute z-10 rounded-xl object-cover border-2 border-primary shadow-lg transition-all duration-300 ${
          showLocalVideo && isConnected
            ? "bottom-28 right-4 w-28 h-20 opacity-100"
            : isVideo && localStream && isConnected && isVideoOff
            ? "opacity-0 pointer-events-none w-28 h-20 bottom-28 right-4"
            : "opacity-0 pointer-events-none w-0 h-0"
        }`}
      />

      {/* Local avatar pip — shown when camera is off during connected video call */}
      {isVideo && isConnected && isVideoOff && (
        <div className="absolute z-10 bottom-28 right-4 w-28 h-20 rounded-xl border-2 border-primary shadow-lg overflow-hidden">
          <LocalAvatar />
        </div>
      )}

      {/* Camera preview before accepting incoming video call */}
      <AnimatePresence>
        {callState === "receiving" && isVideo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-36 right-4 z-20 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl"
          >
            <video ref={previewVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-[10px] text-white/70 bg-black/40 px-1.5 py-0.5 rounded-full">Preview</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <audio ref={remoteAudioRef} autoPlay />

      {/* Center info — shown when no remote video */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 gap-5 px-6">
        {!showRemoteVideo && (
          <>
            <div className="relative flex items-center justify-center">
              {(callState === "calling" || callState === "receiving") && [1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-white/20"
                  animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                  style={{ width: 96, height: 96 }}
                />
              ))}
              {remoteAvatarUrl ? (
                <img src={remoteAvatarUrl} alt={remoteUsername} className="h-24 w-24 rounded-full object-cover border-2 border-white/20 shadow-2xl z-10" />
              ) : (
                <div className="h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold text-white shadow-2xl z-10">
                  {remoteUsername[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{remoteUsername}</h2>
              <p className="text-sm text-white/60 mt-1">
                {callState === "calling" && "Calling..."}
                {callState === "receiving" && `Incoming ${callType} call`}
                {callState === "connected" && formatDuration(callDuration)}
              </p>
            </div>
          </>
        )}
        {isVideo && isConnected && showRemoteVideo && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full">
            <span className="text-white text-sm font-medium">{formatDuration(callDuration)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-20 pb-12 flex flex-col items-center gap-5">
        {isConnected && (
          <div className="flex items-center gap-4">
            <button onClick={() => { onToggleMute(); setIsMuted((m) => !m); }}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {isVideo && (
              <button onClick={() => { onToggleVideo(); setIsVideoOff((v) => !v); }}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-8">
          {callState === "receiving" && (
            <>
              <div className="flex flex-col items-center gap-2">
                <button onClick={onReject} className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
                  <PhoneMissed className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={onAccept} className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-400 transition-colors">
                  <Phone className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Accept</span>
              </div>
            </>
          )}
          {(callState === "calling" || isConnected) && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={onEnd} className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
                <PhoneOff className="h-7 w-7 text-white" />
              </button>
              <span className="text-xs text-white/60">{callState === "calling" ? "Cancel" : "End"}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CallOverlay;
