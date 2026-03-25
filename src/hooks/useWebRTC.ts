import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type CallState = "idle" | "calling" | "receiving" | "connected";

interface CallSignal {
  type: "offer" | "answer" | "ice-candidate" | "end-call" | "reject-call";
  from: string;
  to: string;
  data?: any;
  callType?: "audio" | "video";
  fromUsername?: string;
  chatRoomId?: string;
}

// Generate ringtone using Web Audio API — no file needed
function createRingtone(): { start: () => void; stop: () => void } {
  let ctx: AudioContext | null = null;
  let osc: OscillatorNode | null = null;
  let gain: GainNode | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;

  const ring = () => {
    ctx = new AudioContext();
    gain = ctx.createGain();
    gain.gain.value = 0.3;
    gain.connect(ctx.destination);

    const play = (freq: number, start: number, dur: number) => {
      osc = ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain!);
      osc.start(ctx!.currentTime + start);
      osc.stop(ctx!.currentTime + start + dur);
    };
    play(880, 0, 0.15);
    play(1100, 0.2, 0.15);
    play(880, 0.4, 0.15);
  };

  return {
    start: () => {
      ring();
      interval = setInterval(ring, 3000);
    },
    stop: () => {
      if (interval) { clearInterval(interval); interval = null; }
      try { ctx?.close(); } catch {}
      ctx = null; osc = null; gain = null;
    },
  };
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
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const chatRoomIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringtoneRef = useRef(createRingtone());
  const callTypeRef = useRef<"audio" | "video">("audio");

  // Send a call status message into the chat
  const sendCallMessage = useCallback(async (roomId: string, text: string, type: "call/audio" | "call/video") => {
    if (!user || !roomId) return;
    await supabase.from("messages").insert({
      chat_room_id: roomId,
      sender_id: user.id,
      content: text,
      file_type: type,
      is_read: false,
    });
  }, [user]);

  const cleanup = useCallback((status?: "ended" | "missed" | "rejected" | "no-answer") => {
    ringtoneRef.current.stop();

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Send call indicator message
    const roomId = chatRoomIdRef.current;
    if (roomId && status) {
      const dur = callStartTimeRef.current
        ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
        : 0;
      const type = callTypeRef.current === "video" ? "call/video" : "call/audio";
      let text = "";
      if (status === "ended") text = `Call ended · ${dur < 60 ? `${dur}s` : `${Math.floor(dur / 60)}m ${dur % 60}s`}`;
      else if (status === "missed") text = "Missed call";
      else if (status === "rejected") text = "Call declined";
      else if (status === "no-answer") text = "No answer";
      if (text) sendCallMessage(roomId, text, type);
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUserId(null);
    remoteUserIdRef.current = null;
    chatRoomIdRef.current = null;
    callStartTimeRef.current = 0;
    setCallDuration(0);
  }, [sendCallMessage]);

  const sendSignal = useCallback(async (signal: Omit<CallSignal, "from">) => {
    if (!user) return;
    await supabase.from("call_signals").insert({
      from_user: user.id,
      to_user: signal.to,
      signal_type: signal.type,
      signal_data: signal.data ? JSON.stringify(signal.data) : null,
      call_type: signal.callType || null,
      from_username: profile?.display_name || profile?.username || "Unknown",
      chat_room_id: signal.chatRoomId || chatRoomIdRef.current || null,
    });
  }, [user, profile]);

  const createPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: "ice-candidate", to: targetUserId, data: e.candidate });
    };

    pc.ontrack = (e) => setRemoteStream(e.streams[0]);

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        ringtoneRef.current.stop();
        setCallState("connected");
        callStartTimeRef.current = Date.now();
        timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanup("ended");
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [sendSignal, cleanup]);

  // Find or create DM room between two users for call messages
  const getOrCreateCallRoom = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;
    const { data: myRooms } = await supabase.from("chat_members").select("chat_room_id").eq("user_id", user.id);
    const { data: theirRooms } = await supabase.from("chat_members").select("chat_room_id").eq("user_id", otherUserId);
    if (myRooms && theirRooms) {
      const myIds = new Set(myRooms.map((r) => r.chat_room_id));
      const shared = theirRooms.find((r) => myIds.has(r.chat_room_id));
      if (shared) {
        const { data } = await supabase.from("chat_rooms").select("id").eq("id", shared.chat_room_id).eq("is_group", false).maybeSingle();
        if (data) return data.id;
      }
    }
    const { data: newRoom } = await supabase.from("chat_rooms").insert({ is_group: false, created_by: user.id }).select().single();
    if (!newRoom) return null;
    await supabase.from("chat_members").insert([
      { chat_room_id: newRoom.id, user_id: user.id },
      { chat_room_id: newRoom.id, user_id: otherUserId },
    ]);
    return newRoom.id;
  }, [user]);

  const startCall = useCallback(async (targetUserId: string, type: "audio" | "video") => {
    if (!user) return;
    callTypeRef.current = type;
    setCallType(type);
    setRemoteUserId(targetUserId);
    remoteUserIdRef.current = targetUserId;
    setCallState("calling");

    // Get chat room for call messages
    const roomId = await getOrCreateCallRoom(targetUserId);
    chatRoomIdRef.current = roomId;
    setActiveChatRoomId(roomId);

    // Start outgoing ringtone
    ringtoneRef.current.start();

    // Background notification
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      new Notification("Calling...", { body: `${type} call in progress`, icon: "/favicon.ico" });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(targetUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal({ type: "offer", to: targetUserId, data: offer, callType: type, chatRoomId: roomId || undefined });
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanup("no-answer");
    }
  }, [user, createPeerConnection, sendSignal, cleanup, getOrCreateCallRoom]);

  const acceptCall = useCallback(async (signal: CallSignal) => {
    if (!user) return;
    ringtoneRef.current.stop();
    const type = signal.callType || "audio";
    callTypeRef.current = type;
    setCallType(type);
    setRemoteUserId(signal.from);
    remoteUserIdRef.current = signal.from;
    if (signal.chatRoomId) chatRoomIdRef.current = signal.chatRoomId;

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
      cleanup("ended");
    }
  }, [user, createPeerConnection, sendSignal, cleanup]);

  const rejectCall = useCallback(() => {
    const rid = remoteUserIdRef.current;
    if (rid) sendSignal({ type: "reject-call", to: rid });
    cleanup("rejected");
  }, [sendSignal, cleanup]);

  const endCall = useCallback(() => {
    const rid = remoteUserIdRef.current;
    if (rid) sendSignal({ type: "end-call", to: rid });
    cleanup("ended");
  }, [sendSignal, cleanup]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
  }, []);

  // Listen for incoming signals
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`call-signals-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as any;
          const signal: CallSignal = {
            type: row.signal_type,
            from: row.from_user,
            to: row.to_user,
            data: row.signal_data ? JSON.parse(row.signal_data) : undefined,
            callType: row.call_type,
            fromUsername: row.from_username,
            chatRoomId: row.chat_room_id,
          };

          switch (signal.type) {
            case "offer":
              setRemoteUserId(signal.from);
              remoteUserIdRef.current = signal.from;
              setRemoteUsername(signal.fromUsername || "Unknown");
              callTypeRef.current = signal.callType || "audio";
              setCallType(signal.callType || "audio");
              setCallState("receiving");
              if (signal.chatRoomId) chatRoomIdRef.current = signal.chatRoomId;
              (window as any).__pendingCallSignal = signal;

              // Play ringtone for incoming call
              ringtoneRef.current.start();

              // Background notification
              if (document.hidden && "Notification" in window && Notification.permission === "granted") {
                const n = new Notification(`Incoming ${signal.callType || "audio"} call`, {
                  body: `${signal.fromUsername} is calling you`,
                  icon: "/favicon.ico",
                  requireInteraction: true,
                });
                n.onclick = () => window.focus();
              }
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
              // If we were calling and they ended = no answer; if connected = ended
              if (callState === "calling") cleanup("no-answer");
              else cleanup("ended");
              break;

            case "reject-call":
              cleanup("rejected");
              break;
          }

          await supabase.from("call_signals").delete().eq("id", row.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, cleanup, callState]);

  // Keep screen awake during call using Wake Lock API
  useEffect(() => {
    if (callState === "idle") return;
    let wakeLock: any = null;
    if ("wakeLock" in navigator) {
      (navigator as any).wakeLock.request("screen").then((wl: any) => { wakeLock = wl; }).catch(() => {});
    }
    return () => { wakeLock?.release?.(); };
  }, [callState]);

  return {
    callState, callType, remoteUserId, remoteUsername,
    localStream, remoteStream, callDuration,
    startCall, acceptCall, rejectCall, endCall, toggleMute, toggleVideo,
  };
}
