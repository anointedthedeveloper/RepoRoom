import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type CallState = "idle" | "calling" | "receiving" | "connected";

interface CallSignal {
  type: "offer" | "answer" | "ice-candidate" | "end-call";
  from: string;
  to: string;
  data?: any;
  callType?: "audio" | "video";
  fromUsername?: string;
}

export function useWebRTC() {
  const { user, profile } = useAuth();
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [remoteUsername, setRemoteUsername] = useState<string>("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUserId(null);
    remoteUserIdRef.current = null;
    setCallDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Send signal via Supabase DB table (more reliable than broadcast with new key format)
  const sendSignal = useCallback(
    async (signal: Omit<CallSignal, "from">) => {
      if (!user) return;
      await supabase.from("call_signals").insert({
        from_user: user.id,
        to_user: signal.to,
        signal_type: signal.type,
        signal_data: signal.data ? JSON.stringify(signal.data) : null,
        call_type: signal.callType || null,
        from_username: profile?.display_name || profile?.username || "Unknown",
      });
    },
    [user, profile]
  );

  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ type: "ice-candidate", to: targetUserId, data: event.candidate });
        }
      };

      pc.ontrack = (event) => setRemoteStream(event.streams[0]);

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("connected");
          timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          cleanup();
        }
      };

      peerConnection.current = pc;
      return pc;
    },
    [sendSignal, cleanup]
  );

  const startCall = useCallback(
    async (targetUserId: string, type: "audio" | "video") => {
      if (!user) return;
      setCallType(type);
      setRemoteUserId(targetUserId);
      remoteUserIdRef.current = targetUserId;
      setCallState("calling");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = createPeerConnection(targetUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal({ type: "offer", to: targetUserId, data: offer, callType: type });
      } catch (err) {
        console.error("Failed to start call:", err);
        cleanup();
      }
    },
    [user, createPeerConnection, sendSignal, cleanup]
  );

  const acceptCall = useCallback(
    async (signal: CallSignal) => {
      if (!user) return;
      const type = signal.callType || "audio";
      setCallType(type);
      setRemoteUserId(signal.from);
      remoteUserIdRef.current = signal.from;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = createPeerConnection(signal.from);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal({ type: "answer", to: signal.from, data: answer });
      } catch (err) {
        console.error("Failed to accept call:", err);
        cleanup();
      }
    },
    [user, createPeerConnection, sendSignal, cleanup]
  );

  const endCall = useCallback(() => {
    const rid = remoteUserIdRef.current;
    if (rid) sendSignal({ type: "end-call", to: rid });
    cleanup();
  }, [sendSignal, cleanup]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  // Listen for incoming signals via postgres_changes on call_signals table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`call-signals-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as any;
          const signal: CallSignal = {
            type: row.signal_type,
            from: row.from_user,
            to: row.to_user,
            data: row.signal_data ? JSON.parse(row.signal_data) : undefined,
            callType: row.call_type,
            fromUsername: row.from_username,
          };

          switch (signal.type) {
            case "offer":
              setRemoteUserId(signal.from);
              remoteUserIdRef.current = signal.from;
              setRemoteUsername(signal.fromUsername || "Unknown");
              setCallType(signal.callType || "audio");
              setCallState("receiving");
              (window as any).__pendingCallSignal = signal;
              break;
            case "answer":
              if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.data));
              }
              break;
            case "ice-candidate":
              if (peerConnection.current) {
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.data));
              }
              break;
            case "end-call":
              cleanup();
              break;
          }

          // Clean up the signal row
          await supabase.from("call_signals").delete().eq("id", row.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, cleanup]);

  return {
    callState, callType, remoteUserId, remoteUsername,
    localStream, remoteStream, callDuration,
    startCall, acceptCall, endCall, toggleMute, toggleVideo,
  };
}
