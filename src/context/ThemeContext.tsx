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
