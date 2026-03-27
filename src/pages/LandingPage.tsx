import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  FileText,
  Github,
  Info,
  LayoutDashboard,
  Map,
  MessageSquare,
  Monitor,
  Moon,
  PenLine,
  Shield,
  ScrollText,
  Sparkles,
  Sun,
  Tag,
  TerminalSquare,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";

const LandingPage = () => {
  const { user } = useAuth();
  const { mode, theme, setMode, setTheme } = useThemeContext();
  const themes = [
    { id: "default", color: "bg-blue-500", label: "Default" },
    { id: "ocean", color: "bg-cyan-500", label: "Ocean" },
    { id: "forest", color: "bg-green-500", label: "Forest" },
    { id: "rose", color: "bg-rose-500", label: "Rose" },
    { id: "doodle", color: "bg-purple-400", label: "Doodle" },
  ] as const;

  const featureCards = [
    { icon: Github, label: "GitHub Actions", text: "Link repos, turn messages into issues, and keep chat tied to delivery." },
    { icon: Workflow, label: "Projects", text: "Track tasks, imported files, and repo context inside the same workspace." },
    { icon: LayoutDashboard, label: "Workspace Views", text: "Switch between chat, dashboards, settings, and project tools without context loss." },
  ];

  const workflowSteps = [
    "$ reporoom open workspace",
    "> Summarize the bug thread and assign an owner",
    "> Link this discussion to github issue #42",
    "> Import src/hooks/useWebRTC.ts into the project view",
    "$ ship with context intact",
  ];

  const stats = [
    { value: "Chat + IDE", label: "One surface for discussion and execution" },
    { value: "Realtime", label: "Live messaging, presence, and calls" },
    { value: "Dev-first", label: "Built for teams that ship code together" },
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for side projects and small teams.",
      features: [
        "Up to 5 team members",
        "3 active projects",
        "Basic GitHub integration",
        "7-day message history",
        "Community support",
      ],
      cta: "Get Started",
      href: "/auth",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$12",
      period: "/user/month",
      description: "Advanced tools for growing engineering teams.",
      features: [
        "Unlimited members",
        "Unlimited projects",
        "Full GitHub Actions sync",
        "Unlimited message history",
        "Priority support",
        "Custom workspace tools",
      ],
      cta: "Start Free Trial",
      href: "/auth?mode=signup",
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Scale with security and dedicated resources.",
      features: [
        "SAML & SSO",
        "Audit logs & compliance",
        "Self-hosted runners",
        "Dedicated success manager",
        "Custom SLA",
        "Onboarding & training",
      ],
      cta: "Contact Sales",
      href: "mailto:sales@reporoom.dev",
      highlighted: false,
      external: true,
    },
  ];

  const faqs = [
    {
      question: "How does the GitHub integration work?",
      answer: "RepoRoom connects directly to your GitHub repositories. You can link messages to issues, view pull requests, and even import specific files into your project workspace for better context during discussions."
    },
    {
      question: "Is my code secure with RepoRoom?",
      answer: "Absolutely. We only request the minimum necessary permissions to provide our services. Your code remains on GitHub; we only index the metadata and content you explicitly choose to import into your workspace."
    },
    {
      question: "Can I use RepoRoom for open-source projects?",
      answer: "Yes! The Free plan is perfect for open-source teams. If you have a large open-source project, contact us for special community pricing."
    },
    {
      question: "What makes RepoRoom different from Slack or Discord?",
      answer: "Unlike general-purpose chat tools, RepoRoom is built specifically for developers. It treats code, issues, and projects as first-class citizens, keeping your discussion directly tied to your delivery pipeline."
    }
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_22%),radial-gradient(circle_at_80%_20%,_hsl(var(--accent)/0.14),_transparent_20%),radial-gradient(circle_at_bottom_right,_hsl(var(--primary)/0.10),_transparent_26%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6 py-4 sm:py-6 lg:px-10">
        <header className="sticky top-4 z-50 flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 px-4 py-3 backdrop-blur-xl shadow-lg shadow-black/5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary shadow-[0_14px_30px_hsl(var(--primary)/0.28)]">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">RepoRoom</p>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                  <Monitor className="h-3 w-3" />
                  Best on Laptop
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Chat, projects, repos, and workspace tools in one place</p>
            </div>
          </div>

          {/* Centre nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              ["Features", "/features"],
              ["Pricing", "/pricing"],
              ["Changelog", "/changelog"],
              ["About", "/about"],
              ["Blog", "/blog"],
            ].map(([label, path]) => (
              <Link key={path} to={path} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Theme colour swatches */}
            <div className="hidden md:flex items-center gap-1 rounded-xl border border-border/60 bg-background/50 px-2 py-1.5">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className={`h-5 w-5 rounded-full ${t.color} transition-all hover:scale-110 ${
                    theme === t.id ? "ring-2 ring-offset-1 ring-offset-background ring-primary scale-110" : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
            {/* Dark / light toggle */}
            <button
              onClick={() => setMode(mode === "dark" ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/60 text-muted-foreground transition-all hover:bg-background hover:text-foreground"
              title={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            >
              {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {user ? (
              <>
                <Link to="/dashboard" className="hidden sm:inline-flex rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-background">
                  Dashboard
                </Link>
                <Link to="/chat" className="rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 shadow-sm">
                  Open Chat
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:inline-flex rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-background">
                  Sign in
                </Link>
                <Link to="/auth" className="rounded-xl gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 shadow-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </header>

        <main className="flex flex-1 items-center py-12 lg:py-16">
          <div className="grid w-full items-start gap-10 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-xl">
                <TerminalSquare className="h-3.5 w-3.5 text-primary" />
                Developer workspace messaging
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl leading-[1.1]">
                Developer workspace messaging for modern teams.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground/90 sm:text-xl">
                RepoRoom combines real-time chat, GitHub-linked projects, and workspace tools in one fluid interface. Stop context switching and start shipping.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-card/65 p-4 backdrop-blur-xl">
                    <p className="text-lg font-semibold text-foreground">{item.value}</p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[28px] border border-border/70 bg-card/65 p-5 backdrop-blur-xl">
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Appearance</p>
                    <p className="mt-1 text-sm text-muted-foreground">Pick a mode and color profile before you enter the workspace.</p>
                  </div>
                  <div className="flex gap-3">
                    {(["dark", "light"] as const).map((appearanceMode) => (
                      <button
                        key={appearanceMode}
                        onClick={() => setMode(appearanceMode)}
                        className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                          mode === appearanceMode
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          {appearanceMode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                          {appearanceMode === "dark" ? "Dark" : "Light"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {themes.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setTheme(option.id)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-medium transition-all ${
                          theme === option.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <span className="flex flex-col items-center gap-2">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${option.color}`}>
                            {theme === option.id && <Check className="h-3.5 w-3.5 text-white" />}
                          </span>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {user ? (
                  <>
                    <Link to="/chat" className="inline-flex items-center gap-2 rounded-2xl gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_hsl(var(--primary)/0.28)]">
                      Open Chat
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-semibold text-foreground">
                      Open dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/auth" className="inline-flex items-center gap-2 rounded-2xl gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_hsl(var(--primary)/0.28)]">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card/70 px-5 py-3 text-sm font-semibold text-foreground">
                      Create account
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {featureCards.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-card/65 p-4 backdrop-blur-xl">
                    <item.icon className="h-4 w-4 text-primary" />
                    <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }} className="relative">
              <div className="absolute -left-6 top-6 hidden h-28 w-28 rounded-full bg-primary/20 blur-3xl lg:block" />
              <div className="absolute -right-8 bottom-4 hidden h-28 w-28 rounded-full bg-accent/20 blur-3xl lg:block" />
              <div className="relative overflow-hidden rounded-[32px] border border-border/70 bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(7,10,18,0.98))] p-5 shadow-[0_28px_90px_rgba(15,23,42,0.25)] backdrop-blur-xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.16),_transparent_34%)]" />
                <div className="relative">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-slate-300">
                      reporoom.site
                    </div>
                  </div>

                  <div className="mt-4 rounded-[26px] border border-emerald-400/18 bg-[#07111b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-center justify-between border-b border-emerald-400/10 pb-3">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.28em] text-emerald-300/80">Developer Console</p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">Command Center</p>
                      </div>
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        live
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 font-mono text-[12px] leading-6 text-slate-300">
                      {workflowSteps.map((line, index) => (
                        <motion.div
                          key={line}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 + index * 0.06 }}
                          className="flex gap-3"
                        >
                          <span className="w-5 text-emerald-400">{line.startsWith("$") ? "$" : ">"}</span>
                          <span className={line.startsWith("$") ? "text-emerald-300" : "text-slate-300"}>{line.replace(/^[>$]\s?/, "")}</span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                          Active thread
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-100">“Calls are failing after accept”</p>
                        <div className="mt-3 space-y-2 text-xs text-slate-400">
                          <div className="flex items-center justify-between">
                            <span>Owner</span>
                            <span className="text-slate-200">Frontend</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Status</span>
                            <span className="text-amber-300">Investigating</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Linked</span>
                            <span className="text-slate-200">Issue + file import</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          <Wrench className="h-3.5 w-3.5 text-primary" />
                          Workspace tools
                        </div>
                        <div className="mt-3 space-y-2">
                          {[
                            "Issue linking from messages",
                            "Repo file import into projects",
                            "Realtime team chat and presence",
                            "Dashboard visibility across workstreams",
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs text-slate-300">
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-300" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">GitHub</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">Convert chat to issues</p>
                      <p className="mt-1 text-xs text-muted-foreground">Link repos to the workspace, then turn messages into tracked GitHub work.</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">IDE</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">Preview, edit, commit</p>
                      <p className="mt-1 text-xs text-muted-foreground">Open repo files, preview README content, and commit changes without leaving the app.</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border/70 bg-background/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Team Flow</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["Discuss", "Assign", "Inspect", "Import", "Ship"].map((step) => (
                        <span key={step} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                          {step}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        <section id="pricing" className="py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground leading-8">
              Choose the plan that's right for your team. All plans include our core chat and GitHub integration features.
            </p>
            <Link to="/pricing" className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline">
              View full pricing page <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl p-8 transition-all hover:scale-[1.02] ${
                  plan.highlighted
                    ? "border-2 border-primary bg-card/80 shadow-2xl shadow-primary/10"
                    : "border border-border/70 bg-card/50"
                } backdrop-blur-xl`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm font-medium text-muted-foreground">{plan.period}</span>}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground leading-6">{plan.description}</p>
                </div>
                <ul className="mb-8 space-y-4 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-foreground/90">
                      <CheckCheck className="h-5 w-5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "bg-background/80 border border-border hover:bg-background text-foreground"
                  }`}
                  onClick={() => {
                    if ((plan as { external?: boolean }).external) {
                      window.location.href = (plan as { href: string }).href;
                    } else {
                      window.location.href = (plan as { href: string }).href;
                    }
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Explore section */}
        <section className="py-20 lg:py-24 border-t border-border/40">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-3">Explore RepoRoom</h2>
            <p className="text-muted-foreground">Everything you need to know, all in one place.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Features",  path: "/features",  desc: "See everything RepoRoom can do for your team.",    Icon: Zap },
              { label: "Pricing",   path: "/pricing",   desc: "Free, Pro, and Enterprise plans explained.",        Icon: Tag },
              { label: "Changelog", path: "/changelog", desc: "Every update and improvement we've shipped.",       Icon: BookOpen },
              { label: "Roadmap",   path: "/roadmap",   desc: "What's coming next and what we're building.",      Icon: Map },
              { label: "About",     path: "/about",     desc: "The story behind RepoRoom and who built it.",      Icon: Info },
              { label: "Blog",      path: "/blog",      desc: "Engineering deep-dives and product stories.",      Icon: PenLine },
              { label: "Privacy",   path: "/privacy",   desc: "How we handle and protect your data.",             Icon: Shield },
              { label: "Terms",     path: "/terms",     desc: "The rules for using RepoRoom.",                    Icon: ScrollText },
            ].map(({ label, path, desc, Icon }) => (
              <Link key={path} to={path}
                className="group rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-xl hover:border-primary/30 hover:bg-card/80 transition-all">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{label}</p>
                <p className="text-xs text-muted-foreground leading-5">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="faq" className="py-20 lg:py-28 border-t border-border/40">
          <div className="grid lg:grid-cols-[1fr_2fr] gap-12 lg:gap-20">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                Frequently asked questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about RepoRoom and how it works with your development workflow.
              </p>
            </div>
            <div className="space-y-8">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-border/70 bg-card/40 p-6 backdrop-blur-sm">
                  <h3 className="text-base font-semibold text-foreground mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground leading-7">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-border/40 py-12 lg:py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                  <MessageSquare className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">RepoRoom</span>
              </div>
              <p className="max-w-xs text-sm text-muted-foreground leading-6">
                The developer messaging platform that ties your chat directly to your codebase and delivery workflow.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link to="/changelog" className="hover:text-primary transition-colors">Changelog</Link></li>
                <li><Link to="/roadmap" className="hover:text-primary transition-colors">Roadmap</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
                <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-primary transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-4 pt-8 border-t border-border/20 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
            <p>&copy; 2026 RepoRoom. All rights reserved.</p>
            <p className="flex items-center gap-2">
              Powered by{" "}
              <a href="https://anobyte.online" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors">
                <Sparkles className="h-3 w-3 text-primary" />
                Anobyte
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
