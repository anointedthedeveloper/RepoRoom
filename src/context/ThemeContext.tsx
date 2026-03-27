import React, { createContext, useContext, useEffect, useState } from "react";

type Mode = "dark" | "light";
type Theme = "default" | "ocean" | "forest" | "rose" | "doodle";

interface ThemeContextType {
  mode: Mode;
  theme: Theme;
  wallpaper: string | null;
  setMode: (m: Mode) => void;
  setTheme: (t: Theme) => void;
  setWallpaper: (url: string | null) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark", theme: "default", wallpaper: null,
  setMode: () => {}, setTheme: () => {}, setWallpaper: () => {},
});

// theme-color values per theme+mode combination
const THEME_COLORS: Record<string, Record<string, string>> = {
  default: { dark: "#3b82f6", light: "#2563eb" },
  ocean:   { dark: "#0ea5e9", light: "#0284c7" },
  forest:  { dark: "#22c55e", light: "#16a34a" },
  rose:    { dark: "#f43f5e", light: "#e11d48" },
  doodle:  { dark: "#a855f7", light: "#9333ea" },
};

const BG_COLORS: Record<string, Record<string, string>> = {
  default: { dark: "#0a0e18", light: "#f3f4f8" },
  ocean:   { dark: "#061018", light: "#f0f7fa" },
  forest:  { dark: "#061209", light: "#f0f7f2" },
  rose:    { dark: "#120609", light: "#fdf2f5" },
  doodle:  { dark: "#0d0814", light: "#f5f0fd" },
};

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<Mode>(() => (localStorage.getItem("cf-mode") as Mode) || "dark");
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem("cf-theme") as Theme) || "default");
  const [wallpaper, setWallpaperState] = useState<string | null>(() => localStorage.getItem("cf-wallpaper"));

  const apply = (m: Mode, t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.remove("theme-ocean", "theme-forest", "theme-rose", "theme-doodle");
    root.classList.add(m);
    if (t !== "default") root.classList.add(`theme-${t}`);

    const themeColor = THEME_COLORS[t]?.[m] ?? "#3b82f6";
    const bgColor = BG_COLORS[t]?.[m] ?? "#0a0e18";

    // Persist so the inline script in index.html can restore on next load
    localStorage.setItem("cf-theme-color", themeColor);
    localStorage.setItem("cf-bg-color", bgColor);

    let metaTheme = document.querySelector<HTMLMetaElement>("meta[name='theme-color']");
    if (!metaTheme) {
      metaTheme = document.createElement("meta");
      metaTheme.name = "theme-color";
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = themeColor;

    let metaBg = document.querySelector<HTMLMetaElement>("meta[name='background-color']");
    if (!metaBg) {
      metaBg = document.createElement("meta");
      metaBg.name = "background-color";
      document.head.appendChild(metaBg);
    }
    metaBg.content = bgColor;
  };

  useEffect(() => { apply(mode, theme); }, [mode, theme]);

  const setMode = (m: Mode) => { setModeState(m); localStorage.setItem("cf-mode", m); };
  const setTheme = (t: Theme) => { setThemeState(t); localStorage.setItem("cf-theme", t); };
  const setWallpaper = (url: string | null) => {
    setWallpaperState(url);
    if (url) localStorage.setItem("cf-wallpaper", url);
    else localStorage.removeItem("cf-wallpaper");
  };

  return (
    <ThemeContext.Provider value={{ mode, theme, wallpaper, setMode, setTheme, setWallpaper }}>
      {children}
    </ThemeContext.Provider>
  );
};
