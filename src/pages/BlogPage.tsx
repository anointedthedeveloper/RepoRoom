import { MessageSquare, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const posts = [
  {
    slug: "why-we-built-reporoom",
    date: "June 10, 2025",
    tag: "Product",
    title: "Why we built RepoRoom",
    excerpt: "Most developer teams use a general-purpose chat tool and a separate set of dev tools. We built RepoRoom to collapse that gap — one surface for discussion, code, and delivery.",
  },
  {
    slug: "webrtc-in-a-react-app",
    date: "May 22, 2025",
    tag: "Engineering",
    title: "Building WebRTC calls inside a React app",
    excerpt: "A deep dive into how we implemented peer-to-peer audio and video calls using WebRTC, STUN/TURN servers, and Supabase Realtime for signalling.",
  },
  {
    slug: "supabase-realtime-at-scale",
    date: "April 14, 2025",
    tag: "Engineering",
    title: "Using Supabase Realtime for live messaging",
    excerpt: "How we use Supabase's postgres_changes subscriptions to power real-time message delivery, typing indicators, and presence — and what we learned along the way.",
  },
];

const BlogPage = () => {
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Blog</h1>
          <p className="text-muted-foreground">Product updates, engineering deep-dives, and team stories.</p>
        </motion.div>

        <div className="space-y-6">
          {posts.map((post, i) => (
            <motion.div key={post.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.06 }}
              className="rounded-2xl border border-border/70 bg-card/50 p-6 backdrop-blur-xl hover:border-primary/30 transition-colors cursor-pointer group">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{post.tag}</span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>
              <h2 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{post.title}</h2>
              <p className="text-sm text-muted-foreground leading-6">{post.excerpt}</p>
              <p className="mt-4 text-xs text-primary font-medium">Read more →</p>
            </motion.div>
          ))}
        </div>

        <footer className="mt-16 text-center text-xs text-muted-foreground pb-8">
          &copy; {new Date().getFullYear()} RepoRoom. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default BlogPage;
