import { useState, useRef } from "react";
import { X, Camera, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import AvatarBubble from "./AvatarBubble";

interface ProfileSettingsProps {
  open: boolean;
  onClose: () => void;
}

const ProfileSettings = ({ open, onClose }: ProfileSettingsProps) => {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: username.trim(),
        avatar_url: avatarUrl || null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message.includes("unique") ? "Username already taken" : error.message);
    } else {
      setMessage("Profile updated!");
      // Refresh page to update context
      setTimeout(() => window.location.reload(), 800);
    }
    setSaving(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl w-full max-w-md p-6 shadow-2xl border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>
              <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="h-20 w-20">
                    <AvatarBubble letter={username?.[0]?.toUpperCase() || "A"} status="online" size="lg" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                </div>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              <p className="text-xs text-muted-foreground mt-2">Click to change photo</p>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-muted text-sm text-foreground placeholder:text-muted-foreground rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary transition-all"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-muted/50 text-sm text-muted-foreground rounded-lg px-3 py-2 cursor-not-allowed"
                />
              </div>
            </div>

            {message && (
              <p className={`text-xs mt-3 ${message.includes("updated") ? "text-online" : "text-destructive"}`}>
                {message}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !username.trim()}
              className="w-full mt-6 gradient-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-opacity"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileSettings;
