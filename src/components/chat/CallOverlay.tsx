import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, PhoneMissed, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff } from "lucide-react";
import { Sounds } from "@/lib/sounds";

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

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const CallOverlay = ({
  callState, callType, remoteUsername, remoteAvatarUrl, localAvatarUrl, localUsername,
  localStream, remoteStream, callDuration,
  onAccept, onEnd, onReject, onToggleMute, onToggleVideo,
}: CallOverlayProps) => {
  const mainVideoRef   = useRef<HTMLVideoElement>(null);
  const pipVideoRef    = useRef<HTMLVideoElement>(null);
  const previewRef     = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef  = useRef<MediaStream | null>(null);

  const [isMuted,       setIsMuted]       = useState(false);
  const [isVideoOff,    setIsVideoOff]    = useState(false);
  const [isSharing,     setIsSharing]     = useState(false);
  const [swapped,       setSwapped]       = useState(false); // true = local is main
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [prevState, setPrevState] = useState(callState);

  // Sound effects on state transitions
  useEffect(() => {
    if (prevState !== callState) {
      if (callState === "connected") Sounds.callAccept();
      if (callState === "idle" && prevState === "connected") Sounds.callEnd();
      if (callState === "idle" && prevState === "receiving") Sounds.callDecline();
      setPrevState(callState);
    }
  }, [callState, prevState]);

  // Sync mute/video from actual track state
  useEffect(() => {
    if (!localStream) { setIsMuted(false); setIsVideoOff(false); return; }
    const a = localStream.getAudioTracks()[0];
    const v = localStream.getVideoTracks()[0];
    if (a) setIsMuted(!a.enabled);
    if (v) setIsVideoOff(!v.enabled);
  }, [localStream]);

  // Camera preview before accepting
  useEffect(() => {
    if (callState === "receiving" && callType === "video") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => { previewStreamRef.current = s; if (previewRef.current) previewRef.current.srcObject = s; })
        .catch(() => {});
    } else {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      if (previewRef.current) previewRef.current.srcObject = null;
    }
    return () => { previewStreamRef.current?.getTracks().forEach((t) => t.stop()); previewStreamRef.current = null; };
  }, [callState, callType]);

  // Track remote video active
  useEffect(() => {
    if (!remoteStream) { setRemoteVideoActive(false); return; }
    const vt = remoteStream.getVideoTracks()[0];
    if (!vt) { setRemoteVideoActive(false); return; }
    setRemoteVideoActive(vt.enabled && vt.readyState === "live");
    const onMute   = () => setRemoteVideoActive(false);
    const onUnmute = () => setRemoteVideoActive(true);
    vt.addEventListener("mute", onMute);
    vt.addEventListener("unmute", onUnmute);
    return () => { vt.removeEventListener("mute", onMute); vt.removeEventListener("unmute", onUnmute); };
  }, [remoteStream]);

  // Wire video elements based on swap state
  useEffect(() => {
    const mainStream = swapped ? localStream : remoteStream;
    const pipStream  = swapped ? remoteStream : localStream;
    if (mainVideoRef.current) mainVideoRef.current.srcObject = mainStream;
    if (pipVideoRef.current)  pipVideoRef.current.srcObject  = pipStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [swapped, localStream, remoteStream]);

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (isSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsSharing(false);
      // Restore camera track
      if (localStream) {
        const camTrack = localStream.getVideoTracks()[0];
        if (camTrack && mainVideoRef.current) {
          const s = new MediaStream([camTrack]);
          if (!swapped && mainVideoRef.current) mainVideoRef.current.srcObject = remoteStream;
          if (swapped && mainVideoRef.current) mainVideoRef.current.srcObject = localStream;
        }
      }
    } else {
      try {
        const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screen;
        setIsSharing(true);
        // Show screen as main regardless of swap
        if (mainVideoRef.current) mainVideoRef.current.srcObject = screen;
        screen.getVideoTracks()[0].onended = () => {
          setIsSharing(false);
          screenStreamRef.current = null;
          if (mainVideoRef.current) mainVideoRef.current.srcObject = swapped ? localStream : remoteStream;
        };
      } catch {}
    }
  }, [isSharing, localStream, remoteStream, swapped]);

  if (callState === "idle") return null;

  const isVideo     = callType === "video";
  const isConnected = callState === "connected";
  const showVideo   = isVideo && isConnected;
  const showRemoteVideo = showVideo && remoteStream && remoteVideoActive && !isSharing;

  const AvatarCircle = ({ url, name, size = "lg" }: { url?: string | null; name: string; size?: "sm" | "lg" }) => {
    const sz = size === "lg" ? "h-24 w-24 text-3xl" : "h-10 w-10 text-base";
    return url
      ? <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-white/20 shadow-2xl`} />
      : <div className={`${sz} rounded-full gradient-primary flex items-center justify-center font-bold text-white shadow-2xl`}>{name[0]?.toUpperCase() || "?"}</div>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col select-none"
    >
      {/* Background */}
      <div className={`absolute inset-0 ${showVideo ? "bg-black" : "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900"}`} />

      {/* Main video (remote or screen or swapped local) */}
      <video ref={mainVideoRef} autoPlay playsInline muted={swapped}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Remote avatar when camera off */}
      {showVideo && !showRemoteVideo && !isSharing && !swapped && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <AvatarCircle url={remoteAvatarUrl} name={remoteUsername} />
        </div>
      )}

      {/* PiP — tappable to swap */}
      {showVideo && (
        <motion.div
          className="absolute z-20 rounded-2xl overflow-hidden border-2 border-primary shadow-2xl cursor-pointer"
          style={{ bottom: 120, right: 16, width: 100, height: 72 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSwapped((s) => !s)}
          title="Tap to swap"
        >
          <video ref={pipVideoRef} autoPlay playsInline muted={!swapped}
            className="w-full h-full object-cover"
          />
          {/* Show avatar if pip is local and video off */}
          {!swapped && isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <AvatarCircle url={localAvatarUrl} name={localUsername || "You"} size="sm" />
            </div>
          )}
          <div className="absolute bottom-1 left-0 right-0 text-center">
            <span className="text-[9px] text-white/60 bg-black/40 px-1 rounded-full">
              {swapped ? remoteUsername : "You"} · tap to swap
            </span>
          </div>
        </motion.div>
      )}

      {/* Camera preview before accepting */}
      <AnimatePresence>
        {callState === "receiving" && isVideo && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="absolute bottom-40 right-4 z-20 w-28 h-20 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl"
          >
            <video ref={previewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-[9px] text-white/70 bg-black/40 px-1.5 py-0.5 rounded-full">Preview</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={remoteAudioRef} autoPlay />

      {/* Center info */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-4 px-6">
        {(!showVideo || (!showRemoteVideo && !isSharing && !swapped)) && !isConnected && (
          <>
            <div className="relative flex items-center justify-center">
              {(callState === "calling" || callState === "receiving") && [1, 2, 3].map((i) => (
                <motion.div key={i} className="absolute rounded-full border border-white/20"
                  animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
                  style={{ width: 96, height: 96 }}
                />
              ))}
              <AvatarCircle url={remoteAvatarUrl} name={remoteUsername} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{remoteUsername}</h2>
              <p className="text-sm text-white/60 mt-1">
                {callState === "calling" && "Calling..."}
                {callState === "receiving" && `Incoming ${callType} call`}
              </p>
            </div>
          </>
        )}

        {/* Duration overlay */}
        {isConnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-4 py-1.5 rounded-full z-30">
            <span className="text-white text-sm font-medium">{fmt(callDuration)}</span>
            {isSharing && <span className="ml-2 text-green-400 text-xs">● Sharing screen</span>}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-20 pb-10 flex flex-col items-center gap-4">
        {isConnected && (
          <div className="flex items-center gap-3">
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
            {isVideo && (
              <button onClick={toggleScreenShare}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isSharing ? "bg-green-500/60 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                title="Share screen">
                {isSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-8">
          {callState === "receiving" && (
            <>
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => { Sounds.callDecline(); onReject(); }}
                  className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
                  <PhoneMissed className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => { Sounds.callAccept(); onAccept(); }}
                  className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-400 transition-colors">
                  <Phone className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Accept</span>
              </div>
            </>
          )}
          {(callState === "calling" || isConnected) && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => { Sounds.callEnd(); onEnd(); }}
                className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
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
