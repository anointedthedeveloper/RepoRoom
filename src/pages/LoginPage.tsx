import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ArrowRight, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          setError("Username is required");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username);
        if (error) setError(error.message);
      } else {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-accent/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mb-4"
          >
            <MessageSquare className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">ChatFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-muted text-foreground placeholder:text-muted-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
            required
            minLength={6}
          />

          {error && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
          >
            {loading ? "..." : isSignUp ? "Create Account" : "Sign In"}
            {!loading && (isSignUp ? <UserPlus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
          </motion.button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
          className="w-full text-center text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors"
        >
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </button>

        <p className="text-center text-[11px] text-muted-foreground mt-8">
          Built by AnointedTheDeveloper
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
