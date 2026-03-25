import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff, PhoneMissed, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff } from "lucide-react";
import { Sounds, unlockAudio } from "@/lib/sounds";

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
  isScreenSharing?: boolean;
  onAccept: () => void;
  onEnd: () => void;
  onReject: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const CallOverlay = ({
  callState, callType, remoteUsername, remoteAvatarUrl, localAvatarUrl, localUsername,
  localStream, remoteStream, callDuration, isScreenSharing,
  onAccept, onEnd, onReject, onToggleMute, onToggleVideo, onStartScreenShare, onStopScreenShare,
}: CallOverlayProps) => {
  // mainVideoRef  = full-screen video (remote normally, local when swapped)
  // selfVideoRef  = PiP self-preview (local normally, remote when swapped)
  // previewRef    = camera preview shown to receiver before accepting
  const mainVideoRef   = useRef<HTMLVideoElement>(null);
  const selfVideoRef   = useRef<HTMLVideoElement>(null);
  const previewRef     = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const [isMuted,           setIsMuted]           = useState(false);
  const [isVideoOff,        setIsVideoOff]        = useState(false);
  const [swapped,           setSwapped]           = useState(false);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [prevState,         setPrevState]         = useState(callState);

  // Sound effects on state transitions
  useEffect(() => {
    if (prevState === callState) return;
    if (callState === "idle" && prevState === "connected") Sounds.callEnd();
    if (callState === "idle" && prevState === "receiving") Sounds.callDecline();
    setPrevState(callState);
  }, [callState, prevState]);

  // Sync mute/video toggle state from actual tracks
  useEffect(() => {
    if (!localStream) { setIsMuted(false); setIsVideoOff(false); return; }
    const a = localStream.getAudioTracks()[0];
    const v = localStream.getVideoTracks()[0];
    if (a) setIsMuted(!a.enabled);
    if (v) setIsVideoOff(!v.enabled);
  }, [localStream]);

  // Remote audio — always plays regardless of video state
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) el.play().catch(() => {});
  }, [remoteStream]);

  // Main video: remote (default) or local (when swapped)
  useEffect(() => {
    const el = mainVideoRef.current;
    if (!el) return;
    el.srcObject = swapped ? localStream : remoteStream;
    if (el.srcObject) el.play().catch(() => {});
  }, [swapped, localStream, remoteStream]);

  // Self PiP: local (default) or remote (when swapped)
  // Shown as soon as localStream exists — covers calling + connected states
  useEffect(() => {
    const el = selfVideoRef.current;
    if (!el) return;
    el.srcObject = swapped ? remoteStream : localStream;
    if (el.srcObject) el.play().catch(() => {});
  }, [swapped, localStream, remoteStream]);

  // Track remote video active state
  useEffect(() => {
    if (!remoteStream) { setRemoteVideoActive(false); return; }
    const vt = remoteStream.getVideoTracks()[0];
    if (!vt) { setRemoteVideoActive(false); return; }
    const update = () => setRemoteVideoActive(vt.enabled && vt.readyState === "live");
    update();
    vt.addEventListener("mute", update);
    vt.addEventListener("unmute", update);
    vt.addEventListener("ended", update);
    return () => {
      vt.removeEventListener("mute", update);
      vt.removeEventListener("unmute", update);
      vt.removeEventListener("ended", update);
    };
  }, [remoteStream]);

  // Camera preview before accepting a video call
  useEffect(() => {
    if (callState === "receiving" && callType === "video") {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => {
          previewStreamRef.current = s;
          if (previewRef.current) {
            previewRef.current.srcObject = s;
            previewRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      if (previewRef.current) previewRef.current.srcObject = null;
    }
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    };
  }, [callState, callType]);

  const handleSwap = useCallback(() => setSwapped((s) => !s), []);

  if (callState === "idle") return null;

  const isVideo     = callType === "video";
  const isConnected = callState === "connected";
  // Show full-screen remote video only when connected
  const showMainVideo = isVideo && isConnected;
  // Show self PiP as soon as we have a local stream during a video call
  const showSelfPip = isVideo && !!localStream && (callState === "calling" || callState === "connected");

  const wa = (fn: () => void) => () => { unlockAudio(); fn(); };

  const AvatarCircle = ({ url, name, size = "lg" }: { url?: string | null; name: string; size?: "sm" | "lg" }) => {
    const sz = size === "lg" ? "h-24 w-24 text-3xl" : "h-10 w-10 text-sm";
    return url
      ? <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-white/20 shadow-2xl`} />
      : <div className={`${sz} rounded-full gradient-primary flex items-center justify-center font-bold text-white shadow-2xl`}>{name[0]?.toUpperCase() || "?"}</div>;
  };

  // What the PiP label and avatar fallback should show
  const pipLabel    = swapped ? remoteUsername : "You";
  const pipAvatarUrl = swapped ? remoteAvatarUrl : localAvatarUrl;
  const pipAvatarName = swapped ? remoteUsername : (localUsername || "You");
  const pipCameraOff = swapped ? !remoteVideoActive : isVideoOff;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col select-none"
    >
      {/* Background */}
      <div className={`absolute inset-0 ${showMainVideo ? "bg-black" : "bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900"}`} />

      {/* Main full-screen video (remote when connected, hidden otherwise) */}
      <video ref={mainVideoRef} autoPlay playsInline muted={swapped}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showMainVideo ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* Avatar overlay on main when remote camera is off */}
      {showMainVideo && !swapped && !remoteVideoActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 z-10">
          <AvatarCircle url={remoteAvatarUrl} name={remoteUsername} />
          <span className="text-white/60 text-sm">{remoteUsername} turned off camera</span>
        </div>
      )}
      {showMainVideo && swapped && isVideoOff && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 z-10">
          <AvatarCircle url={localAvatarUrl} name={localUsername || "You"} />
          <span className="text-white/60 text-sm">Your camera is off</span>
        </div>
      )}

      {/* Self PiP — visible as soon as local stream is available (calling + connected) */}
      {showSelfPip && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute z-20 rounded-2xl overflow-hidden border-2 border-primary shadow-2xl"
          style={{ bottom: 130, right: 16, width: 108, height: 78 }}
          whileTap={isConnected ? { scale: 0.95 } : undefined}
          onClick={isConnected ? handleSwap : undefined}
          title={isConnected ? "Tap to swap" : "Your camera preview"}
        >
          <video ref={selfVideoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black" />
          {pipCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85">
              <AvatarCircle url={pipAvatarUrl} name={pipAvatarName} size="sm" />
            </div>
          )}
          <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
            <span className="text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-full">
              {pipLabel}{isConnected ? " · tap" : ""}
            </span>
          </div>
        </motion.div>
      )}

      {/* Camera preview before accepting a video call */}
      <div
        className={`absolute z-20 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-black transition-all duration-300 ${
          callState === "receiving" && isVideo ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ bottom: 176, right: 16, width: 112, height: 80 }}
      >
        <video ref={previewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none">
          <span className="text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-full">You</span>
        </div>
      </div>

      {/* Remote audio — always rendered, never visible */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {/* Center info */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 gap-4 px-6">
        {!isConnected && (
          <>
            <div className="relative flex items-center justify-center">
              {[1, 2, 3].map((i) => (
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
        {isConnected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full z-30">
            <span className="text-white text-sm font-medium">{fmt(callDuration)}</span>
          </div>
        )}
        {isConnected && !isVideo && (
          <div className="flex flex-col items-center gap-3">
            <AvatarCircle url={remoteAvatarUrl} name={remoteUsername} />
            <span className="text-white text-lg font-semibold">{remoteUsername}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-20 pb-10 flex flex-col items-center gap-4">
        {isConnected && (
          <div className="flex items-center gap-3">
            <button onClick={wa(() => { onToggleMute(); setIsMuted((m) => !m); })}
              className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {isVideo && (
              <>
                <button onClick={wa(() => { onToggleVideo(); setIsVideoOff((v) => !v); })}
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? "bg-white/30 text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}>
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </button>
                <button
                  onClick={wa(() => isScreenSharing ? onStopScreenShare?.() : onStartScreenShare?.())}
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${isScreenSharing ? "bg-primary text-white" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                  title={isScreenSharing ? "Stop sharing" : "Share screen"}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-8">
          {callState === "receiving" && (
            <>
              <div className="flex flex-col items-center gap-2">
                <button onClick={wa(() => { Sounds.callDecline(); onReject(); })}
                  className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/80 transition-colors">
                  <PhoneMissed className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={wa(() => { Sounds.callAccept(); onAccept(); })}
                  className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:bg-green-400 transition-colors">
                  <Phone className="h-7 w-7 text-white" />
                </button>
                <span className="text-xs text-white/60">Accept</span>
              </div>
            </>
          )}
          {(callState === "calling" || isConnected) && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={wa(() => { Sounds.callEnd(); onEnd(); })}
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
