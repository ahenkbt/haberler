const SESSION_KEY = "yektube-refresh-ts";
/** İstemci tarafı — aynı oturumda sık tekrar istek gönderme */
const CLIENT_MIN_INTERVAL_MS = 20 * 60 * 1000;

/** Yektube açılışında tüm kanallardan arka planda video çekimi tetikler (sunucu da kendi throttle'unu uygular). */
export function triggerYektubeBackgroundRefresh(): void {
  if (typeof window === "undefined") return;
  try {
    const last = Number(sessionStorage.getItem(SESSION_KEY) || 0);
    if (Date.now() - last < CLIENT_MIN_INTERVAL_MS) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    /* sessionStorage yok — yine de dene */
  }
  void fetch("/api/video/refresh", { method: "POST" }).catch(() => undefined);
}
