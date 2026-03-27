import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import useSEO from "@/hooks/useSEO";

const sections = [
  { title: "Information We Collect", body: "We collect information you provide directly, such as your email address, username, and display name when you create an account. We also collect content you create within the platform, including messages, project files, and workspace data." },
  { title: "How We Use Your Information", body: "We use your information to provide and improve the RepoRoom service, send you notifications you've opted into, and respond to your support requests. We do not sell your personal data to third parties." },
  { title: "GitHub Integration", body: "When you connect your GitHub account, we request only the minimum permissions necessary. Your source code remains on GitHub — we only access metadata and content you explicitly choose to import into your workspace." },
  { title: "Data Storage", body: "Your data is stored securely using Supabase (PostgreSQL) with row-level security enabled on every table. Only authenticated members of a workspace can access its data." },
  { title: "Cookies", body: "We use essential cookies to maintain your session. We do not use tracking or advertising cookies." },
  { title: "Your Rights", body: "You may request deletion of your account and associated data at any time by contacting us at anointedthedeveloper@gmail.com. We will process your request within 30 days." },
  { title: "Contact", body: "If you have any questions about this Privacy Policy, please contact us at anointedthedeveloper@gmail.com." },
];

const PrivacyPage = () => {
  useSEO({
    title: "Privacy Policy",
    description: "RepoRoom's privacy policy — we collect only what we need, never sell your data, your code stays on GitHub, and you can delete your account any time.",
    path: "/privacy",
  });
  return (
  <PageLayout maxWidth="md">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-14">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary mb-6 shadow-lg shadow-primary/20">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-3">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: June 2025</p>
      </div>

      {/* Quick summary */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-8">
        <p className="text-sm font-semibold text-foreground mb-1">The short version</p>
        <p className="text-sm text-muted-foreground leading-6">
          We collect only what we need, we don't sell your data, your code stays on GitHub, and you can delete your account any time.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
            className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">{i + 1}</span>
              <h2 className="text-sm font-semibold text-foreground">{s.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-7 pl-8">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </PageLayout>
  );
};

export default PrivacyPage;
