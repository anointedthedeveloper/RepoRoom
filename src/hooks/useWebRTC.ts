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
  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUserId(null);
    setCallDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [localStream]);

  const sendSignal = useCallback(
    (signal: Omit<CallSignal, "from">) => {
      if (!user || !channelRef.current) return;
      channelRef.current.send({
        type: "broadcast",
        event: "call-signal",
        payload: { ...signal, from: user.id, fromUsername: profile?.username || "Unknown" },
      });
    },
    [user, profile]
  );

  const createPeerConnection = useCallback(
    (targetUserId: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            to: targetUserId,
            data: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("connected");
          timerRef.current = setInterval(() => {
            setCallDuration((d) => d + 1);
          }, 1000);
        } else if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed"
        ) {
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
      setCallState("calling");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        setLocalStream(stream);

        const pc = createPeerConnection(targetUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignal({
          type: "offer",
          to: targetUserId,
          data: offer,
          callType: type,
        });
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

      setCallState("connected");
      const type = signal.callType || "audio";
      setCallType(type);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video",
        });
        setLocalStream(stream);

        const pc = createPeerConnection(signal.from);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendSignal({
          type: "answer",
          to: signal.from,
          data: answer,
        });
      } catch (err) {
        console.error("Failed to accept call:", err);
        cleanup();
      }
    },
    [user, createPeerConnection, sendSignal, cleanup]
  );

  const endCall = useCallback(() => {
    if (remoteUserId) {
      sendSignal({ type: "end-call", to: remoteUserId });
    }
    cleanup();
  }, [remoteUserId, sendSignal, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
    }
  }, [localStream]);

  // Listen for call signals
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`calls-${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "call-signal" }, ({ payload }) => {
        const signal = payload as CallSignal;
        if (signal.to !== user.id) return;

        switch (signal.type) {
          case "offer":
            setRemoteUserId(signal.from);
            setRemoteUsername(signal.fromUsername || "Unknown");
            setCallType(signal.callType || "audio");
            setCallState("receiving");
            // Store the signal for when user accepts
            (window as any).__pendingCallSignal = signal;
            break;

          case "answer":
            if (peerConnection.current) {
              peerConnection.current.setRemoteDescription(
                new RTCSessionDescription(signal.data)
              );
            }
            break;

          case "ice-candidate":
            if (peerConnection.current) {
              peerConnection.current.addIceCandidate(
                new RTCIceCandidate(signal.data)
              );
            }
            break;

          case "end-call":
            cleanup();
            break;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, cleanup]);

  // Also subscribe to target user's channel when calling
  useEffect(() => {
    if (!user || !remoteUserId) return;

    const targetChannel = supabase.channel(`calls-${remoteUserId}`, {
      config: { broadcast: { self: false } },
    });

    targetChannel.subscribe();

    // Update the channelRef to point to the target's channel for sending
    const originalChannel = channelRef.current;
    channelRef.current = targetChannel;

    return () => {
      supabase.removeChannel(targetChannel);
      channelRef.current = originalChannel;
    };
  }, [user, remoteUserId]);

  return {
    callState,
    callType,
    remoteUserId,
    remoteUsername,
    localStream,
    remoteStream,
    callDuration,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}
