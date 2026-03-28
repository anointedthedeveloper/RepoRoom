import { Outlet, NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard, LayoutGrid, Settings, LogOut,
  PanelLeftClose, PanelLeftOpen, Menu, X,
  BookOpen, Tag, Map, Info, FileText, Shield, ScrollText, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useThemeContext } from "@/context/ThemeContext";

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
import AvatarBubble from "@/components/chat/AvatarBubble";
import ThemeToggle from "@/components/chat/ThemeToggle";
import PageLoader from "@/components/ui/PageLoader";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
};

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: MessageSquare,   label: "Chat",       path: "/chat" },
  { icon: LayoutGrid,      label: "Workspace",  path: "/workspace" },
  { icon: Settings,        label: "Settings",   path: "/settings" },
];

const pageLinks = [
  { icon: Zap,        label: "Features",  path: "/features" },
  { icon: Tag,        label: "Pricing",   path: "/pricing" },
  { icon: BookOpen,   label: "Changelog", path: "/changelog" },
  { icon: Map,        label: "Roadmap",   path: "/roadmap" },
  { icon: Info,       label: "About",     path: "/about" },
  { icon: FileText,   label: "Blog",      path: "/blog" },
  { icon: Shield,     label: "Privacy",   path: "/privacy" },
  { icon: ScrollText, label: "Terms",     path: "/terms" },
];

const publicPages = ["/", "/features", "/pricing", "/changelog", "/roadmap", "/about", "/blog", "/privacy", "/terms"];

const RootLayout = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => { if (isMobile) setIsCollapsed(true); }, [isMobile]);
  useEffect(() => { setIsMobileMenuOpen(false); }, [location.pathname]);

  const [navigating, setNavigating] = useState(false);
  const prevPath = useState(location.pathname)[0];

  useEffect(() => {
    setNavigating(true);
    const t = setTimeout(() => setNavigating(false), 350);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const isPublicPage = publicPages.includes(location.pathname);

  if (!user || isPublicPage) return (
    <>
      <ScrollToTop />
      <AnimatePresence>{navigating && <PageLoader />}</AnimatePresence>
      <Outlet />
    </>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background">

      {/* Mobile FAB */}
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed bottom-6 right-6 z-[60] h-14 w-14 rounded-full gradient-primary shadow-2xl shadow-primary/30 flex items-center justify-center text-white lg:hidden"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobile && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? (isMobileMenuOpen ? "272px" : "0px") : (isCollapsed ? "68px" : "256px"),
          x: isMobile && !isMobileMenuOpen ? -20 : 0,
          opacity: isMobile && !isMobileMenuOpen ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "h-full flex flex-col shrink-0 z-50 overflow-hidden",
          "bg-sidebar border-r border-border/50",
          isMobile ? "fixed left-0 top-0 bottom-0 shadow-2xl" : "relative",
        )}
      >
        {/* ── Logo ── */}
        <div className={cn(
          "flex items-center gap-3 border-b border-border/40 shrink-0",
          isCollapsed ? "px-3 py-4 justify-center" : "px-4 py-4"
        )}>
          <button
            onClick={() => navigate("/")}
            className="h-9 w-9 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
          >
            <FaviconLogo className="h-full w-full" />
          </button>

          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-bold text-foreground tracking-tight truncate">RepoRoom</p>
                <p className="text-[10px] text-muted-foreground truncate">Developer Hub</p>
              </motion.div>
            )}
          </AnimatePresence>

          {isMobile && !isCollapsed && (
            <button onClick={() => setIsMobileMenuOpen(false)}
              className="ml-auto h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">

          {/* Main nav */}
          <div className="space-y-0.5">
            {!isCollapsed && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">App</p>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  "relative flex items-center gap-3 rounded-xl transition-all duration-150 group",
                  isCollapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                {({ isActive }) => (
                  <>
                    {/* Active left bar */}
                    {isActive && !isCollapsed && (
                      <motion.span
                        layoutId="sidebar-active-bar"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                      />
                    )}
                    {isActive && isCollapsed && (
                      <motion.span
                        layoutId="sidebar-active-bar"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                      />
                    )}
                    <item.icon className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-transform group-active:scale-90",
                      isActive ? "text-primary" : ""
                    )} />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.1 }}
                          className="text-sm font-medium truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Pages nav */}
          <div className="space-y-0.5">
            {!isCollapsed && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Pages</p>
            )}
            {isCollapsed && <div className="mx-2 h-px bg-border/40 mb-2" />}
            {pageLinks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  "relative flex items-center gap-3 rounded-xl transition-all duration-150",
                  isCollapsed ? "px-0 py-2 justify-center" : "px-3 py-2",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-pages-bar"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary"
                      />
                    )}
                    <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.1 }}
                          className="text-xs font-medium truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border/40 px-2 py-3 space-y-2">
          <ThemeToggle />

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all",
              isCollapsed && "justify-center px-0"
            )}
          >
            {isCollapsed
              ? <PanelLeftOpen className="h-4 w-4 shrink-0" />
              : <><PanelLeftClose className="h-4 w-4 shrink-0" /><span className="text-xs font-medium">Collapse</span></>
            }
          </button>

          {/* User card */}
          <div className={cn(
            "flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/30 transition-all",
            isCollapsed ? "p-1.5 justify-center" : "p-2"
          )}>
            <AvatarBubble
              letter={profile?.username?.[0]?.toUpperCase() || "U"}
              imageUrl={profile?.avatar_url}
              size="sm"
            />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
                    {profile?.display_name || profile?.username || "User"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    @{profile?.username || "user"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!isCollapsed && (
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0 relative overflow-hidden bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.03),transparent_25%),radial-gradient(circle_at_bottom_left,hsl(var(--accent)/0.03),transparent_25%)]">
        <ScrollToTop />
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;
