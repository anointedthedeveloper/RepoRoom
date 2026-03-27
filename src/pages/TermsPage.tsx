import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import useSEO from "@/hooks/useSEO";

const sections = [
  { title: "Acceptance of Terms", body: "By accessing or using RepoRoom, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service." },
  { title: "Use of the Service", body: "You may use RepoRoom for lawful purposes only. You agree not to use the service to transmit harmful, offensive, or illegal content, or to attempt to gain unauthorised access to any part of the platform." },
  { title: "Accounts", body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at anointedthedeveloper@gmail.com if you suspect unauthorised use." },
  { title: "Intellectual Property", body: "RepoRoom and its original content, features, and functionality are owned by Anointed the Developer and are protected by applicable intellectual property laws. Your content remains yours — you grant us a limited licence to store and display it as part of the service." },
  { title: "Third-Party Services", body: "RepoRoom integrates with GitHub and Supabase. Your use of those services is governed by their respective terms of service. We are not responsible for the availability or content of third-party services." },
  { title: "Disclaimer of Warranties", body: 'RepoRoom is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or free of harmful components.' },
  { title: "Limitation of Liability", body: "To the fullest extent permitted by law, Anointed the Developer shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service." },
  { title: "Changes to Terms", body: "We may update these Terms at any time. Continued use of the service after changes constitutes acceptance of the new Terms. We will notify users of material changes via email or an in-app notice." },
  { title: "Contact", body: "Questions about these Terms? Contact us at anointedthedeveloper@gmail.com." },
];

const TermsPage = () => {
  useSEO({
    title: "Terms of Service",
    description: "RepoRoom's terms of service — use the platform lawfully, your content is yours, and we integrate with GitHub and Supabase under their respective terms.",
    path: "/terms",
  });
  return (
  <PageLayout maxWidth="md">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-14">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary mb-6 shadow-lg shadow-primary/20">
          <ScrollText className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-3">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: June 2025</p>
      </div>

      {/* Quick summary */}
      <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 mb-8">
        <p className="text-sm font-semibold text-foreground mb-1">The short version</p>
        <p className="text-sm text-muted-foreground leading-6">
          Use RepoRoom lawfully, keep your credentials safe, your content is yours, and we're not liable for third-party services.
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

export default TermsPage;
