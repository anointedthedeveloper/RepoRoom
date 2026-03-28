import { Menu, X, Github, Mail, Sparkles, ChevronRight, Sun, Moon, Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const FaviconLogo = ({ className }: { className?: string }) => {
  const { mode } = useThemeContext();
  const bg = mode === "light" ? "#f0f4ff" : "#0d1117";
  const panel = mode === "light" ? "#ffffff" : "#161b22";
  const bar = mode === "light" ? "#e2e8f0" : "#21262d";
  const border = mode === "light" ? "#cbd5e1" : "#30363d";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className={className}>
      <rect width="32" height="32" rx="8" fill={bg}/>
      <rect x="4" y="5" width="24" height="22" rx="4" fill={panel} stroke={border} strokeWidth="1"/>
      <rect x="4" y="5" width="24" height="6" rx="4" fill={bar}/>
      <rect x="8" y="5" width="24" height="3" fill={bar}/>
      <circle cx="9" cy="8" r="1.5" fill="#ff5f57"/>
      <circle cx="14" cy="8" r="1.5" fill="#febc2e"/>
      <circle cx="19" cy="8" r="1.5" fill="#28c840"/>
      <path d="M8 18.5 L12 16 L8 13.5" stroke="#58a6ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 18.5 L20 16 L24 13.5" stroke="#58a6ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="17.5" y1="12.5" x2="14.5" y2="19.5" stroke="#3fb950" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
};

const navLinks = [
  { label: "Features",  path: "/features" },
  { label: "Pricing",   path: "/pricing" },
  { label: "Changelog", path: "/changelog" },
  { label: "Roadmap",   path: "/roadmap" },
  { label: "About",     path: "/about" },
  { label: "Blog",      path: "/blog" },
];

const themes = [
  { id: "default", label: "Default", color: "bg-blue-500" },
  { id: "ocean",   label: "Ocean",   color: "bg-sky-500" },
  { id: "forest",  label: "Forest",  color: "bg-emerald-500" },
  { id: "rose",    label: "Rose",    color: "bg-rose-500" },
  { id: "doodle",  label: "Doodle",  color: "bg-purple-400" },
] as const;

interface Props {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const PageLayout = ({ children, maxWidth = "lg" }: Props) => {
  const { user } = useAuth();
  const { mode, theme, setMode, setTheme } = useThemeContext();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  const widthClass = {
    sm: "max-w-2xl",
    md: "max-w-3xl",
    lg: "max-w-5xl",
    xl: "max-w-7xl",
  }[maxWidth];

  const currentPage = navLinks.find((l) => l.path === location.pathname);
  const activeTheme = themes.find((t) => t.id === theme) ?? themes[0];

  // Close theme picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.10),_transparent_50%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--background)))]">

      {/* ── Sticky nav ── */}
      <header className="sticky top-0 z-50 w-full">
        <div className="border-b border-border/40 bg-background/80 backdrop-blur-2xl shadow-[0_1px_0_0_hsl(var(--border)/0.4)]">
          <div className="mx-auto flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-screen-2xl">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden shadow-md shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                <FaviconLogo className="h-full w-full" />
              </div>
              <span className="text-sm font-bold text-foreground hidden sm:block tracking-tight">RepoRoom</span>
            </Link>

            {/* Breadcrumb — mobile only */}
            {currentPage && (
              <div className="flex items-center gap-1 text-muted-foreground md:hidden">
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm font-medium text-foreground/70 truncate max-w-[110px]">{currentPage.label}</span>
              </div>
            )}

            {/* Pill nav — desktop */}
            <nav className="hidden md:flex flex-1 justify-center overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-0.5 rounded-2xl border border-border/50 bg-muted/40 px-1.5 py-1 backdrop-blur-sm">
                {navLinks.map((l) => {
                  const active = location.pathname === l.path;
                  return (
                    <Link key={l.path} to={l.path}
                      className={cn(
                        "relative whitespace-nowrap px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-150",
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                      )}
                    >
                      {active && (
                        <motion.span layoutId="nav-pill"
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

            {/* Right — theme picker + auth + hamburger */}
            <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">

              {/* ── Theme picker ── */}
              <div ref={themeRef} className="relative">
                <button
                  onClick={() => setThemeOpen((v) => !v)}
                  className="flex items-center gap-1.5 h-8 rounded-xl border border-border/60 bg-background/60 px-2.5 hover:bg-muted transition-colors"
                  title="Change theme"
                >
                  <span className={cn("h-3.5 w-3.5 rounded-full shrink-0", activeTheme.color)} />
                  {mode === "dark"
                    ? <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                    : <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </button>

                <AnimatePresence>
                  {themeOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl p-3 z-50"
                    >
                      {/* Mode toggle */}
                      <div className="flex gap-1.5 mb-3">
                        {(["dark", "light"] as const).map((m) => (
                          <button key={m} onClick={() => setMode(m)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium transition-all",
                              mode === m
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                          >
                            {m === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                            {m === "dark" ? "Dark" : "Light"}
                          </button>
                        ))}
                      </div>

                      {/* Divider */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1">Colour</p>

                      {/* Theme swatches */}
                      <div className="grid grid-cols-5 gap-1.5">
                        {themes.map((t) => (
                          <button key={t.id} onClick={() => { setTheme(t.id); }}
                            title={t.label}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all",
                              theme === t.id ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted"
                            )}
                          >
                            <span className={cn("h-5 w-5 rounded-full flex items-center justify-center", t.color)}>
                              {theme === t.id && <Check className="h-3 w-3 text-white" />}
                            </span>
                            <span className="text-[9px] text-muted-foreground leading-none">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Auth */}
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

              {/* Hamburger */}
              <button onClick={() => setMobileOpen((v) => !v)}
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 top-14 bg-background/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 z-50 md:hidden border-b border-border/50 bg-background/95 backdrop-blur-2xl shadow-xl"
              >
                <div className="px-4 py-4 space-y-1">
                  {navLinks.map((l) => {
                    const active = location.pathname === l.path;
                    return (
                      <Link key={l.path} to={l.path} onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {l.label}
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                      </Link>
                    );
                  })}

                  {/* Mobile theme row */}
                  <div className="pt-3 border-t border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-1">Appearance</p>
                    <div className="flex gap-1.5 mb-3">
                      {(["dark", "light"] as const).map((m) => (
                        <button key={m} onClick={() => setMode(m)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all",
                            mode === m ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {m === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                          {m === "dark" ? "Dark" : "Light"}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {themes.map((t) => (
                        <button key={t.id} onClick={() => setTheme(t.id)} title={t.label}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl p-2 transition-all",
                            theme === t.id ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted"
                          )}
                        >
                          <span className={cn("h-5 w-5 rounded-full flex items-center justify-center", t.color)}>
                            {theme === t.id && <Check className="h-3 w-3 text-white" />}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex flex-col gap-2">
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

      {/* Footer */}
      <footer className={cn("mx-auto px-4 sm:px-6 lg:px-8 mt-20 pb-10", widthClass)}>
        <div className="border-t border-border/40 pt-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-md shadow-primary/20">
                  <FaviconLogo className="h-full w-full" />
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
            <div className="flex flex-col gap-1">
              <p>&copy; 2026 RepoRoom. All rights reserved.</p>
              <p className="flex items-center gap-1">
                Powered by{" "}
                <a href="https://anobyte.online" target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-foreground hover:text-primary transition-colors">
                  Anobyte
                </a>
              </p>
            </div>
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
