import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export type YekpareThemeMode = "day" | "night";
export type YekpareThemeSource = "auto" | "manual";

const STORAGE_KEY = "yekpare_home_theme_override";
const THEME_CHANGE_EVENT = "yekpare-theme-change";
const LEGACY_THEME_CHANGE_EVENT = "yekpare-home-theme-change";

/** 06:00–19:59 gündüz, aksi gece */
export function resolveAutoYekpareTheme(now = new Date()): YekpareThemeMode {
  const hour = now.getHours();
  return hour >= 6 && hour < 20 ? "day" : "night";
}

function readStoredOverride(): YekpareThemeMode | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "day" || raw === "night" ? raw : null;
}

function broadcastThemeChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT));
  window.dispatchEvent(new CustomEvent(LEGACY_THEME_CHANGE_EVENT));
}

export function applyYekpareDocumentTheme(theme: YekpareThemeMode) {
  if (typeof document === "undefined") return;
  for (const el of [document.documentElement, document.body]) {
    if (!el) continue;
    el.setAttribute("data-yekpare-theme", theme);
    el.setAttribute("data-home-theme", theme);
  }
}

/** Effective theme from storage override or auto schedule. */
export function resolveEffectiveYekpareTheme(
  override: YekpareThemeMode | null = readStoredOverride(),
  now = new Date(),
): YekpareThemeMode {
  return override ?? resolveAutoYekpareTheme(now);
}

/** Apply before React paint so every route inherits html/body theme attrs. */
export function bootstrapYekpareDocumentTheme(now = new Date()) {
  applyYekpareDocumentTheme(resolveEffectiveYekpareTheme(readStoredOverride(), now));
}

export function useYekpareTheme() {
  const [override, setOverride] = useState<YekpareThemeMode | null>(() => readStoredOverride());
  const [autoTheme, setAutoTheme] = useState<YekpareThemeMode>(() => resolveAutoYekpareTheme());

  useEffect(() => {
    const tick = () => setAutoTheme(resolveAutoYekpareTheme());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const syncFromStorage = () => setOverride(readStoredOverride());
    window.addEventListener(THEME_CHANGE_EVENT, syncFromStorage);
    window.addEventListener(LEGACY_THEME_CHANGE_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener(LEGACY_THEME_CHANGE_EVENT, syncFromStorage);
    };
  }, []);

  const source: YekpareThemeSource = override ? "manual" : "auto";
  const theme: YekpareThemeMode = override ?? autoTheme;

  useLayoutEffect(() => {
    applyYekpareDocumentTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setOverride((prev) => {
      const effective = prev ?? autoTheme;
      const next: YekpareThemeMode = effective === "day" ? "night" : "day";
      localStorage.setItem(STORAGE_KEY, next);
      broadcastThemeChange();
      return next;
    });
  }, [autoTheme]);

  const resetToAuto = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    broadcastThemeChange();
    setOverride(null);
  }, []);

  return { theme, source, autoTheme, toggleTheme, resetToAuto };
}
