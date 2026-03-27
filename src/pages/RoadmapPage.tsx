import { MessageSquare, ArrowLeft, Clock, CheckCircle2, Circle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const items = [
  {
    status: "done",
    label: "Shipped",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    items: [
      "Real-time messaging with Supabase Realtime",
      "GitHub repo linking and file browser",
      "WebRTC voice & video calls",
      "Workspace projects with file imports",
      "Full in-app code editor with commit support",
      "Pricing page and plan structure",
    ],
  },
  {
    status: "in-progress",
    label: "In Progress",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    items: [
      "AI-powered message summarisation",
      "GitHub PR review inside the workspace",
      "Mobile-optimised layout improvements",
    ],
  },
  {
    status: "planned",
    label: "Planned",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    items: [
      "Stripe billing integration for Pro & Enterprise",
      "SAML / SSO for Enterprise workspaces",
      "Audit logs and compliance exports",
      "Self-hosted deployment guide",
      "Public API and webhooks",
      "Slack / Linear import migration tool",
    ],
  },
];

const iconMap = {
  done: CheckCircle2,
  "in-progress": Clock,
  planned: Circle,
};

const RoadmapPage = () => {
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

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Roadmap</h1>
          <p className="text-muted-foreground">What we've shipped, what's in progress, and what's coming next.</p>
        </motion.div>

        <div className="space-y-8">
          {items.map((group, i) => {
            const Icon = iconMap[group.status as keyof typeof iconMap];
            return (
              <motion.div key={group.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.08 }}
                className="rounded-2xl border border-border/70 bg-card/50 p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${group.bg} ${group.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {group.label}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${group.status === "done" ? "bg-emerald-500" : group.status === "in-progress" ? "bg-amber-500" : "bg-sky-500"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-border/70 bg-card/40 p-6 text-center">
          <p className="text-sm text-foreground font-medium mb-1">Have a feature request?</p>
          <p className="text-xs text-muted-foreground mb-4">We'd love to hear from you. Reach out and tell us what would make RepoRoom better for your team.</p>
          <a href="mailto:anointedthedeveloper@gmail.com" className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Send feedback
          </a>
        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground pb-8">
          &copy; {new Date().getFullYear()} RepoRoom. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default RoadmapPage;
