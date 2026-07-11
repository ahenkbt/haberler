/**
 * Overpass aynası + yeniden deneme — overpass-api.de sık 504 verir.
 */

const OVERPASS_INTERPRETERS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
] as const;

const RETRYABLE = new Set([429, 502, 503, 504]);

export async function postOverpassInterpreter(
  queryBody: string,
  options?: { timeoutMs?: number; userAgent?: string },
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const ua =
    options?.userAgent ??
    "Yekpare/1.0 (https://yekpare.net; map scrape; contact: site admin)";

  let last: Response | null = null;
  let lastErr: unknown = null;

  for (const base of OVERPASS_INTERPRETERS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fetchRes = await fetch(base, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": ua,
            Accept: "application/json",
          },
          body: queryBody,
          signal: AbortSignal.timeout(timeoutMs),
        });
        last = fetchRes;
        if (fetchRes.ok) return fetchRes;
        if (!RETRYABLE.has(fetchRes.status)) return fetchRes;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  if (last) return last;
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? "Overpass isteği başarısız"));
}
