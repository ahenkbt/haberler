import { sanitizeApiDisplayJson } from "./sanitizeApiDisplayJson";

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function retryDelayMs(attempt: number): number {
  const base = Math.min(800 * 2 ** attempt, 8_000);
  return base + Math.floor(Math.random() * 250);
}

export type FetchPublicJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  retried: boolean;
  timedOut?: boolean;
};

function mergeAbortSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.aborted) return a;
  if (b.aborted) return b;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

/**
 * Kamuya açık vitrin GET istekleri — 429/5xx için üstel geri çekilme ile yeniden dener.
 */
/** Varsayılan istek zaman aşımı — hiçbir GET sonsuza kadar asılı kalmasın (soğuk API). */
export const PUBLIC_JSON_DEFAULT_TIMEOUT_MS = 12_000;

export async function fetchPublicJson<T = unknown>(
  url: string,
  options?: {
    retries?: number;
    cache?: RequestCache;
    signal?: AbortSignal;
    /** İstek bu süreyi aşarsa iptal edilir (ms). */
    timeoutMs?: number;
  },
): Promise<FetchPublicJsonResult<T>> {
  const maxRetries = options?.retries ?? 1;
  const effectiveTimeoutMs = options?.timeoutMs ?? PUBLIC_JSON_DEFAULT_TIMEOUT_MS;
  let attempt = 0;
  let retried = false;

  while (true) {
    const timeoutController = effectiveTimeoutMs ? new AbortController() : null;
    const timeoutId =
      timeoutController && effectiveTimeoutMs
        ? setTimeout(() => timeoutController.abort(), effectiveTimeoutMs)
        : undefined;
    const signal = mergeAbortSignals(options?.signal, timeoutController?.signal);
    let timedOut = false;

    try {
      const res = await fetch(url, {
        cache: options?.cache ?? "no-store",
        signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (RETRYABLE_STATUS.has(res.status) && attempt < maxRetries) {
        retried = true;
        await new Promise((r) => setTimeout(r, retryDelayMs(attempt)));
        attempt += 1;
        continue;
      }
      const data = sanitizeApiDisplayJson((await res.json().catch(() => null)) as T | null);
      return { ok: res.ok, status: res.status, data, retried, timedOut };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      timedOut = timeoutController?.signal.aborted === true && options?.signal?.aborted !== true;
      if (options?.signal?.aborted) {
        return { ok: false, status: 0, data: null, retried, timedOut };
      }
      if (timedOut) {
        return { ok: false, status: 0, data: null, retried, timedOut: true };
      }
      if (attempt < maxRetries) {
        retried = true;
        await new Promise((r) => setTimeout(r, retryDelayMs(attempt)));
        attempt += 1;
        continue;
      }
      return { ok: false, status: 0, data: null, retried, timedOut };
    }
  }
}
