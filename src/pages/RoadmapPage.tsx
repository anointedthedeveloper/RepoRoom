import { motion } from "framer-motion";
import { CheckCircle2, Clock, Circle, Mail } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import useSEO from "@/hooks/useSEO";

const groups = [
  {
    status: "done",
    label: "Shipped",
    Icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "from-emerald-500 to-teal-600",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    items: [
      "Real-time messaging with Supabase Realtime",
      "GitHub repo linking and file browser",
      "WebRTC voice & video calls with screen sharing",
      "Workspace projects with file imports",
      "Full in-app code editor with commit support",
      "Pricing page and plan structure",
      "Public pages: Features, Changelog, Roadmap, About, Blog, Privacy, Terms",
    ],
  },
  {
    status: "in-progress",
    label: "In Progress",
    Icon: Clock,
    color: "text-amber-400",
    bg: "from-amber-500 to-orange-600",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    items: [
      "AI-powered message summarisation",
      "GitHub PR review inside the workspace",
      "Mobile-optimised layout improvements",
    ],
  },
  {
    status: "planned",
    label: "Planned",
    Icon: Circle,
    color: "text-sky-400",
    bg: "from-sky-500 to-blue-600",
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
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

const RoadmapPage = () => {
  useSEO({
    title: "Roadmap",
    description: "See what's shipped, in progress, and planned for RepoRoom — full transparency on where the platform is headed.",
    path: "/roadmap",
  });
  return (
  <PageLayout maxWidth="md">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
        Roadmap
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">What's coming</h1>
      <p className="text-lg text-muted-foreground">Shipped, in progress, and planned — full transparency on where we're headed.</p>
    </motion.div>

    <div className="space-y-6">
      {groups.map((group, i) => {
        const { Icon } = group;
        return (
          <motion.div key={group.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.1 }}
            className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden backdrop-blur-xl">
            {/* Group header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-muted/20">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${group.bg}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${group.badge}`}>{group.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">{group.items.length} items</span>
            </div>
            <ul className="divide-y divide-border/30">
              {group.items.map((item) => (
                <li key={item} className="flex items-center gap-3 px-6 py-3.5 text-sm text-foreground/80 hover:bg-muted/20 transition-colors">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${group.dot}`} />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </div>

    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary mx-auto mb-4">
        <Mail className="h-5 w-5 text-white" />
      </div>
      <p className="text-base font-semibold text-foreground mb-2">Have a feature request?</p>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">Tell us what would make RepoRoom better for your team.</p>
      <a href="mailto:anointedthedeveloper@gmail.com"
        className="inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">
        Send feedback
      </a>
    </motion.div>
  </PageLayout>
  );
};

export default RoadmapPage;
