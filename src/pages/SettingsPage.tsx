import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, LogOut, Image, User, Bell, Palette, Shield, ChevronRight, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";
import ImageCropper from "@/components/chat/ImageCropper";

type Section = "profile" | "appearance" | "notifications" | "privacy";

const RINGTONES = [
  { id: "default", label: "Default", freqs: [[880, 0, 0.15], [1100, 0.2, 0.15], [880, 0.4, 0.15]] },
  { id: "classic", label: "Classic", freqs: [[660, 0, 0.2], [660, 0.3, 0.2], [660, 0.6, 0.2]] },
  { id: "soft",    label: "Soft",    freqs: [[523, 0, 0.3], [659, 0.35, 0.3], [784, 0.7, 0.3]] },
  { id: "pulse",   label: "Pulse",   freqs: [[1000, 0, 0.08], [1000, 0.15, 0.08], [1000, 0.3, 0.08], [1000, 0.45, 0.08]] },
] as const;

function playPreview(freqs: readonly (readonly number[])[]) {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain(); gain.gain.value = 0.2; gain.connect(ctx.destination);
    freqs.forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      osc.connect(gain); osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { mode, theme, wallpaper, setMode, setTheme, setWallpaper } = useThemeContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const wallpaperRef = useRef<HTMLInputElement>(null);

  const [section, setSection] = useState<Section>("profile");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ringtone, setRingtone] = useState(() => localStorage.getItem("chatflow_ringtone") || "default");
  const [ghostMode, setGhostMode] = useState(() => localStorage.getItem("chatflow_ghost_mode") === "true");
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio((profile as any).bio || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // Ensure default ringtone is always persisted
  useEffect(() => {
    if (!localStorage.getItem("chatflow_ringtone")) {
      localStorage.setItem("chatflow_ringtone", "default");
    }
  }, []);

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
      setMessage("Saved!");
      setTimeout(() => setMessage(""), 2000);
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

  const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "profile",      label: "Profile",      icon: <User className="h-4 w-4" /> },
    { id: "appearance",   label: "Appearance",   icon: <Palette className="h-4 w-4" /> },
    { id: "notifications",label: "Notifications",icon: <Bell className="h-4 w-4" /> },
    { id: "privacy",      label: "Privacy",      icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {cropSrc && <ImageCropper src={cropSrc} onCrop={handleCroppedAvatar} onCancel={() => setCropSrc(null)} />}

      {/* Sidebar nav */}
      <div className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">Settings</span>
        </div>

        {/* Avatar summary */}
        <div className="px-4 py-4 border-b border-border flex items-center gap-3">
          <div className="relative shrink-0 cursor-pointer group" onClick={() => fileRef.current?.click()}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary ring-offset-1 ring-offset-card" />
              : <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{initials}</div>
            }
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Camera className="h-3.5 w-3.5 text-white" />}
            </div>
          </div>
          <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{displayName || username || "You"}</p>
            <p className="text-[10px] text-muted-foreground truncate">@{username}</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors text-left ${
                section === n.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              {n.icon}{n.label}
              {section === n.id && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-border">
          <button onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-4 w-4" />Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

              {section === "profile" && (
                <div className="space-y-5">
                  <h2 className="text-lg font-semibold text-foreground">Profile</h2>

                  {/* Avatar */}
                  <div className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border">
                    <div className="relative cursor-pointer group shrink-0" onClick={() => fileRef.current?.click()}>
                      {avatarUrl
                        ? <img src={avatarUrl} alt="avatar" className="h-16 w-16 rounded-full object-cover ring-2 ring-primary ring-offset-2 ring-offset-card" />
                        : <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground">{initials}</div>
                      }
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Profile photo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Click to change</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Display Name</label>
                      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Your display name" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                        <input value={username} onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl pl-8 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all"
                          placeholder="username" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bio</label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                        className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                        placeholder="Tell people about yourself..." maxLength={160} />
                      <p className="text-[10px] text-muted-foreground text-right">{bio.length}/160</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                      <input value={user?.email || ""} disabled
                        className="w-full bg-muted/40 text-sm text-muted-foreground rounded-xl px-4 py-3 cursor-not-allowed" />
                    </div>
                  </div>

                  {message && (
                    <p className={`text-xs text-center font-medium ${message === "Saved!" ? "text-green-500" : "text-destructive"}`}>{message}</p>
                  )}
                  <button onClick={handleSave} disabled={saving || uploading || !username.trim()}
                    className="w-full gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-opacity">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}

              {section === "appearance" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-foreground">Appearance</h2>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wide">Color Mode</label>
                    <div className="flex gap-3">
                      {(["dark", "light"] as const).map((m) => (
                        <button key={m} onClick={() => setMode(m)}
                          className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition-all border-2 flex items-center justify-center gap-2 ${mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                          {m === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                          {m === "dark" ? "Dark" : "Light"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wide">Theme</label>
                    <div className="grid grid-cols-5 gap-2">
                      {([
                        { id: "default", color: "bg-violet-500", label: "Default" },
                        { id: "ocean",   color: "bg-cyan-500",   label: "Ocean" },
                        { id: "forest",  color: "bg-green-500",  label: "Forest" },
                        { id: "rose",    color: "bg-rose-500",   label: "Rose" },
                        { id: "doodle",  color: "bg-purple-400", label: "Doodle" },
                      ] as const).map((t) => (
                        <button key={t.id} onClick={() => setTheme(t.id)}
                          className={`flex flex-col items-center gap-2 py-3 rounded-xl text-[11px] font-medium transition-all border-2 ${theme === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                          <div className={`h-5 w-5 rounded-full ${t.color}`} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wide">Chat Wallpaper</label>
                    <div className="flex gap-2">
                      <button onClick={() => wallpaperRef.current?.click()}
                        className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:border-primary/40 transition-all">
                        <Image className="h-4 w-4" />
                        {wallpaper ? "Change wallpaper" : "Set wallpaper"}
                      </button>
                      {wallpaper && (
                        <button onClick={() => setWallpaper(null)}
                          className="px-4 py-3 rounded-xl border border-destructive/40 text-sm text-destructive hover:bg-destructive/10 transition-all">
                          Remove
                        </button>
                      )}
                    </div>
                    {wallpaper && (
                      <div className="mt-3 h-24 rounded-xl overflow-hidden border border-border">
                        <img src={wallpaper} className="w-full h-full object-cover" alt="Wallpaper" />
                      </div>
                    )}
                    <input ref={wallpaperRef} type="file" className="hidden" accept="image/*" onChange={handleWallpaperUpload} />
                  </div>
                </div>
              )}

              {section === "notifications" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-3 block uppercase tracking-wide">Ringtone</label>
                    <div className="grid grid-cols-2 gap-3">
                      {RINGTONES.map((r) => (
                        <button key={r.id}
                          onClick={() => {
                            setRingtone(r.id);
                            localStorage.setItem("chatflow_ringtone", r.id);
                            playPreview(r.freqs);
                          }}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                            ringtone === r.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                          }`}>
                          {r.label}
                          <span className="text-xs opacity-60">▶ Preview</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Ringtone is saved immediately when selected.</p>
                  </div>
                </div>
              )}

              {section === "privacy" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-foreground">Privacy</h2>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        const next = !ghostMode;
                        setGhostMode(next);
                        localStorage.setItem("chatflow_ghost_mode", String(next));
                      }}
                      className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border-2 transition-all ${
                        ghostMode ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-left">
                        <p className={`text-sm font-medium ${ghostMode ? "text-primary" : "text-foreground"}`}>Ghost Mode</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Read messages without sending seen receipts or typing indicators</p>
                      </div>
                      <div className={`h-6 w-11 rounded-full transition-colors shrink-0 ml-4 flex items-center px-0.5 ${ghostMode ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${ghostMode ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
