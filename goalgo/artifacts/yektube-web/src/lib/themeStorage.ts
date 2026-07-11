export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "yektube-v2:theme";
export const GEO_STORAGE_KEY = "yektube-v2:geo";

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
    if (raw === "auto") {
      const migrated =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      saveThemePreference(migrated);
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return "light";
}

export function saveThemePreference(pref: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, pref);
}

export function loadCachedGeo(): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem(GEO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number };
    if (typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveCachedGeo(coords: { lat: number; lng: number }): void {
  try {
    sessionStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}
