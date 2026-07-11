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
  applyGoogleTranslate,
  currentGoogleTranslateTarget,
  isGoogleTranslateActive,
} from "@/lib/siteGoogleTranslate";
import {
  dismissTranslateSuggestion,
  readTranslateSuggestionDismissed,
  resolveSiteTranslateSuggestion,
  type SiteTranslateSuggestion,
} from "@/lib/siteTranslateSuggestion";
import {
  SITE_PAGE_LANGUAGE,
  SITE_TRANSLATE_LANGUAGES,
  siteTranslateLanguageMeta,
  type SiteTranslateLangCode,
} from "@/lib/siteTranslateLocales";

type SiteTranslateContextValue = {
  ready: boolean;
  activeLang: SiteTranslateLangCode;
  isTranslated: boolean;
  suggestion: SiteTranslateSuggestion | null;
  suggestionVisible: boolean;
  applying: boolean;
  applyLanguage: (lang: SiteTranslateLangCode | null) => Promise<void>;
  dismissSuggestion: () => void;
  languages: typeof SITE_TRANSLATE_LANGUAGES;
};

const SiteTranslateContext = createContext<SiteTranslateContextValue | null>(null);

export function SiteTranslateProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [ready, setReady] = useState(false);
  const [suggestion, setSuggestion] = useState<SiteTranslateSuggestion | null>(null);
  const [suggestionVisible, setSuggestionVisible] = useState(false);
  const [applying, setApplying] = useState(false);
  const [activeLang, setActiveLang] = useState<SiteTranslateLangCode>(() => {
    return currentGoogleTranslateTarget() ?? SITE_PAGE_LANGUAGE;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("site-google-translate-active", isGoogleTranslateActive());
  }, [activeLang]);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const current = currentGoogleTranslateTarget();
      if (current) {
        setActiveLang(current);
        setReady(true);
        return;
      }
      if (readTranslateSuggestionDismissed()) {
        setReady(true);
        return;
      }
      const resolved = await resolveSiteTranslateSuggestion();
      if (cancelled) return;
      setSuggestion(resolved);
      setSuggestionVisible(resolved != null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const applyLanguage = useCallback(async (lang: SiteTranslateLangCode | null) => {
    setApplying(true);
    try {
      await applyGoogleTranslate(lang);
      if (lang && lang !== SITE_PAGE_LANGUAGE) {
        setActiveLang(lang);
      } else {
        setActiveLang(SITE_PAGE_LANGUAGE);
      }
      setSuggestionVisible(false);
    } finally {
      setApplying(false);
    }
  }, []);

  const dismissSuggestionFn = useCallback(() => {
    dismissTranslateSuggestion();
    setSuggestionVisible(false);
  }, []);

  const value = useMemo(
    (): SiteTranslateContextValue => ({
      ready,
      activeLang,
      isTranslated: isGoogleTranslateActive(),
      suggestion,
      suggestionVisible: enabled && suggestionVisible && suggestion != null && !isGoogleTranslateActive(),
      applying,
      applyLanguage,
      dismissSuggestion: dismissSuggestionFn,
      languages: SITE_TRANSLATE_LANGUAGES,
    }),
    [
      ready,
      activeLang,
      suggestion,
      suggestionVisible,
      applying,
      applyLanguage,
      dismissSuggestionFn,
      enabled,
    ],
  );

  return <SiteTranslateContext.Provider value={value}>{children}</SiteTranslateContext.Provider>;
}

export function useSiteTranslate(): SiteTranslateContextValue {
  const ctx = useContext(SiteTranslateContext);
  if (!ctx) {
    return {
      ready: true,
      activeLang: SITE_PAGE_LANGUAGE,
      isTranslated: false,
      suggestion: null,
      suggestionVisible: false,
      applying: false,
      applyLanguage: async () => {},
      dismissSuggestion: () => {},
      languages: SITE_TRANSLATE_LANGUAGES,
    };
  }
  return ctx;
}

export function useSiteTranslateLanguageLabel(code: SiteTranslateLangCode | null | undefined): string {
  return siteTranslateLanguageMeta(code)?.labelTr ?? "Çeviri";
}
