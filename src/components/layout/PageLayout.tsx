import { MessageSquare, Menu, X, Github, Mail, Sparkles, ChevronRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", path: "/features" },
  { label: "Pricing", path: "/pricing" },
  { label: "Changelog", path: "/changelog" },
  { label: "Roadmap", path: "/roadmap" },
  { label: "About", path: "/about" },
  { label: "Blog", path: "/blog" },
];

interface Props {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const PageLayout = ({ children, maxWidth = "lg" }: Props) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const widthClass = {
    sm: "max-w-2xl",
    md: "max-w-3xl",
    lg: "max-w-5xl",
    xl: "max-w-7xl",
  }[maxWidth];

  const currentPage = navLinks.find((l) => l.path === location.pathname);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.10),_transparent_50%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-50 w-full">
        <div className="border-b border-border/40 bg-background/80 backdrop-blur-2xl shadow-[0_1px_0_0_hsl(var(--border)/0.4)]">
          <div className="mx-auto flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-screen-2xl">

            {/* Logo — always visible, fixed width */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-primary shadow-md shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                <MessageSquare className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground hidden sm:block tracking-tight">RepoRoom</span>
            </Link>

            {/* Breadcrumb — only when no pill nav visible */}
            {currentPage && (
              <div className="flex items-center gap-1 text-muted-foreground md:hidden">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm font-medium text-foreground/70 truncate max-w-[120px]">{currentPage.label}</span>
              </div>
            )}

            {/* Pill nav — scrollable so it never wraps or overflows */}
            <nav className="hidden md:flex flex-1 justify-center overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-0.5 rounded-2xl border border-border/50 bg-muted/40 px-1.5 py-1 backdrop-blur-sm">
                {navLinks.map((l) => {
                  const active = location.pathname === l.path;
                  return (
                    <Link
                      key={l.path}
                      to={l.path}
                      className={cn(
                        "relative whitespace-nowrap px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150",
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-xl bg-background shadow-sm border border-border/50"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{l.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Right — auth CTA + hamburger, fixed width */}
            <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
              {user ? (
                <Link to="/dashboard"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-opacity whitespace-nowrap">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/auth"
                    className="hidden lg:inline-flex rounded-xl border border-border/60 bg-background/60 px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap">
                    Sign in
                  </Link>
                  <Link to="/auth"
                    className="rounded-xl gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-opacity whitespace-nowrap">
                    Get Started
                  </Link>
                </>
              )}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="md:hidden h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 top-14 bg-background/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              {/* Panel */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 z-50 md:hidden border-b border-border/50 bg-background/95 backdrop-blur-2xl shadow-xl"
              >
                <div className="px-4 py-4 space-y-1">
                  {navLinks.map((l) => {
                    const active = location.pathname === l.path;
                    return (
                      <Link
                        key={l.path}
                        to={l.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {l.label}
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </Link>
                    );
                  })}

                  <div className="pt-2 border-t border-border/40 mt-2 flex flex-col gap-2">
                    {user ? (
                      <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center rounded-xl gradient-primary py-2.5 text-sm font-semibold text-primary-foreground">
                        Dashboard
                      </Link>
                    ) : (
                      <>
                        <Link to="/auth" onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                          Sign in
                        </Link>
                        <Link to="/auth" onClick={() => setMobileOpen(false)}
                          className="flex items-center justify-center rounded-xl gradient-primary py-2.5 text-sm font-semibold text-primary-foreground">
                          Get Started
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Page content */}
      <main className={cn("mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-0", widthClass)}>
        {children}
      </main>

      {/* Shared footer */}
      <footer className={cn("mx-auto px-4 sm:px-6 lg:px-8 mt-20 pb-10", widthClass)}>
        <div className="border-t border-border/40 pt-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-md shadow-primary/20">
                  <MessageSquare className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-base font-bold text-foreground">RepoRoom</span>
              </div>
              <p className="text-sm text-muted-foreground leading-6 max-w-xs">
                The developer messaging platform that ties your chat directly to your codebase and delivery workflow.
              </p>
              <div className="flex items-center gap-2 mt-5">
                <a href="https://github.com/anointedthedeveloper" target="_blank" rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted transition-all">
                  <Github className="h-3.5 w-3.5" />
                </a>
                <a href="mailto:anointedthedeveloper@gmail.com"
                  className="h-8 w-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted transition-all">
                  <Mail className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-4">Product</p>
              <ul className="space-y-2.5">
                {[["Features", "/features"], ["Pricing", "/pricing"], ["Changelog", "/changelog"], ["Roadmap", "/roadmap"]].map(([label, path]) => (
                  <li key={path}>
                    <Link to={path} className={cn("text-sm transition-colors", location.pathname === path ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground")}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-4">Company</p>
              <ul className="space-y-2.5">
                {[["About", "/about"], ["Blog", "/blog"], ["Privacy", "/privacy"], ["Terms", "/terms"]].map(([label, path]) => (
                  <li key={path}>
                    <Link to={path} className={cn("text-sm transition-colors", location.pathname === path ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground")}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground border-t border-border/20 pt-6">
            <p>&copy; 2026 RepoRoom. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              Built with <Sparkles className="h-3 w-3 text-primary" /> by{" "}
              <a href="https://github.com/anointedthedeveloper" target="_blank" rel="noopener noreferrer"
                className="font-semibold text-foreground hover:text-primary transition-colors">
                Anointed the Developer
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PageLayout;
