import { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, LogOut, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";
import { useGithub } from "@/hooks/useGithub";
import ImageCropper from "./ImageCropper";

interface ProfileSettingsProps {
  open: boolean;
  onClose: () => void;
}

const ProfileSettings = ({ open, onClose }: ProfileSettingsProps) => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { mode, theme, wallpaper, setMode, setTheme, setWallpaper } = useThemeContext();
  const wallpaperRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ringtone, setRingtone] = useState("default");
  const [ghostMode, setGhostMode] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const RINGTONES = [
    { id: "default", label: "Default", freqs: [[880, 0, 0.15], [1100, 0.2, 0.15], [880, 0.4, 0.15]] },
    { id: "classic", label: "Classic", freqs: [[660, 0, 0.2], [660, 0.3, 0.2], [660, 0.6, 0.2]] },
    { id: "soft",    label: "Soft",    freqs: [[523, 0, 0.3], [659, 0.35, 0.3], [784, 0.7, 0.3]] },
    { id: "pulse",   label: "Pulse",   freqs: [[1000, 0, 0.08], [1000, 0.15, 0.08], [1000, 0.3, 0.08], [1000, 0.45, 0.08]] },
  ] as const;

  const playPreview = (freqs: readonly (readonly number[])[]) => {
    try {
      const ctx = new AudioContext();
      const gain = ctx.createGain(); gain.gain.value = 0.2; gain.connect(ctx.destination);
      freqs.forEach(([freq, start, dur]) => {
        const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
        osc.connect(gain); osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
      });
      setTimeout(() => ctx.close(), 1500);
    } catch {}
  };

  useEffect(() => {
    if (open && profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio((profile as any).bio || "");
      setAvatarUrl(profile.avatar_url || "");
      setMessage("");
      setUsernameStatus("idle");
      setRingtone(localStorage.getItem("chatflow_ringtone") || "default");
      setGhostMode(localStorage.getItem("chatflow_ghost_mode") === "true");
    }
  }, [open, profile]);

  // Debounced username availability check
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === profile?.username) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", trimmed)
        .neq("id", user?.id || "")
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 400);
    return () => clearTimeout(timer);
  }, [username, profile?.username, user?.id]);

  const { githubUser, connectWithToken, disconnect, loading: ghLoading, error: ghError } = useGithub();
  const [ghPat, setGhPat] = useState("");
  const [ghConnecting, setGhConnecting] = useState(false);

  const handleGhConnect = async () => {
    if (!ghPat.trim()) return;
    setGhConnecting(true);
    await connectWithToken(ghPat.trim());
    setGhConnecting(false);
    setGhPat("");
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCroppedAvatar = async (blob: Blob) => {
    setCropSrc(null);
    if (!user) return;
    setUploading(true);
    const path = `${user.id}.jpg`;
    const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } else {
      setMessage("Failed to upload image");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const cleanUrl = avatarUrl.split("?t=")[0] || null;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null, username: username.trim(), avatar_url: cleanUrl, bio: bio.trim() || null } as any)
      .eq("id", user.id);
    if (error) {
      setMessage(error.message.includes("unique") ? "Username already taken" : error.message);
    } else {
      localStorage.setItem("chatflow_ringtone", ringtone);
      localStorage.setItem("chatflow_ghost_mode", String(ghostMode));
      await refreshProfile();
      setMessage("Profile updated!");
      setTimeout(() => { setMessage(""); onClose(); }, 1000);
    }
    setSaving(false);
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setWallpaper(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const initials = (displayName || username || "A")[0].toUpperCase();

  return (
    <AnimatePresence>
      {cropSrc && (
        <ImageCropper src={cropSrc} onCrop={handleCroppedAvatar} onCancel={() => setCropSrc(null)} />
      )}
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border overflow-hidden"
          >
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-foreground">Settings</h2>
                <button onClick={onClose} className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center mb-5">
                <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-card" />
                  ) : (
                    <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card">
                      {initials}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                  </div>
                </div>
                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                <p className="text-[11px] text-muted-foreground mt-2">Click to change photo</p>
              </div>

              {/* Profile fields */}
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Your display name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
                  <div className="relative">
                    <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
                      className={`w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-2 transition-all pr-8 ${
                        usernameStatus === "taken" ? "focus:ring-destructive ring-1 ring-destructive/50" :
                        usernameStatus === "available" ? "focus:ring-green-500 ring-1 ring-green-500/50" :
                        "focus:ring-primary"
                      }`}
                      placeholder="username" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                      {usernameStatus === "checking" && <span className="text-muted-foreground">…</span>}
                      {usernameStatus === "available" && <span className="text-green-500">✓</span>}
                      {usernameStatus === "taken" && <span className="text-destructive">✗</span>}
                    </span>
                  </div>
                  {usernameStatus === "taken" && <p className="text-[11px] text-destructive mt-1">Username already taken</p>}
                  {usernameStatus === "available" && <p className="text-[11px] text-green-500 mt-1">Username available</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
                    className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                    placeholder="Tell people about yourself..." maxLength={160} />
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">{bio.length}/160</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                  <input value={user?.email || ""} disabled
                    className="w-full bg-muted/40 text-sm text-muted-foreground rounded-xl px-3 py-2.5 cursor-not-allowed" />
                </div>
              </div>

              {/* Ghost Mode */}
              <div className="mb-5">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Privacy</label>
                <button
                  onClick={() => setGhostMode((g) => !g)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    ghostMode ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Ghost Mode</span>
                    <span className="text-[10px] opacity-70">Read messages without sending seen receipts or typing indicators</span>
                  </div>
                  <div className={`h-5 w-9 rounded-full transition-colors shrink-0 ml-3 ${ghostMode ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${ghostMode ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
                  </div>
                </button>
              </div>

              {/* Ringtone */}
              <div className="mb-5">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Ringtone</label>
                <div className="grid grid-cols-2 gap-2">
                  {RINGTONES.map((r) => (
                    <button key={r.id}
                      onClick={() => { setRingtone(r.id); playPreview(r.freqs); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                        ringtone === r.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}>
                      {r.label}
                      <span className="text-[10px] opacity-60">▶</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Appearance */}
              <div className="mb-5">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Mode</label>
                <div className="flex gap-2 mb-3">
                  {(["dark", "light"] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all border ${mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Theme</label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { id: "default", color: "bg-violet-500", label: "Default" },
                    { id: "ocean",   color: "bg-cyan-500",   label: "Ocean" },
                    { id: "forest",  color: "bg-green-500",  label: "Forest" },
                    { id: "rose",    color: "bg-rose-500",   label: "Rose" },
                    { id: "doodle",  color: "bg-purple-400", label: "Doodle" },
                  ] as const).map((t) => (
                    <button key={t.id} onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-medium transition-all border ${theme === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      <div className={`h-4 w-4 rounded-full ${t.color}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* GitHub Integration */}
              <div className="mb-5">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">GitHub Integration</label>
                {githubUser ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-foreground" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-foreground">Connected as @{githubUser}</p>
                        <p className="text-[10px] text-green-500">GitHub active</p>
                      </div>
                    </div>
                    <button onClick={disconnect} className="text-xs text-destructive hover:opacity-80 transition-opacity">Disconnect</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={ghPat}
                        onChange={(e) => setGhPat(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleGhConnect()}
                        type="password"
                        placeholder="Paste GitHub token (ghp_...)" 
                        className="flex-1 bg-muted text-xs text-foreground placeholder:text-muted-foreground rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      <button onClick={handleGhConnect} disabled={!ghPat.trim() || ghConnecting}
                        className="px-3 py-2 rounded-xl gradient-primary text-xs text-white font-medium disabled:opacity-40 shrink-0">
                        {ghConnecting ? "..." : "Connect"}
                      </button>
                    </div>
                    {ghError && <p className="text-[11px] text-destructive">{ghError}</p>}
                    <a href="https://github.com/settings/tokens/new?scopes=repo,read:user" target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline block">Generate a token on GitHub →</a>
                  </div>
                )}
              </div>

              {/* Chat Wallpaper */}
              <div className="mb-5">
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Chat Wallpaper</label>
                <div className="flex gap-2">
                  <button onClick={() => wallpaperRef.current?.click()}
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:border-primary/40 transition-all">
                    <Image className="h-3.5 w-3.5" />
                    {wallpaper ? "Change wallpaper" : "Set wallpaper"}
                  </button>
                  {wallpaper && (
                    <button onClick={() => setWallpaper(null)}
                      className="px-3 py-2 rounded-xl border border-destructive/40 text-xs text-destructive hover:bg-destructive/10 transition-all">
                      Remove
                    </button>
                  )}
                </div>
                {wallpaper && (
                  <div className="mt-2 h-16 rounded-xl overflow-hidden border border-border">
                    <img src={wallpaper} className="w-full h-full object-cover" alt="Wallpaper preview" />
                  </div>
                )}
                <input ref={wallpaperRef} type="file" className="hidden" accept="image/*" onChange={handleWallpaperUpload} />
              </div>

              {message && (
                <p className={`text-xs mb-3 text-center font-medium ${message.includes("updated") ? "text-green-500" : "text-destructive"}`}>
                  {message}
                </p>
              )}

              <button onClick={handleSave} disabled={saving || uploading || !username.trim() || usernameStatus === "taken" || usernameStatus === "checking"}
                className="w-full gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity">
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button onClick={signOut}
                className="w-full mt-2 flex items-center justify-center gap-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl py-2.5 transition-colors">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileSettings;
