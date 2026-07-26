"use client";

import * as React from "react";

/**
 * Theme system for the admin.
 *
 * Three user-facing choices — "system" (the default), "light", "dark".
 * "system" tracks the OS `prefers-color-scheme` live; the explicit modes
 * pin it. The resolved value is applied as a `.dark` class on <html>,
 * which globals.css keys every dark-mode colour off of.
 *
 * The FIRST paint is handled by the blocking inline script in
 * app/layout.tsx (so there's no flash of light before hydration). This
 * provider takes over afterwards: it keeps <html> in sync when the user
 * toggles and when the OS preference changes while on "system".
 */
export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "bondzi-theme";

interface ThemeContextValue {
  /** The user's stored choice. */
  theme: Theme;
  /** What "system" (or an explicit choice) actually resolves to right now. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyClass(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  // Keeps native form controls / scrollbars in the right scheme.
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read the stored choice on mount. SSR renders "system"; the inline
  // script has already set the correct class, so there's no visual flash
  // even though this initial render doesn't know the choice yet.
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] =
    React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, []);

  // Resolve + apply whenever the choice changes, and subscribe to OS
  // changes while on "system".
  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const resolve = () => {
      const next: ResolvedTheme =
        theme === "system" ? (mql.matches ? "dark" : "light") : theme;
      setResolvedTheme(next);
      applyClass(next);
    };

    resolve();

    if (theme === "system") {
      mql.addEventListener("change", resolve);
      return () => mql.removeEventListener("change", resolve);
    }
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
