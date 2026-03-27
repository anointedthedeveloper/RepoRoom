import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import useSEO from "@/hooks/useSEO";

const posts = [
  {
    slug: "why-we-built-reporoom",
    date: "June 10, 2025",
    readTime: "4 min read",
    tag: "Product",
    tagColor: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    title: "Why we built RepoRoom",
    excerpt: "Most developer teams use a general-purpose chat tool and a separate set of dev tools. We built RepoRoom to collapse that gap — one surface for discussion, code, and delivery.",
  },
  {
    slug: "webrtc-in-a-react-app",
    date: "May 22, 2025",
    readTime: "8 min read",
    tag: "Engineering",
    tagColor: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    title: "Building WebRTC calls inside a React app",
    excerpt: "A deep dive into how we implemented peer-to-peer audio and video calls using WebRTC, STUN/TURN servers, and Supabase Realtime for signalling.",
  },
  {
    slug: "supabase-realtime-at-scale",
    date: "April 14, 2025",
    readTime: "6 min read",
    tag: "Engineering",
    tagColor: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    title: "Using Supabase Realtime for live messaging",
    excerpt: "How we use Supabase's postgres_changes subscriptions to power real-time message delivery, typing indicators, and presence — and what we learned along the way.",
  },
];

const BlogPage = () => {
  useSEO({
    title: "Blog",
    description: "Engineering deep-dives, product stories, and updates from the RepoRoom team — WebRTC, Supabase Realtime, and developer tooling.",
    path: "/blog",
  });
  return (
  <PageLayout maxWidth="md">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-14">
      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-6">
        Blog
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">Stories & updates</h1>
      <p className="text-lg text-muted-foreground">Product updates, engineering deep-dives, and team stories.</p>
    </motion.div>

    <div className="space-y-5">
      {posts.map((post, i) => (
        <motion.article key={post.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.07 }}
          className="group rounded-2xl border border-border/60 bg-card/60 p-7 backdrop-blur-xl hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${post.tagColor}`}>{post.tag}</span>
            <span className="text-xs text-muted-foreground">{post.date}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{post.readTime}</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors leading-snug">{post.title}</h2>
          <p className="text-sm text-muted-foreground leading-6 mb-4">{post.excerpt}</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all">
            Read more <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </motion.article>
      ))}
    </div>
  </PageLayout>
  );
};

export default BlogPage;
