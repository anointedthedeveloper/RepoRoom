import { motion } from "framer-motion";
import { Github, Mail, Code2, Zap, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import useSEO from "@/hooks/useSEO";

const stack = [
  { label: "React 18", desc: "UI framework" },
  { label: "TypeScript", desc: "Type safety" },
  { label: "Supabase", desc: "Auth, DB, Realtime" },
  { label: "WebRTC", desc: "Calls & screen share" },
  { label: "Tailwind CSS", desc: "Styling" },
  { label: "Framer Motion", desc: "Animations" },
  { label: "Vite", desc: "Build tool" },
  { label: "Vercel", desc: "Deployment" },
];

const AboutPage = () => {
  useSEO({
    title: "About",
    description: "The story behind RepoRoom — built by Anointed the Developer in Lagos, Nigeria. A developer messaging platform that treats your codebase as a first-class citizen.",
    path: "/about",
  });
  return (
  <PageLayout maxWidth="md">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      {/* Hero */}
      <div className="mb-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
          About
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-5">
          Built for developers,<br />by a developer.
        </h1>
        <p className="text-lg text-muted-foreground leading-8 max-w-xl">
          RepoRoom is a developer messaging platform built to close the gap between where teams talk and where they ship.
        </p>
      </div>

      {/* Story */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-xl mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Heart className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The story</span>
        </div>
        <div className="space-y-4 text-sm text-muted-foreground leading-7">
          <p>
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
      </div>

      {/* Tech stack */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-xl mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tech stack</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stack.map((s) => (
            <div key={s.label} className="rounded-xl border border-border/50 bg-background/60 px-3 py-3 text-center">
              <p className="text-sm font-semibold text-foreground">{s.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Builder card */}
      <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">The builder</span>
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg shadow-primary/20">
            A
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Anointed the Developer</p>
            <p className="text-sm text-muted-foreground">Lagos, Nigeria 🇳🇬</p>
            <p className="text-xs text-muted-foreground mt-0.5">Full-stack developer · Open source enthusiast</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-7 mb-6">
          RepoRoom was designed and built entirely by Anointed — a full-stack developer passionate about developer tooling,
          real-time systems, and shipping products that feel great to use.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="https://github.com/anointedthedeveloper" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-colors">
            <Github className="h-4 w-4" />
            GitHub
          </a>
          <a href="mailto:anointedthedeveloper@gmail.com"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-colors">
            <Mail className="h-4 w-4" />
            anointedthedeveloper@gmail.com
          </a>
        </div>
      </div>
    </motion.div>
  </PageLayout>
  );
};

export default AboutPage;
