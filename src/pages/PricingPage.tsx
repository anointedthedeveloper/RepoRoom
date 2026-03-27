import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Zap, Users, TrendingUp, Gift, Star, Building2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/layout/PageLayout";

const PricingPage = () => {
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);

  const plans = [
    {
      name: "Free",
      icon: Zap,
      iconColor: "from-slate-500 to-slate-700",
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: "Perfect for side projects and small teams getting started.",
      features: [
        { text: "Up to 5 team members", included: true },
        { text: "3 active projects", included: true },
        { text: "Basic GitHub integration", included: true },
        { text: "7-day message history", included: true },
        { text: "Community support", included: true },
        { text: "Unlimited message history", included: false },
        { text: "AI summaries & assistant", included: false },
      ],
      cta: "Get Started Free",
      href: "/auth",
      highlighted: false,
      external: false,
      badge: null,
    },
    {
      name: "Pro",
      icon: TrendingUp,
      iconColor: "from-primary to-violet-600",
      monthlyPrice: 12,
      yearlyPrice: 10,
      description: "The no-brainer upgrade for teams that ship code together.",
      features: [
        { text: "Unlimited team members", included: true },
        { text: "Unlimited projects", included: true },
        { text: "Full GitHub Actions sync", included: true },
        { text: "Unlimited message history", included: true },
        { text: "Priority support", included: true },
        { text: "Custom workspace tools", included: true },
        { text: "AI summaries & assistant", included: true },
      ],
      cta: "Start 14-day Free Trial",
      href: "/auth?mode=signup",
      highlighted: true,
      external: false,
      badge: "Most Popular",
    },
    {
      name: "Enterprise",
      icon: Building2,
      iconColor: "from-amber-500 to-orange-600",
      monthlyPrice: null,
      yearlyPrice: null,
      description: "Scale with security, compliance, and dedicated resources.",
      features: [
        { text: "Everything in Pro", included: true },
        { text: "SAML & SSO", included: true },
        { text: "Audit logs & compliance", included: true },
        { text: "Self-hosted runners", included: true },
        { text: "Dedicated success manager", included: true },
        { text: "Custom SLA", included: true },
        { text: "Onboarding & training", included: true },
      ],
      cta: "Contact Sales",
      href: "mailto:anointedthedeveloper@gmail.com",
      highlighted: false,
      external: true,
      badge: null,
    },
  ];

  const addons = [
    { icon: "🤖", title: "AI Assistant", desc: "Code summaries, PR reviews, and smart message search.", price: "$4/user/mo" },
    { icon: "📊", title: "Advanced Analytics", desc: "Team productivity dashboards and delivery insights.", price: "$3/user/mo" },
    { icon: "💾", title: "Extra Storage", desc: "50 GB additional file and attachment storage.", price: "$5/mo" },
    { icon: "🔗", title: "Premium Integrations", desc: "Linear, Jira, Notion, and Figma deep integrations.", price: "$6/user/mo" },
  ];

  const revenueRows = [
    { users: "100 users", monthly: "$1,200/mo", yearly: "$14,400/yr" },
    { users: "1,000 users", monthly: "$12,000/mo", yearly: "$144,000/yr" },
    { users: "10,000 users", monthly: "$120,000/mo", yearly: "$1.44M/yr" },
  ];

  const faqs = [
    { q: "Is there really no credit card for the trial?", a: "Correct. Start your 14-day Pro trial with just an email — no card required. You only pay if you decide to stay." },
    { q: "Can I switch plans at any time?", a: "Yes. Upgrade, downgrade, or cancel from your workspace settings at any time. Changes take effect immediately." },
    { q: "What's the yearly discount?", a: "Yearly billing saves you $24 per user per year ($10/mo vs $12/mo). Pay once, ship all year." },
    { q: "How does the referral program work?", a: "Invite 3 teammates who sign up — get 1 month of Pro free. No limit on how many months you can earn." },
    { q: "What counts as a project?", a: "Any workspace project with linked files and a repo counts toward your plan limit on Free." },
    { q: "How does Enterprise pricing work?", a: "Enterprise is custom-quoted based on team size, security requirements, and support level. Email us to start a conversation." },
  ];

  return (
    <PageLayout maxWidth="xl">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3 text-primary" /> Pricing
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl mb-5">
          Invest in your team's<br className="hidden sm:block" /> delivery speed
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Start free. Upgrade when your team can't live without it. No credit card required.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-1.5 backdrop-blur-xl">
          <button
            onClick={() => setYearly(false)}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${!yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`rounded-xl px-5 py-2 text-sm font-medium transition-all flex items-center gap-2 ${yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Yearly
            <span className="rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
              Save 17%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Plans */}
      <div className="grid gap-6 md:grid-cols-3 mb-20">
        {plans.map((plan, i) => {
          const { icon: Icon } = plan;
          const price = plan.monthlyPrice === null ? null : yearly ? plan.yearlyPrice : plan.monthlyPrice;
          return (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.07 }}
              className={`relative flex flex-col rounded-3xl p-7 ${plan.highlighted ? "border-2 border-primary bg-card/90 shadow-2xl shadow-primary/10" : "border border-border/60 bg-card/50"} backdrop-blur-xl`}>

              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full gradient-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-lg whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${plan.iconColor} shadow-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{plan.name}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4">
                <AnimatePresence mode="wait">
                  <motion.div key={yearly ? "yearly" : "monthly"} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
                    {price === null ? (
                      <span className="text-4xl font-bold tracking-tight text-foreground">Custom</span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight text-foreground">${price}</span>
                        {price > 0 && <span className="text-sm text-muted-foreground">/user/mo</span>}
                        {price === 0 && <span className="text-sm text-muted-foreground">forever</span>}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                {yearly && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                  <p className="text-xs text-emerald-500 mt-1 font-medium">
                    Save ${(plan.monthlyPrice - plan.yearlyPrice!) * 12}/user/year vs monthly
                  </p>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-6 mb-6">{plan.description}</p>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f.text} className={`flex items-center gap-2.5 text-sm ${f.included ? "text-foreground/90" : "text-muted-foreground/40 line-through"}`}>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${f.included ? "bg-primary/10" : "bg-muted"}`}>
                      <Check className={`h-3 w-3 ${f.included ? "text-primary" : "text-muted-foreground/30"}`} />
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plan.external ? (
                <a href={plan.href} className="w-full rounded-xl py-3 text-sm font-semibold text-center border border-border bg-background/80 hover:bg-muted text-foreground transition-colors block">
                  {plan.cta}
                </a>
              ) : (
                <Link to={plan.href} className={`w-full rounded-xl py-3 text-sm font-semibold text-center block transition-all ${plan.highlighted ? "gradient-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90" : "border border-border bg-background/80 hover:bg-muted text-foreground"}`}>
                  {plan.cta}
                </Link>
              )}

              {plan.highlighted && (
                <p className="text-center text-[11px] text-muted-foreground mt-3">14-day free trial · No credit card</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Revenue potential banner */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-3xl border border-primary/20 bg-primary/5 p-8 mb-16">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Revenue potential at $12/user/mo</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {revenueRows.map((row) => (
            <div key={row.users} className="rounded-2xl border border-border/50 bg-background/60 p-5 text-center">
              <p className="text-xs text-muted-foreground mb-2">{row.users}</p>
              <p className="text-2xl font-bold text-foreground">{row.monthly}</p>
              <p className="text-xs text-emerald-500 mt-1">{row.yearly} yearly</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          These are real numbers. The Pro plan scales linearly — every user you add is $12/mo in recurring revenue.
        </p>
      </motion.div>

      {/* Add-ons */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Power-ups & add-ons</h2>
          <p className="text-muted-foreground text-sm">Bolt on exactly what your team needs. Available on Pro & Enterprise.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {addons.map((addon) => (
            <div key={addon.title} className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-xl hover:border-primary/30 transition-colors">
              <span className="text-2xl mb-3 block">{addon.icon}</span>
              <p className="text-sm font-semibold text-foreground mb-1">{addon.title}</p>
              <p className="text-xs text-muted-foreground leading-5 mb-3">{addon.desc}</p>
              <span className="text-xs font-bold text-primary">{addon.price}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Referral nudge */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
        className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 mb-16 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shrink-0">
          <Gift className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-base font-bold text-foreground mb-1">Referral program — coming soon</p>
          <p className="text-sm text-muted-foreground">Invite 3 teammates who sign up → get 1 month of Pro free. No limit on how many months you can earn.</p>
        </div>
        <Link to="/auth" className="shrink-0 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 whitespace-nowrap">
          Join early <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      {/* Social proof */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
        className="rounded-3xl border border-border/60 bg-card/50 p-8 mb-16 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-6">
          <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Why teams upgrade to Pro</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { quote: "Having GitHub issues, chat, and the file editor in one tab cut our context-switching in half.", author: "Frontend team, 8 members" },
            { quote: "The unlimited message history alone is worth it. We reference old decisions constantly.", author: "Startup CTO, 12 members" },
            { quote: "We tried Slack + GitHub + Notion. RepoRoom replaced all three for our dev workflow.", author: "Open-source maintainer" },
          ].map((t) => (
            <div key={t.author} className="rounded-2xl border border-border/50 bg-background/60 p-5">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-sm text-foreground/80 leading-6 mb-3 italic">"{t.quote}"</p>
              <p className="text-xs text-muted-foreground font-medium">{t.author}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* FAQ */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-16">
        <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Frequently asked questions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {faqs.map((item) => (
            <div key={item.q} className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold text-foreground mb-2">{item.q}</p>
              <p className="text-sm text-muted-foreground leading-6">{item.a}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54 }}
        className="rounded-3xl border border-primary/20 bg-primary/5 p-10 text-center mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary mx-auto mb-5 shadow-lg shadow-primary/20">
          <Users className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Ready to make your team unstoppable?</h2>
        <p className="text-muted-foreground mb-7 max-w-md mx-auto text-sm leading-6">
          Start free today. Upgrade to Pro when RepoRoom becomes the tool your team can't work without — and it will.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-2xl gradient-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-xl shadow-primary/25">
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="mailto:anointedthedeveloper@gmail.com" className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background/80 px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Talk to us
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-4">No credit card · Cancel any time · 14-day Pro trial</p>
      </motion.div>
    </PageLayout>
  );
};

export default PricingPage;
