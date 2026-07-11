import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, TrendingUp } from "lucide-react";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { apiRequest } from "@/lib/queryClient";
import {
  normalizeHmVitrinTheme,
  resolveTickerFinanceEnabled,
  resolveTickerWeatherEnabled,
} from "@/lib/newsSiteLayout";
import { hmVitrinAccentHex } from "@/lib/hmVitrinThemeTokens";
import { HmPublicNewsNavSearch } from "@/components/HmPublicNewsNavSearch";

type FinanceApiItem = {
  symbol: string;
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
};

type RateRow = {
  key: string;
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
};

const FINANCE_ROW_ORDER = ["USD", "EUR", "GA", "BIST"] as const;

const FINANCE_ROW_LABELS: Record<(typeof FINANCE_ROW_ORDER)[number], string> = {
  USD: "USD/TRY",
  EUR: "EUR/TRY",
  GA: "Gram Altın",
  BIST: "BIST 100",
};

const FALLBACK_RATES: RateRow[] = [
  { key: "USD", label: "USD/TRY", value: "34,12", change: "+0,08", direction: "up" },
  { key: "EUR", label: "EUR/TRY", value: "36,88", change: "-0,02", direction: "down" },
  { key: "GA", label: "Gram Altın", value: "3.245 ₺", change: "+12", direction: "up" },
  { key: "BIST", label: "BIST 100", value: "9.412", change: "+0,4%", direction: "up" },
];

function changeClass(direction: RateRow["direction"]): string {
  if (direction === "down") return "text-rose-400";
  if (direction === "up") return "text-emerald-400";
  return "opacity-70";
}

function mapFinanceItems(items: FinanceApiItem[]): RateRow[] {
  const bySymbol = new Map(items.map((item) => [item.symbol, item]));
  const rows: RateRow[] = [];
  for (const symbol of FINANCE_ROW_ORDER) {
    const item = bySymbol.get(symbol);
    if (!item) continue;
    const label = FINANCE_ROW_LABELS[symbol];
    const value = symbol === "GA" ? `${item.value} ₺` : item.value;
    const change = symbol === "BIST" && item.change !== "-" && !item.change.includes("%") ? `${item.change}%` : item.change;
    rows.push({ key: symbol, label, value, change, direction: item.direction });
  }
  return rows.length > 0 ? rows : FALLBACK_RATES;
}

type Props = {
  variantLight: boolean;
  /** Yalnızca döviz, yalnızca hava veya ikisi (varsayılan). */
  mode?: "both" | "finance" | "weather";
  /** Logo sağı arama kutusunu gizle (editör slot modu). */
  hideSearch?: boolean;
  /** Sidebar kutusu: dikey düzen, sabit yükseklik yok. */
  layout?: "inline" | "sidebar";
};

