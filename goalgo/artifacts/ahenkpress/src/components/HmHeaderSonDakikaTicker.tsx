import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { apiRequest } from "@/lib/queryClient";
import { hmVitrinAccentHex } from "@/lib/hmVitrinThemeTokens";

type BreakingRow = {
  id: number | string;
  slug?: string | null;
  title?: string | null;
  href?: string | null;
  previewHref?: string | null;
};

type Props = {
  /** Koyu logo bandı (varsayılan HM) — açık renkli özel arka planda false */
  variantLight: boolean;
  mode?: "breaking" | "latest";
  /** `header-row`: logo yanı; `chrome-band`: menü altı tam genişlik şerit */
  surface?: "header-row" | "chrome-band";
};

async function fetchHeaderTickerItems(siteId: number, mode: "breaking" | "latest"): Promise<BreakingRow[]> {
  if (mode === "latest") {
    const payload = (await apiRequest(
      `/api/news?siteId=${encodeURIComponent(String(siteId))}&status=published&limit=15`,
    )) as { items?: BreakingRow[] };
    return payload.items ?? [];
  }
  const breaking = (await apiRequest(
    `/api/news/breaking?siteId=${encodeURIComponent(String(siteId))}`,
  )) as BreakingRow[];
  if (Array.isArray(breaking) && breaking.length > 0) return breaking;
  const latest = (await apiRequest(
    `/api/news?siteId=${encodeURIComponent(String(siteId))}&status=published&limit=15`,
  )) as { items?: BreakingRow[] };
  if ((latest.items ?? []).length > 0) return latest.items ?? [];
  const rss = (await apiRequest(
    `/api/hm/rss-breaking?siteId=${encodeURIComponent(String(siteId))}&limit=15`,
  )) as { items?: BreakingRow[] };
  return (rss.items ?? []).map((item) => ({
    ...item,
    id: `rss:${item.id}`,
    href: item.previewHref ?? item.href ?? null,
  }));
}

/** Menü altı band boş kalmasın diye ön kontrol. */
export function useHmHeaderSonDakikaItems(mode: "breaking" | "latest" = "breaking"): BreakingRow[] {
  const ctx = useHmPublicLinkContextOptional();
  const siteId = ctx?.siteId;
  const enabled = ctx?.layoutPrefs?.hmNewsBreakingBandEnabled !== false;

  const { data: items = [] } = useQuery<BreakingRow[]>({
    queryKey: ["/api/news/header-ticker", mode, siteId],
    queryFn: () => fetchHeaderTickerItems(siteId!, mode),
    staleTime: 60 * 1000,
    enabled: enabled && siteId != null && siteId > 0,
  });

  return items.filter((n) => n?.id != null && String(n.title ?? "").trim());
}

/** HM genel vitrin: kayan son dakika (`isBreaking` + yayında). */
export function HmHeaderSonDakikaTicker({ variantLight, mode = "breaking", surface = "header-row" }: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const list = useHmHeaderSonDakikaItems(mode);
  const chromeBand = surface === "chrome-band";

  if (!list.length) return null;

  const label = mode === "latest" ? "Son haberler" : "Son dakika";
  const shortLabel = mode === "latest" ? "Haber" : "SD";
  const primaryHex = (layoutPrefs?.hmPrimaryColor ?? "").trim();
  const accent =
    (primaryHex.length >= 3 ? primaryHex : "") ||
    hmVitrinAccentHex(layoutPrefs?.hmVitrinTheme ?? "default") ||
    "var(--hm-accent, #c40021)";

  const outerClass = chromeBand
    ? `hm-son-dakika-ticker hm-son-dakika-ticker--chrome hm-ticker-glass-shell flex h-9 min-h-9 max-h-9 w-full min-w-0 items-stretch overflow-hidden rounded-full border ${
        variantLight ? "hm-ticker-glass-shell--on-dark" : "hm-ticker-glass-shell--on-light"
      }`
    : `hm-son-dakika-ticker flex h-9 min-h-9 max-h-9 flex-1 min-w-0 items-stretch overflow-hidden rounded-md border ${
        variantLight ? "border-white/15 bg-black/30" : "border-slate-200/90 bg-slate-100/95"
      }`;

  const railClass = chromeBand
    ? `hm-ticker-glass-rail relative min-w-0 flex-1 overflow-hidden ${
        variantLight ? "hm-ticker-surface--on-dark-rail" : "hm-ticker-surface--on-light-rail"
      }`
    : `relative min-w-0 flex-1 overflow-hidden ${
        variantLight ? "hm-ticker-surface--on-dark-rail" : "hm-ticker-surface--on-light-rail bg-white"
      }`;

  const railStyle =
    !chromeBand && variantLight ? { background: "var(--hm-ticker-rail, rgba(0,0,0,0.35))" } : undefined;

  return (
    <div className={outerClass} role="region" aria-label="Son dakika haberleri">
      <div
        className="hm-son-dakika-ticker__label flex shrink-0 items-center gap-1 self-stretch px-2 text-[9px] font-black uppercase leading-none tracking-wider text-white sm:px-2.5 sm:text-[10px]"
        style={{ background: accent }}
      >
        <Flame className="h-3 w-3 shrink-0 opacity-95" aria-hidden />
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{shortLabel}</span>
      </div>
      <div className={railClass} style={railStyle}>
        <div className="flex h-full min-h-0 items-center whitespace-nowrap animate-marquee">
          {[...list, ...list].map((n, i) => (
            <Link
              key={`${n.id}-${i}`}
              href={h(n.href || `/haber/${n.slug || n.id}`)}
              className="hm-ticker-marquee-link inline-flex h-full shrink-0 items-center gap-2 px-3 text-[11px] font-semibold leading-snug transition-colors sm:px-4 sm:text-xs"
            >
              <span className="max-w-[min(52vw,14rem)] truncate sm:max-w-xs">{n.title}</span>
              <span aria-hidden className="hm-ticker-marquee-sep shrink-0 select-none">
                |
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
