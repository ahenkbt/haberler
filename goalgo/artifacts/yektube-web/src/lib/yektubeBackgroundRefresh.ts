const SESSION_KEY = "yektube-refresh-ts";
/** Aynı tarayıcı oturumunda sık tekrar istek gönderme (sunucu ayrıca 15 dk throttle uygular). */
const CLIENT_MIN_INTERVAL_MS = 20 * 60 * 1000;

/** /yp açılışında tüm aktif kanallardan yeni videoları arka planda çek. */
export function triggerYektubeBackgroundRefresh(): void {
  if (typeof window === "undefined") return;
  try {
    const last = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    if (Date.now() - last < CLIENT_MIN_INTERVAL_MS) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    /* sessionStorage yok */
  }
  void fetch("/api/video/refresh", { method: "POST" }).catch(() => undefined);
}
