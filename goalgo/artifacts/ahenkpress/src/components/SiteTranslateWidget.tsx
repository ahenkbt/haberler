import { Languages, X } from "lucide-react";
import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { SiteTranslateProvider, useSiteTranslate } from "@/contexts/SiteTranslateContext";
import { shouldSkipSiteTranslate } from "@/lib/siteTranslateSuggestion";
import "@/styles/siteTranslate.css";

function SiteTranslateSuggestionBanner() {
  const { suggestion, suggestionVisible, applying, applyLanguage, dismissSuggestion } = useSiteTranslate();
  if (!suggestionVisible || !suggestion) return null;

  const sourceHint =
    suggestion.source === "country+browser"
      ? "konumunuza ve tarayıcı dilinize göre"
      : suggestion.source === "country"
        ? "konumunuza göre"
        : "tarayıcı dilinize göre";

  return (
    <div className="site-translate-banner" role="region" aria-label="Sayfa çeviri önerisi">
      <div className="site-translate-banner__inner">
        <Languages className="site-translate-banner__icon" aria-hidden />
        <p className="site-translate-banner__text">
          {sourceHint} sayfayı{" "}
          <strong>
            {suggestion.labelTr} ({suggestion.nativeLabel})
          </strong>{" "}
          diline çevirebilirsiniz.
        </p>
        <div className="site-translate-banner__actions">
          <button
            type="button"
            className="site-translate-banner__primary"
            disabled={applying}
            onClick={() => void applyLanguage(suggestion.targetLang)}
          >
            {applying ? "Çevriliyor…" : "Çevir"}
          </button>
          <button type="button" className="site-translate-banner__ghost" onClick={dismissSuggestion}>
            Hayır, teşekkürler
          </button>
        </div>
        <button
          type="button"
          className="site-translate-banner__close"
          aria-label="Çeviri önerisini kapat"
          onClick={dismissSuggestion}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SiteTranslateBannerGate() {
  const { ready } = useSiteTranslate();
  if (!ready) return null;
  return <SiteTranslateSuggestionBanner />;
}

function useSiteTranslateEnabled(): boolean {
  const [location] = useLocation();
  const pathNoQuery = (location.split("?")[0] ?? "").trim();
  return !shouldSkipSiteTranslate(pathNoQuery);
}

/** @deprecated App.tsx SiteTranslateRoot kullanır; geriye dönük import uyumu. */
export function SiteTranslateWidget() {
  return <SiteTranslateBannerGate />;
}

/** Tüm Yekpare + HM editör sitelerinde konuma göre Google Translate önerisi. */
export function SiteTranslateRoot({ children }: { children: ReactNode }) {
  const enabled = useSiteTranslateEnabled();
  return (
    <SiteTranslateProvider enabled={enabled}>
      <SiteTranslateBannerGate />
      {children}
    </SiteTranslateProvider>
  );
}