/** Logo satırında kompakt döviz / hava özeti (eski son dakika alanı). */
export function HmHeaderFinanceWeatherStrip({
  variantLight,
  mode = "both",
  hideSearch = false,
  layout = "inline",
}: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const layoutPrefs = ctx?.layoutPrefs ?? null;
  const isSumbulTheme = normalizeHmVitrinTheme(layoutPrefs?.hmVitrinTheme) === "sumbul";
  const financeAllowed = isSumbulTheme ? layoutPrefs?.tickerFinance !== false : resolveTickerFinanceEnabled(layoutPrefs);
  const weatherAllowed = isSumbulTheme ? layoutPrefs?.tickerWeather !== false : resolveTickerWeatherEnabled(layoutPrefs);
  const showFinance = financeAllowed && (mode === "both" || mode === "finance");
  const showWeather = weatherAllowed && (mode === "both" || mode === "weather");
  if (!showFinance && !showWeather) return null;

  const primaryHex = (layoutPrefs?.hmPrimaryColor ?? "").trim();
  const accent =
    (primaryHex.length >= 3 ? primaryHex : "") ||
    hmVitrinAccentHex(layoutPrefs?.hmVitrinTheme ?? "default") ||
    "#c40021";

  const { data: financeRaw = [] } = useQuery({
    queryKey: ["/api/finance"],
    queryFn: () => apiRequest("/api/finance") as Promise<FinanceApiItem[]>,
    enabled: showFinance,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const rates = useMemo(() => mapFinanceItems(Array.isArray(financeRaw) ? financeRaw : []), [financeRaw]);
  const navOnLight = !variantLight;
  const pillIdleBg = navOnLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.12)";
  const pillText = navOnLight ? "#334155" : "rgba(255,255,255,0.92)";

  const sidebarLayout = layout === "sidebar";

  return (
    <div
      className={`hm-header-finance-strip hm-ticker-glass-shell flex min-w-0 items-stretch overflow-hidden border ${
        sidebarLayout
          ? "hm-header-finance-strip--sidebar h-auto w-full flex-col rounded-xl"
          : "h-9 min-h-9 max-h-9 flex-1 rounded-full"
      } ${variantLight ? "hm-ticker-glass-shell--on-dark" : "hm-ticker-glass-shell--on-light"}`}
      role="region"
      aria-label="Piyasa ve hava özeti"
    >
      <div
        className={`flex shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white sm:text-[10px] ${
          sidebarLayout
            ? "w-full justify-center rounded-t-xl px-3 py-1.5"
            : "self-stretch px-2 py-1 sm:px-2.5"
        }`}
        style={{ background: accent }}
      >
        <TrendingUp className="h-3 w-3 shrink-0 opacity-95" aria-hidden />
        {mode === "weather" ? (
          <>
            <CloudSun className="h-3 w-3 shrink-0 opacity-95 sm:hidden" aria-hidden />
            <span>Hava</span>
          </>
        ) : mode === "finance" ? (
          <>
            <span className="hidden sm:inline">Piyasa</span>
            <span className="sm:hidden">Piyasa</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Piyasa · Hava</span>
            <span className="sm:hidden">Piyasa</span>
          </>
        )}
      </div>
      <div
        className={`hm-header-finance-strip__body hm-ticker-glass-rail flex min-h-0 min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-[9px] leading-snug sm:gap-x-3 sm:text-[10px] ${
          sidebarLayout ? "w-full px-3 py-2" : "h-full overflow-hidden px-2 py-0 sm:px-3"
        } ${variantLight ? "hm-ticker-surface--on-dark-rail" : "hm-ticker-surface--on-light-rail text-slate-700"}`}
      >
        {showFinance
          ? rates.map((r) => (
              <span key={r.key} className="hm-header-finance-strip__rate">
                <span className="hm-header-finance-strip__label font-semibold">{r.label}</span>{" "}
                <span className="hm-header-finance-strip__value font-bold tabular-nums">{r.value}</span>{" "}
                <span className={`font-medium ${changeClass(r.direction)}`}>{r.change}</span>
              </span>
            ))
          : null}
        {showWeather ? (
          <span className="hm-header-finance-strip__weather flex items-center gap-1">
            {showFinance ? <span className="hm-header-finance-strip__sep">|</span> : null}
            <CloudSun className="h-3 w-3 shrink-0 opacity-80 sm:h-3.5 sm:w-3.5" aria-hidden />
            <span>
              <strong>Ankara</strong> 19°C
              <span className="hm-header-finance-strip__sep mx-1">·</span>
              <strong>İstanbul</strong> 17°C
            </span>
          </span>
        ) : null}
      </div>
      {!isSumbulTheme && !hideSearch ? (
        <HmPublicNewsNavSearch
          navOnLight={navOnLight}
          pillIdleBg={pillIdleBg}
          pillText={pillText}
          inputId="hm-piyasa-hava-search-input"
          className="hm-header-finance-strip__search"
        />
      ) : null}
    </div>
  );
}
