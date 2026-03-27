import { MessageSquare, ArrowLeft, Github, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const AboutPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_22%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-10 py-6">
        <header className="flex items-center gap-3 mb-16">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-xl border border-border bg-card/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">RepoRoom</span>
          </Link>
        </header>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-6">About RepoRoom</h1>

          <div className="space-y-6 text-sm text-muted-foreground leading-7">
            <p>
              RepoRoom is a developer messaging platform built to close the gap between where teams talk and where they ship.
              Most chat tools treat code as an afterthought — a link you paste, a snippet you format. RepoRoom treats your
              codebase as a first-class citizen of every conversation.
            </p>
            <p>
              You can link GitHub repositories to your workspace, browse and edit files in a full in-app IDE, convert
              messages into tracked GitHub issues, and manage projects — all without switching tabs.
            </p>
            <p>
              RepoRoom is built on React 18, TypeScript, Supabase, and WebRTC. It's a PWA, so it installs like a native app
              on any device. The entire stack is open source and available on GitHub.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-border/70 bg-card/50 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-xl font-bold text-white shrink-0">
                A
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Anointed the Developer</p>
                <p className="text-xs text-muted-foreground">Lagos, Nigeria 🇳🇬 · Full-stack developer</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-7 mb-5">
              RepoRoom was designed and built entirely by Anointed — a full-stack developer passionate about developer tooling,
              real-time systems, and shipping products that feel great to use.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://github.com/anointedthedeveloper" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors">
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a href="mailto:anointedthedeveloper@gmail.com"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors">
                <Mail className="h-4 w-4" />
                anointedthedeveloper@gmail.com
              </a>
            </div>
          </div>
        </motion.div>

        <footer className="mt-16 text-center text-xs text-muted-foreground pb-8">
          &copy; {new Date().getFullYear()} RepoRoom. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default AboutPage;
