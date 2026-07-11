import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_GEO,
  isNightBySun,
  msUntilNextSunTransition,
  type GeoCoords,
} from "@/lib/solarTime";
import {
  loadCachedGeo,
  loadThemePreference,
  saveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/themeStorage";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  coords: GeoCoords;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: ThemePreference, coords: GeoCoords): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return isNightBySun(coords) ? "dark" : "light";
}

function applyDomTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.dataset.ytTheme = resolved;
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? "#0f0f0f" : "#ffffff");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => loadThemePreference());
  const [coords, setCoords] = useState<GeoCoords>(() => loadCachedGeo() ?? DEFAULT_GEO);
  const resolved = useMemo(() => resolveTheme(preference, coords), [preference, coords]);

  const setPreference = useCallback((pref: ThemePreference) => {
    const next: ThemePreference = pref === "auto" ? "light" : pref;
    saveThemePreference(next);
    setPreferenceState(next);
  }, []);

  useEffect(() => {
    applyDomTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (preference !== "auto") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const delay = msUntilNextSunTransition(coords);
      timer = setTimeout(() => {
        setCoords((c) => ({ ...c }));
        schedule();
      }, delay);
    };
    schedule();
    const minute = setInterval(() => setCoords((c) => ({ ...c })), 60_000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(minute);
    };
  }, [preference, coords.lat, coords.lng]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, coords }),
    [preference, resolved, setPreference, coords],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
