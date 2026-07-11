import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { resolveEditorHmEffectiveChromeColorMode } from "@/lib/hmChromeLayout";
import { purgeHmVisitorThemePreference } from "@/lib/hmChromeThemePreference";

type HmChromeThemeContextValue = {
  effectiveChromeMode: "light" | "dark";
  mergedLayoutPrefs: NewsSiteLayoutPrefs | null;
};

const HmChromeThemeContext = createContext<HmChromeThemeContextValue | null>(null);

export function HmChromeThemeProvider({
  layoutPrefs,
  children,
}: {
  layoutPrefs: NewsSiteLayoutPrefs | null | undefined;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    purgeHmVisitorThemePreference();
  }, []);

  const effectiveChromeMode = useMemo(
    () => resolveEditorHmEffectiveChromeColorMode(layoutPrefs),
    [layoutPrefs],
  );

  const mergedLayoutPrefs = useMemo(
    () => (layoutPrefs ? { ...layoutPrefs, hmChromeColorMode: effectiveChromeMode } : null),
    [layoutPrefs, effectiveChromeMode],
  );

  const value = useMemo(
    (): HmChromeThemeContextValue => ({
      effectiveChromeMode,
      mergedLayoutPrefs,
    }),
    [effectiveChromeMode, mergedLayoutPrefs],
  );

  return <HmChromeThemeContext.Provider value={value}>{children}</HmChromeThemeContext.Provider>;
}

export function useHmChromeThemeOptional(): HmChromeThemeContextValue | null {
  return useContext(HmChromeThemeContext);
}

/** HM krom bileşenleri — editör `hmChromeColorMode` uygulanmış layout prefs. */
export function useHmEffectiveLayoutPrefs(): NewsSiteLayoutPrefs | null {
  const ctx = useHmPublicLinkContextOptional();
  const theme = useHmChromeThemeOptional();
  return theme?.mergedLayoutPrefs ?? ctx?.layoutPrefs ?? null;
}
