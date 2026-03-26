import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getAudioContext } from "@/lib/sounds";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
  // Metered TURN — works across different networks, NAT, mobile, firewalls
  {
    urls: "turn:a.relay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:a.relay.metered.ca:80?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:a.relay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turns:a.relay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

type CallState = "idle" | "calling" | "receiving" | "connected";

export interface CallSignal {
  type: "offer" | "answer" | "ice-candidate" | "end-call" | "reject-call" | "video-toggle" | "upgrade-video" | "call-busy";
  from: string;
  to: string;
  data?: any;
  callType?: "audio" | "video";
  fromUsername?: string;
  chatRoomId?: string;
}

function createRingtone() {
  let interval: ReturnType<typeof setInterval> | null = null;

  const RINGTONE_FREQS: Record<string, number[][]> = {
    default: [[880, 0, 0.15], [1100, 0.2, 0.15], [880, 0.4, 0.15]],
    classic: [[660, 0, 0.2],  [660, 0.3, 0.2],  [660, 0.6, 0.2]],
    soft:    [[523, 0, 0.3],  [659, 0.35, 0.3], [784, 0.7, 0.3]],
    pulse:   [[1000,0,0.08],  [1000,0.15,0.08], [1000,0.3,0.08], [1000,0.45,0.08]],
  };

  const playTone = (ctx: AudioContext) => {
    try {
      const key = localStorage.getItem("chatflow_ringtone") || "default";
      const freqs = RINGTONE_FREQS[key] || RINGTONE_FREQS.default;
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      gain.connect(ctx.destination);
      freqs.forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(t + start);
        osc.stop(t + start + dur);
      });
    } catch (e) { console.error("[Ringtone] playTone error:", e); }
  };

  const ring = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "running") { playTone(ctx); }
    else { ctx.resume().then(() => playTone(ctx)).catch(() => {}); }
  };

  return {
    start: () => { ring(); interval = setInterval(ring, 3000); },
    stop: () => { if (interval) { clearInterval(interval); interval = null; } },
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteUserIdRef = useRef<string | null>(null);
  const chatRoomIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const ringtoneRef = useRef(createRingtone());
  const callTypeRef = useRef<"audio" | "video">("audio");
  const callStateRef = useRef<CallState>("idle");
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => { callStateRef.current = callState; }, [callState]);

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
    peerConnection.current?.close();
    peerConnection.current = null;
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const roomId = chatRoomIdRef.current;
    if (roomId && status) {
      const dur = callStartTimeRef.current ? Math.round((Date.now() - callStartTimeRef.current) / 1000) : 0;
      const type = callTypeRef.current === "video" ? "call/video" : "call/audio";
      const texts: Record<string, string> = {
        ended: `Call ended · ${dur < 60 ? `${dur}s` : `${Math.floor(dur / 60)}m ${dur % 60}s`}`,
        missed: "Missed call",
        rejected: "Call declined",
        "no-answer": "No answer",
      };
      if (texts[status]) sendCallMessage(roomId, texts[status], type);
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState("idle");
    setRemoteUserId(null);
    setRemoteUsername("");
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoOff(false);
    setRemoteVideoOff(false);
    remoteUserIdRef.current = null;
    chatRoomIdRef.current = null;
    callStartTimeRef.current = 0;
    iceCandidateQueue.current = [];
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

  const onConnected = useCallback(() => {
    if (callStateRef.current === "connected") return;
    ringtoneRef.current.stop();
    setCallState("connected");
    callStartTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  }, []);

  const syncLocalStream = useCallback((stream: MediaStream) => {
    localStreamRef.current = stream;
    setLocalStream(new MediaStream(stream.getTracks()));
    setIsMuted(stream.getAudioTracks().every((track) => !track.enabled));
    const videoTracks = stream.getVideoTracks();
    setIsVideoOff(videoTracks.length > 0 ? videoTracks.every((track) => !track.enabled) : true);
  }, []);

  const ensureVideoTrack = useCallback(async () => {
    const existingStream = localStreamRef.current;
    const existingVideoTrack = existingStream?.getVideoTracks()[0] ?? null;
    if (existingVideoTrack && existingVideoTrack.readyState === "live") {
      callTypeRef.current = "video";
      setCallType("video");
      setIsVideoOff(!existingVideoTrack.enabled);
      return existingStream!;
    }

    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    });
    const videoTrack = cameraStream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error("Could not acquire a camera track for video call");
    }

    let mergedStream: MediaStream;
    if (existingStream) {
      mergedStream = new MediaStream([
        ...existingStream.getAudioTracks(),
        ...existingStream.getVideoTracks().filter((track) => track.readyState === "live"),
      ]);
      existingStream.getVideoTracks().forEach((track) => {
        existingStream.removeTrack(track);
        if (track.readyState === "live") track.stop();
      });
      mergedStream.addTrack(videoTrack);
    } else {
      mergedStream = new MediaStream([videoTrack]);
    }

    syncLocalStream(mergedStream);

    const allPCs = [peerConnection.current, ...Array.from(peerConnections.current.values())].filter(Boolean) as RTCPeerConnection[];
    for (const pc of allPCs) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(videoTrack).catch(() => {});
      } else {
        pc.addTrack(videoTrack, mergedStream);
      }
    }

    callTypeRef.current = "video";
    setCallType("video");
    setIsVideoOff(!videoTrack.enabled);
    return mergedStream;
  }, [syncLocalStream]);

  const createPeerConnection = useCallback((targetUserId: string, forGroup = false) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: "ice-candidate", to: targetUserId, data: e.candidate.toJSON() });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        onConnected();
      } else if (pc.iceConnectionState === "failed") {
        console.warn("[WebRTC] ICE failed — attempting restart");
        pc.restartIce();
        setTimeout(() => {
          if (pc.iceConnectionState === "failed") cleanup("ended");
        }, 8000);
      } else if (pc.iceConnectionState === "disconnected") {
        // Give it 8s to recover before ending
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            cleanup("ended");
          }
        }, 8000);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") onConnected();
      else if (pc.connectionState === "failed") cleanup("ended");
    };

    pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      } else {
        // Fallback: build stream from track using a ref-safe approach
        setRemoteStream((existing) => {
          if (existing) {
            existing.addTrack(e.track);
            return new MediaStream(existing.getTracks());
          }
          return new MediaStream([e.track]);
        });
      }
    };

    if (forGroup) {
      peerConnections.current.set(targetUserId, pc);
    } else {
      peerConnection.current = pc;
    }
    return pc;
  }, [sendSignal, cleanup, onConnected]);

  const getOrCreateCallRoom = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;
    const [{ data: myRooms }, { data: theirRooms }] = await Promise.all([
      supabase.from("chat_members").select("chat_room_id").eq("user_id", user.id),
      supabase.from("chat_members").select("chat_room_id").eq("user_id", otherUserId),
    ]);
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
    ringtoneRef.current.start();

    try {
      // Get media and room in parallel — saves ~500ms
      const [stream, roomId] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        }),
        getOrCreateCallRoom(targetUserId),
      ]);

      chatRoomIdRef.current = roomId;
      syncLocalStream(stream);

      const pc = createPeerConnection(targetUserId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
      await pc.setLocalDescription(offer);
      await sendSignal({ type: "offer", to: targetUserId, data: pc.localDescription, callType: type, chatRoomId: roomId || undefined });
    } catch (err) {
      console.error("[WebRTC] startCall failed:", err);
      cleanup("no-answer");
    }
  }, [user, createPeerConnection, sendSignal, cleanup, getOrCreateCallRoom]);

  const startGroupCall = useCallback(async (memberIds: string[], type: "audio" | "video", chatRoomId: string) => {
    if (!user) return;
    callTypeRef.current = type;
    setCallType(type);
    setCallState("calling");
    chatRoomIdRef.current = chatRoomId;
    ringtoneRef.current.start();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      syncLocalStream(stream);

      for (const memberId of memberIds) {
        const pc = createPeerConnection(memberId, true);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === "video" });
        await pc.setLocalDescription(offer);
        await sendSignal({ type: "offer", to: memberId, data: pc.localDescription, callType: type, chatRoomId });
      }
      setRemoteUserId(memberIds[0]);
      remoteUserIdRef.current = memberIds[0];
    } catch (err) {
      console.error("[WebRTC] startGroupCall failed:", err);
      cleanup("no-answer");
    }
  }, [user, createPeerConnection, sendSignal, cleanup]);

  const acceptCall = useCallback(async (signal: CallSignal) => {
    if (!user || !signal.data) return;
    ringtoneRef.current.stop();
    const type = signal.callType || "audio";
    callTypeRef.current = type;
    setCallType(type);
    setRemoteUserId(signal.from);
    remoteUserIdRef.current = signal.from;
    setRemoteUsername(signal.fromUsername || "Unknown");
    if (signal.chatRoomId) chatRoomIdRef.current = signal.chatRoomId;
    setCallState("calling");
    delete (window as any).__pendingCallSignal;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === "video" ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      syncLocalStream(stream);

      const pc = createPeerConnection(signal.from);
      stream.getTracks().forEach((t) => {
        console.log("[WebRTC] addTrack (callee):", t.kind);
        pc.addTrack(t, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(signal.data));

      // Flush queued ICE candidates
      for (const c of iceCandidateQueue.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) => console.error("[WebRTC] queued ICE error:", e));
      }
      iceCandidateQueue.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal({ type: "answer", to: signal.from, data: pc.localDescription });
    } catch (err) {
      console.error("[WebRTC] acceptCall failed:", err);
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
    // If we never connected, treat as no-answer (avoids "Call ended · 0s")
    cleanup(callStateRef.current === "calling" ? "no-answer" : "ended");
  }, [sendSignal, cleanup]);

  const [isMuted,       setIsMuted]       = useState(false);
  const [isVideoOff,    setIsVideoOff]    = useState(false);
  const [remoteVideoOff, setRemoteVideoOff] = useState(false);
  const [facingMode,    setFacingMode]    = useState<"user" | "environment">("user");

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsMuted(!t.enabled);
    });
  }, []);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
      setIsVideoOff(!t.enabled);
      const rid = remoteUserIdRef.current;
      if (rid) sendSignal({ type: "video-toggle", to: rid, data: { videoOff: !t.enabled } });
    });
  }, [sendSignal]);

  // Upgrade audio call to video
  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack | null) => {
    const allPCs = [peerConnection.current, ...Array.from(peerConnections.current.values())].filter(Boolean) as RTCPeerConnection[];
    for (const pc of allPCs) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        const track = newTrack ?? localStreamRef.current?.getVideoTracks()[0] ?? null;
        if (track) await sender.replaceTrack(track).catch(() => {});
      }
    }
  }, []);

  const upgradeToVideo = useCallback(async (notify = true) => {
    if (callTypeRef.current === "video") return;
    try {
      await ensureVideoTrack();

      const allPCs = [peerConnection.current, ...Array.from(peerConnections.current.values())].filter(Boolean) as RTCPeerConnection[];
      for (const pc of allPCs) {
        // Only the initiator renegotiates to avoid offer glare
        if (notify && pc.signalingState === "stable") {
          const rid = remoteUserIdRef.current;
          if (rid) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await sendSignal({ type: "offer", to: rid, data: pc.localDescription, callType: "video" });
          }
        }
      }
      // Notify remote to upgrade their camera too
      if (notify) {
        const rid = remoteUserIdRef.current;
        if (rid) await sendSignal({ type: "upgrade-video", to: rid });
      }
    } catch (err) {
      console.error("[WebRTC] upgradeToVideo failed:", err);
    }
  }, [ensureVideoTrack, sendSignal]);

  // Flip between front and back camera (mobile)
  const flipCamera = useCallback(async () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: nextFacing },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;
      // Replace in local stream
      const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStreamRef.current?.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      localStreamRef.current?.addTrack(newVideoTrack);
      setLocalStream(new MediaStream(localStreamRef.current?.getTracks() || [newVideoTrack]));
      // Replace on peer connections
      await replaceVideoTrack(newVideoTrack);
      setFacingMode(nextFacing);
    } catch (err) {
      console.error("[WebRTC] flipCamera failed:", err);
    }
  }, [facingMode, replaceVideoTrack]);

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screen;
      const screenTrack = screen.getVideoTracks()[0];
      await replaceVideoTrack(screenTrack);
      setIsScreenSharing(true);
      screenTrack.onended = async () => {
        await replaceVideoTrack(null);
        screenStreamRef.current = null;
        setIsScreenSharing(false);
      };
    } catch (err) {
      console.error("[WebRTC] screen share failed:", err);
    }
  }, [replaceVideoTrack]);

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    await replaceVideoTrack(null);
    setIsScreenSharing(false);
  }, [replaceVideoTrack]);

  // Signal listener
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`call-signals-${user.id}`)
      .on("postgres_changes",
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
            chatRoomId: row.chat_room_id,
          };

          console.log("[WebRTC] signal received:", signal.type, "from:", signal.from);

          switch (signal.type) {
            case "offer":
              // Mid-call renegotiation (e.g. audio→video upgrade)
              if (callStateRef.current === "connected") {
                const pc = peerConnections.current.get(signal.from) || peerConnection.current;
                if (pc) {
                  if (signal.callType === "video") {
                    await ensureVideoTrack().catch((e) => console.error("[WebRTC] ensureVideoTrack error:", e));
                    callTypeRef.current = "video";
                    setCallType("video");
                  }
                  await pc.setRemoteDescription(new RTCSessionDescription(signal.data))
                    .catch((e) => console.error("[WebRTC] renegotiate setRemoteDescription error:", e));
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  await sendSignal({ type: "answer", to: signal.from, data: pc.localDescription });
                }
                break;
              }
              // Already on a call on this device — send busy signal
              if (callStateRef.current !== "idle") {
                await sendSignal({ type: "call-busy", to: signal.from });
                break;
              }
              // Initial incoming call
              setRemoteUserId(signal.from);
              remoteUserIdRef.current = signal.from;
              setRemoteUsername(signal.fromUsername || "Unknown");
              callTypeRef.current = signal.callType || "audio";
              setCallType(signal.callType || "audio");
              setCallState("receiving");
              if (signal.chatRoomId) chatRoomIdRef.current = signal.chatRoomId;
              (window as any).__pendingCallSignal = signal;
              ringtoneRef.current.start();
              if (document.hidden && "Notification" in window && Notification.permission === "granted") {
                const n = new Notification(`Incoming ${signal.callType || "audio"} call`, {
                  body: `${signal.fromUsername} is calling you`,
                  icon: "/favicon.ico",
                  requireInteraction: true,
                });
                n.onclick = () => window.focus();
              }
              break;

            case "answer": {
              const pc = peerConnections.current.get(signal.from) || peerConnection.current;
              if (pc && pc.signalingState === "have-local-offer") {
                // Stop ringtone immediately when callee answers
                ringtoneRef.current.stop();
                await pc.setRemoteDescription(new RTCSessionDescription(signal.data))
                  .catch((e) => console.error("[WebRTC] setRemoteDescription (answer) error:", e));
                for (const c of iceCandidateQueue.current) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                iceCandidateQueue.current = [];
              }
              break;
            }

            case "ice-candidate": {
              const pc = peerConnections.current.get(signal.from) || peerConnection.current;
              if (pc?.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.data))
                  .catch((e) => console.error("[WebRTC] addIceCandidate error:", e));
              } else {
                iceCandidateQueue.current.push(signal.data);
              }
              break;
            }

            case "end-call":
              if (callStateRef.current === "calling") cleanup("no-answer");
              else cleanup("ended");
              break;

            case "reject-call":
              cleanup("rejected");
              break;

            case "call-busy":
              // Callee is already on a call (logged in elsewhere)
              cleanup("rejected");
              // Show a toast-like notification — use window alert as fallback
              console.warn("[WebRTC] Call busy — user is on another call");
              setTimeout(() => window.dispatchEvent(new CustomEvent("call-busy")), 100);
              break;

            case "video-toggle":
              setRemoteVideoOff(signal.data?.videoOff === true);
              break;

            case "upgrade-video":
              await ensureVideoTrack().catch((e) => console.error("[WebRTC] remote upgrade ensureVideoTrack error:", e));
              break;
          }

          await supabase.from("call_signals").delete().eq("id", row.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, cleanup, ensureVideoTrack, sendSignal]);

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
    localStream, remoteStream, callDuration, isScreenSharing,
    isMuted, isVideoOff, remoteVideoOff, facingMode,
    startCall, startGroupCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleVideo, replaceVideoTrack, startScreenShare, stopScreenShare,
    upgradeToVideo, flipCamera,
  };
}
