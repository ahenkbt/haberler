import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CloudSun, TrendingUp } from "lucide-react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { apiRequest } from "@/lib/queryClient";

type Props = {
  primaryColor: string;
  financeBg: string;
  showFinance: boolean;
  showWeather: boolean;
  breakingItems: { id: number; slug?: string; title: string }[];
  /** `chrome`: üst menü altı yapısal şerit (köşesiz, margin yok). */
  variant?: "default" | "chrome";
};

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
  if (direction === "down") return "hm-finance-weather-ticker__change--down";
  if (direction === "up") return "hm-finance-weather-ticker__change--up";
  return "hm-finance-weather-ticker__change--flat";
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
    rows.push({
      key: symbol,
      label,
      value,
      change,
      direction: item.direction,
    });
  }
  return rows.length > 0 ? rows : FALLBACK_RATES;
}

/** Döviz / altın / BIST — `/api/finance` canlı; hava özeti demo. */
export function FinanceWeatherTicker({
  primaryColor,
  financeBg,
  showFinance,
  showWeather,
  breakingItems,
  variant = "default",
}: Props) {
  const h = useHmPublicHref();
  const { data: financeRaw = [] } = useQuery({
    queryKey: ["/api/finance"],
    queryFn: () => apiRequest("/api/finance") as Promise<FinanceApiItem[]>,
    enabled: showFinance,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const rates = useMemo(() => mapFinanceItems(Array.isArray(financeRaw) ? financeRaw : []), [financeRaw]);

  if (!showFinance && !showWeather && breakingItems.length === 0) return null;

  const chrome = variant === "chrome";

  return (
    <div
      className={
        chrome
          ? "hm-finance-weather-ticker hm-finance-weather-ticker--chrome flex flex-col overflow-hidden sm:flex-row sm:items-stretch"
          : "hm-finance-weather-ticker mb-4 flex flex-col overflow-hidden rounded-lg border border-black/20 shadow-sm sm:flex-row sm:items-stretch"
      }
      style={{ background: financeBg }}
    >
      <div
        className="shrink-0 px-3 py-2 sm:py-2.5 font-black text-white text-[10px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5"
        style={{ background: primaryColor }}
      >
        <TrendingUp className="w-3.5 h-3.5" />
        {showFinance || showWeather ? "Piyasa · Hava" : "Özet"}
      </div>
      {showFinance ? (
        <div className="hm-finance-weather-ticker__body flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 px-3 py-2 text-[11px] sm:border-b-0 sm:border-r sm:text-xs">
          {rates.map((r) => (
            <span key={r.key} className="whitespace-nowrap">
              <span className="hm-finance-weather-ticker__label font-semibold">{r.label}</span>{" "}
              <span className="hm-finance-weather-ticker__value font-bold tabular-nums">{r.value}</span>{" "}
              <span className={`font-medium ${changeClass(r.direction)}`}>{r.change}</span>
            </span>
          ))}
        </div>
      ) : null}
      {showWeather ? (
        <div className="hm-finance-weather-ticker__weather flex items-center gap-2 border-b border-white/10 px-3 py-2 text-[11px] sm:border-b-0 sm:border-r sm:text-xs">
          <CloudSun className="hm-finance-weather-ticker__weather-icon h-4 w-4 shrink-0" />
          <span>
            <strong>Ankara</strong> parçalı bulutlu{" "}
            <span className="tabular-nums font-bold">19°C</span>
            <span className="hm-finance-weather-ticker__dot mx-1">·</span>
            <strong>İstanbul</strong>{" "}
            <span className="tabular-nums font-bold">17°C</span>
          </span>
        </div>
      ) : null}
      {breakingItems.length > 0 ? (
        <div className="flex-1 min-w-0 flex items-center overflow-hidden py-1.5 sm:py-0">
          <div className="overflow-hidden relative flex-1">
            <div className="flex whitespace-nowrap animate-marquee">
              {[...breakingItems, ...breakingItems].map((n, i) => (
                <Link
                  key={`${n.id}-${i}`}
                  href={h(`/haber/${n.slug || n.id}`)}
                  className="hm-finance-weather-ticker__breaking-link inline-flex shrink-0 items-center gap-3 px-5 text-[11px] font-semibold leading-none"
                >
                  <span className="max-w-[min(65vw,24rem)] truncate">{n.title}</span>
                  <span className="hm-finance-weather-ticker__sep shrink-0 select-none" aria-hidden>
                    |
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
