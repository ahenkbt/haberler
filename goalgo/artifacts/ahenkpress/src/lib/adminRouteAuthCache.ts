const VERIFY_CACHE_MS = 30_000;
let cachedVerification: { at: number; result: "ok" | "denied" } | null = null;

export function getCachedAdminRouteVerification(now = Date.now()): { at: number; result: "ok" | "denied" } | null {
  if (!cachedVerification || now - cachedVerification.at >= VERIFY_CACHE_MS) return null;
  return cachedVerification;
}

export function setCachedAdminRouteVerification(result: "ok" | "denied", at = Date.now()): void {
  cachedVerification = { at, result };
}

export function invalidateAdminRouteVerificationCache(): void {
  cachedVerification = null;
}
