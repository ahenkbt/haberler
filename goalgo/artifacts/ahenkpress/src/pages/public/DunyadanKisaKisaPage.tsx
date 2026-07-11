import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Globe2 } from "lucide-react";
import { HmNewsImage } from "@/components/HmNewsImage";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { countryCodeToFlagEmoji } from "@/lib/countryFlagEmoji";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { hmVitrinAccentHex } from "@/lib/hmVitrinThemeTokens";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";
import { resolveSadeAccent } from "@/lib/yekpareSadeTheme";
import { useWorldBriefs } from "@/hooks/useWorldBriefs";
import {
  activeWorldBriefContinents,
  flattenWorldBriefItems,
  formatWorldBriefTime,
  resolveWorldBriefHref,
} from "@/lib/worldBriefsDisplay";
import { WorldBriefLink } from "@/components/WorldBriefLink";
import { HM_NEWS_LOADING_LABEL } from "@/lib/hmNewsPlaceholder";
import "@/styles/dunyadanKisaKisa.css";

const PAGE_PER_FEED = 8;

function resolveVitrinThemeAttr(theme: string | null | undefined): string {
  if (theme === "corporate") return "corporate";
  if (theme === "gold") return "gold";
  if (theme === "ankara") return "ankara";
  if (
    theme === "classic" ||
    theme === "portal3" ||
    theme === "esen" ||
    theme === "manset24" ||
    theme === "renkli" ||
    theme === "modern"
  ) {
    return theme;
  }
  return "news";
}

/** `/kisa-kisa` — kıta/ülke gruplu küresel haber listesi (görselli). */
export default function DunyadanKisaKisaPage() {
  const h = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();
  const { data: settings } = useGetSiteSettings();
  const layoutPrefs = hmCtx?.layoutPrefs ?? parseNewsSiteLayoutFromJson(settings?.newsLayoutJson ?? null);
  const vitrinThemeAttr = resolveVitrinThemeAttr(layoutPrefs?.hmVitrinTheme);
  const accent = useMemo(() => {
    const fromLp = (layoutPrefs?.hmPrimaryColor?.trim() ?? "").length >= 3 ? layoutPrefs!.hmPrimaryColor!.trim() : "";
    if (fromLp) return fromLp;
    const locked = hmVitrinAccentHex(layoutPrefs?.hmVitrinTheme ?? "default");
    if (locked) return locked;
    return resolveSadeAccent(settings?.primaryColor);
  }, [layoutPrefs, settings?.primaryColor]);

  const { data, isLoading, isError } = useWorldBriefs(PAGE_PER_FEED, true);
  const continents = useMemo(() => activeWorldBriefContinents(data?.continents ?? []), [data?.continents]);
  const [activeContinent, setActiveContinent] = useState("");
  const selectedContinentId = activeContinent || continents[0]?.id || "";
  const items = useMemo(
    () => flattenWorldBriefItems(continents, { continentId: selectedContinentId || undefined }),
    [continents, selectedContinentId],
  );

  useEffect(() => {
    if (!hmCtx) return;
    applyHmNewsSiteHomeMeta({
      siteName: hmCtx.displayName,
      browserTitle: `Dünyadan Kısa Kısa · ${hmCtx.displayName}`,
      description: hmCtx.description || `Türkçe dünya gündemi — ${hmCtx.displayName}`,
      canonicalPath: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmCtx.slug)}/kisa-kisa`,
      canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
      imageUrl: hmCtx.layoutPrefs.logoUrl,
      logoUrl: hmCtx.layoutPrefs.logoUrl,
      faviconUrl: hmCtx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [hmCtx]);

  const pageBg = hmCtx ? "var(--hm-page-bg, #ffffff)" : "#ffffff";
  const contentMax = layoutPrefs?.hmVitrinTheme === "corporate" ? "max-w-[1280px]" : "max-w-screen-xl";

  return (
    <div className="min-h-screen" data-hm-vitrin-theme={vitrinThemeAttr} style={{ background: pageBg }}>
      <main className={`dunyadan-kisa-kisa-page mx-auto w-full px-4 pt-2 pb-8 ${contentMax}`}>
        <section className="hm-rss-news-band hm-rss-news-band--cols-4 dunyadan-kisa-kisa-page__band" data-hm-news-list>
          <div className="hm-rss-news-band__head">
            <div className="hm-rss-news-band__title-row">
              <span className="hm-rss-news-band__accent" style={{ background: accent }} aria-hidden />
              <h1 className="hm-rss-news-band__title">
                <Globe2 className="mr-2 inline h-5 w-5 align-text-bottom" style={{ color: accent }} aria-hidden />
                Dünyadan Kısa Kısa
              </h1>
            </div>
            <p className="dunyadan-kisa-kisa-page__subtitle">Türkçe dünya gündemi — ülke ve bölge haberleri</p>
          </div>

          {continents.length > 1 ? (
            <div className="hm-rss-news-band__tabs" role="tablist" aria-label="Kıtalar">
              {continents.map((continent) => {
                const active = continent.id === selectedContinentId;
                return (
                  <button
                    key={continent.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`hm-rss-news-band__tab${active ? " hm-rss-news-band__tab--active" : ""}`}
                    style={active ? { background: accent } : undefined}
                    onClick={() => setActiveContinent(continent.id)}
                  >
                    {continent.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {isLoading ? (
            <div className="hm-rss-news-band__empty">{HM_NEWS_LOADING_LABEL}</div>
          ) : isError ? (
            <div className="hm-rss-news-band__empty hm-rss-news-band__empty--error">
              Haber listesi yüklenemedi. Sayfayı yenileyin.
            </div>
          ) : items.length > 0 ? (
            <div className="hm-rss-news-band__grid">
              {items.map((item) => (
                <WorldBriefLink
                  key={item.id}
                  href={resolveWorldBriefHref(h, item)}
                  className="hm-rss-news-band__card"
                  data-hm-news-row
                >
                  <div className="hm-rss-news-band__media">
                    <HmNewsImage src={item.imageUrl} alt={item.title} className="hm-rss-news-band__img" loading="lazy" />
                    {item.countryName || item.countryCode ? (
                      <span className="hm-rss-news-band__badge" style={{ background: accent }}>
                        {countryCodeToFlagEmoji(item.countryCode)} {item.countryName || item.feedLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="hm-rss-news-band__body">
                    <h3 className="hm-rss-news-band__headline">{item.title}</h3>
                    {item.spot ? <p className="hm-rss-news-band__excerpt">{item.spot}</p> : null}
                    <p className="dunyadan-kisa-kisa-page__card-meta">
                      {item.sourceName}
                      {item.publishedAt ? ` · ${formatWorldBriefTime(item.publishedAt)}` : ""}
                    </p>
                  </div>
                </WorldBriefLink>
              ))}
            </div>
          ) : (
            <div className="hm-rss-news-band__empty">Bu kıtada henüz haber yok.</div>
          )}
        </section>
      </main>
    </div>
  );
}
