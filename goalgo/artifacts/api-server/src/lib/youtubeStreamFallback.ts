import type { Request, Response } from "express";
import { logger } from "./logger";

/**
 * Render gibi bazı barındırıcıların IP blokları YouTube tarafından engellenir;
 * akış/meta çözümlemesi orada sistematik olarak 404/502 döner. Çözümleme
 * başarısız olduğunda istek, çalışan eski (Railway) API köküne vekillenir.
 *
 * Kapatmak için: YT_STREAM_FALLBACK_ORIGIN=0
 */
const DEFAULT_FALLBACK_ORIGIN = "https://goalgo-production.up.railway.app";
const FALLBACK_HEADER = "x-yekpare-stream-fallback";

export function youtubeStreamFallbackOrigin(): string | null {
  const raw = process.env.YT_STREAM_FALLBACK_ORIGIN ?? process.env.LEGACY_MEDIA_ORIGIN;
  if (raw != null) {
    const t = raw.trim();
    if (!t || t === "0" || t === "false" || t === "off") return null;
    return t.replace(/\/+$/, "");
  }
  return DEFAULT_FALLBACK_ORIGIN;
}

/** Vekillenmiş isteği tekrar vekillemeyi (sonsuz döngüyü) önler. */
export function isYoutubeFallbackRequest(req: Request): boolean {
  return String(req.headers[FALLBACK_HEADER] ?? "") === "1";
}

/**
 * Devre kesici: yerel YouTube çözümlemesi art arda başarısız olursa (Render IP engeli)
 * çözümlemeyi hiç denemeden doğrudan fallback'e geç — 20-25sn'lik beklemeler yerine ~1sn.
 */
let resolveConsecutiveFailures = 0;
let resolveCircuitOpenUntil = 0;
const RESOLVE_FAILURE_THRESHOLD = 3;
const RESOLVE_CIRCUIT_OPEN_MS = 5 * 60_000;

export function shouldSkipLocalYoutubeResolve(): boolean {
  return Date.now() < resolveCircuitOpenUntil;
}

/**
 * Yerel çözümleme zinciri (Innertube → Invidious → Piped) engelli ağlarda 20sn+
 * sürebiliyor; fallback varken bu kadar bekletmek yerine bütçe aşımında hemen
 * fallback'e geç. Arka planda süren çözümleme cache'i doldurmaya devam eder.
 */
export function localResolveBudgetMs(): number | null {
  const raw = process.env.YT_RESOLVE_BUDGET_MS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
    if (n === 0) return null;
  }
  return youtubeStreamFallbackOrigin() ? 8_000 : null;
}

export async function withLocalResolveBudget<T>(work: Promise<T>): Promise<T | "budget-exceeded"> {
  const budget = localResolveBudgetMs();
  if (!budget) return work;
  return await Promise.race([
    work.catch((err) => {
      throw err;
    }),
    new Promise<"budget-exceeded">((resolve) => {
      setTimeout(() => resolve("budget-exceeded"), budget);
    }),
  ]);
}

export function noteYoutubeResolveSuccess(): void {
  resolveConsecutiveFailures = 0;
}

export function noteYoutubeResolveFailure(): void {
  resolveConsecutiveFailures += 1;
  if (resolveConsecutiveFailures >= RESOLVE_FAILURE_THRESHOLD) {
    resolveCircuitOpenUntil = Date.now() + RESOLVE_CIRCUIT_OPEN_MS;
    resolveConsecutiveFailures = 0;
    logger.warn(
      { openForMs: RESOLVE_CIRCUIT_OPEN_MS },
      "[video] YouTube çözümleme devre kesici açıldı — istekler doğrudan fallback'e vekillenecek",
    );
  }
}

function fallbackTargetFor(req: Request): string | null {
  if (isYoutubeFallbackRequest(req)) return null;
  const origin = youtubeStreamFallbackOrigin();
  if (!origin) return null;
  let originHost = "";
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
  const selfHost = String(req.hostname ?? "").toLowerCase();
  if (originHost && selfHost && originHost === selfHost) return null;
  return `${origin}${req.originalUrl}`;
}

/**
 * İsteği fallback API köküne vekiller (Range dahil). Yanıt yazıldıysa true döner;
 * fallback yoksa/başarısızsa false döner ve çağıran kendi hatasını yazar.
 */
export async function proxyYoutubeRequestToFallback(
  req: Request,
  res: Response,
  opts: { timeoutMs?: number } = {},
): Promise<boolean> {
  const target = fallbackTargetFor(req);
  if (!target) return false;

  try {
    const headers: Record<string, string> = { [FALLBACK_HEADER]: "1" };
    const range = req.headers.range;
    if (typeof range === "string" && range) headers.Range = range;

    const upstream = await fetch(target, {
      headers,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    if (!upstream.ok && upstream.status !== 206) {
      return false;
    }

    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.status(upstream.status);

    if (!upstream.body) {
      res.end();
      return true;
    }
    const { Readable } = await import("node:stream");
    const readable = Readable.fromWeb(upstream.body as import("stream/web").ReadableStream);
    readable.on("error", () => {
      if (!res.headersSent) res.status(502).end();
      else res.end();
    });
    res.on("close", () => {
      if (!readable.destroyed) readable.destroy();
    });
    readable.pipe(res);
    return true;
  } catch (err) {
    logger.warn({ err, target }, "[video] youtube fallback proxy failed");
    return false;
  }
}
