import { logger } from "./logger";

export type FinanceItem = {
  symbol: string;
  label: string;
  value: string;
  change: string;
  direction: "up" | "down" | "flat";
};

type CacheEntry = {
  items: FinanceItem[];
  fetchedAt: number;
  prevRates: Record<string, number>;
};

let cache: CacheEntry | null = null;
const TTL_MS = 60_000;

function fmt(n: number, decimals = 2): string {
  return n
    .toFixed(decimals)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmtChange(
  cur: number,
  prev: number | undefined,
  decimals = 2,
): { change: string; direction: "up" | "down" | "flat" } {
  if (prev == null || !Number.isFinite(prev) || prev === 0) return { change: "-", direction: "flat" };
  const diff = cur - prev;
  if (Math.abs(diff) < 0.005 && decimals >= 2) return { change: "0,00", direction: "flat" };
  if (Math.abs(diff) < 1 && decimals === 0) return { change: "0", direction: "flat" };
  const sign = diff > 0 ? "+" : "-";
  return {
    change: `${sign}${fmt(Math.abs(diff), decimals)}`,
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
  };
}

export async function fetchWithTimeout(
  url: string,
  timeoutMs = 6000,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Yekpare/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export type YahooQuote = { price: number; prev: number };

/**
 * Yahoo Finance chart API (anahtarsız) — son fiyat ve önceki kapanış. Başarısızsa null (değer UYDURULMAZ).
 * XU100.IS = BIST 100, BZ=F = Brent ham petrol vadeli.
 */
export async function fetchYahooQuote(symbol: string, fetchJson: typeof fetchWithTimeout = fetchWithTimeout): Promise<YahooQuote | null> {
  try {
    const j = (await fetchJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
    )) as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } };
    const m = j?.chart?.result?.[0]?.meta;
    const price = Number(m?.regularMarketPrice);
    if (!(price > 0)) return null;
    const pct = Number(m?.regularMarketChangePercent);
    const chartPrev = Number(m?.chartPreviousClose);
    const prev = Number.isFinite(pct) && pct > -100 ? price / (1 + pct / 100) : chartPrev > 0 ? chartPrev : NaN;
    return { price, prev: prev > 0 ? prev : NaN };
  } catch (e) {
    logger.warn({ err: e, symbol }, "finance: yahoo quote failed");
    return null;
  }
}

export async function getLiveFinance(): Promise<FinanceItem[]> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.items;
  }

  const prevRates = cache?.prevRates ?? {};
  const nowRates: Record<string, number> = { ...prevRates };
  const realPrev: Record<string, number> = {};

  // --- Fetch USD/EUR/GBP → TRY ---
  try {
    const fx = (await fetchWithTimeout(
      "https://open.er-api.com/v6/latest/USD",
    )) as { rates?: Record<string, number> };
    if (fx?.rates) {
      const tryRate = fx.rates["TRY"] ?? 0;
      const eurRate = fx.rates["EUR"] ?? 0;
      const gbpRate = fx.rates["GBP"] ?? 0;
      if (tryRate > 0) {
        nowRates["USD"] = tryRate;
        if (eurRate > 0) nowRates["EUR"] = tryRate / eurRate;
        if (gbpRate > 0) nowRates["GBP"] = tryRate / gbpRate;
      }
    }
  } catch (e) {
    logger.warn({ err: e }, "finance: fx fetch failed — using cache");
  }

  // --- Fetch BTC + PAXG (gold) via CoinGecko → TRY ---
  try {
    const cg = (await fetchWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold&vs_currencies=try",
    )) as Record<string, { try?: number }>;
    const btcTry = cg?.["bitcoin"]?.["try"] ?? 0;
    const paxgTry = cg?.["pax-gold"]?.["try"] ?? 0; // 1 troy oz in TRY
    if (btcTry > 0) nowRates["BTC"] = btcTry;
    if (paxgTry > 0) {
      // 1 troy oz = 31.1035 g
      const gramGold = paxgTry / 31.1035;
      nowRates["GA"] = gramGold;
      // Turkish Çeyrek Altın (quarter gold coin) ≈ 1.75575 g of 22k equivalent
      nowRates["CA"] = gramGold * 1.75575;
    }
  } catch (e) {
    logger.warn({ err: e }, "finance: coingecko fetch failed — using cache");
  }

  // --- BIST 100 & Brent: gerçek veri (Yahoo Finance chart API, anahtarsız). Uydurma/rastgele değer YOK. ---
  const [bist, brent] = await Promise.all([fetchYahooQuote("XU100.IS"), fetchYahooQuote("BZ=F")]);
  if (bist) {
    nowRates["BIST"] = bist.price;
    realPrev["BIST"] = bist.prev;
  }
  if (brent) {
    nowRates["BRL"] = brent.price;
    realPrev["BRL"] = brent.prev;
  }

  // Yalnızca gerçek veriyle gelen kalemler yayımlanır; veri yoksa kalem atlanır (varsayılan/uydurma değer yok).
  const spec: Array<[string, string, string, number, boolean]> = [
    // [symbol, label, key, decimals, prevIsReal]
    ["USD", "Dolar", "USD", 2, false],
    ["EUR", "Euro", "EUR", 2, false],
    ["GBP", "Sterlin", "GBP", 2, false],
    ["GA", "Gram Altın", "GA", 0, false],
    ["CA", "Çeyrek Altın", "CA", 0, false],
    ["BIST", "BIST 100", "BIST", 0, true],
    ["BTC", "Bitcoin", "BTC", 0, false],
    ["BRL", "Brent", "BRL", 2, true],
  ];
  const items: FinanceItem[] = [];
  for (const [symbol, label, key, dec, realPrevious] of spec) {
    const cur = nowRates[key];
    if (!(cur > 0)) continue;
    const prev = realPrevious ? realPrev[key] : prevRates[key];
    items.push({ symbol, label, value: fmt(cur, dec), ...fmtChange(cur, prev, dec) });
  }

  cache = { items, fetchedAt: Date.now(), prevRates: nowRates };
  logger.info({ usd: nowRates["USD"], btc: nowRates["BTC"], bist: nowRates["BIST"], brent: nowRates["BRL"] }, "finance: cache refreshed");
  return items;
}
