import { isYektubeDedicatedHost } from "@workspace/yektube-core";

/** yektube.com /yp altında SW scope uyumsuzluğu mobil/Edge'de boş sayfa yapabiliyor — temizle */
async function clearStaleYektubeServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    /* ignore */
  }
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.includes("yektube")).map((k) => caches.delete(k)));
  } catch {
    /* ignore */
  }
}

function yektubePwaScope(): string | null {
  const path = window.location.pathname;
  if (path === "/yp" || path.startsWith("/yp/")) return "/yp/";
  const base = (import.meta.env.BASE_URL ?? "/yektube-v2/").replace(/\/?$/, "/");
  const prefix = base.replace(/\/$/, "");
  if (path === prefix || path.startsWith(`${prefix}/`)) return base;
  return null;
}

function yektubeServiceWorkerUrl(scope: string): string {
  if (scope === "/yp/") return "/yp/sw.js";
  return `${scope}sw.js`;
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  if (isYektubeDedicatedHost(host)) {
    void clearStaleYektubeServiceWorkers();
    return;
  }

  window.addEventListener("load", () => {
    const scope = yektubePwaScope();
    if (!scope) {
      void clearStaleYektubeServiceWorkers();
      return;
    }

    void navigator.serviceWorker
      .register(yektubeServiceWorkerUrl(scope), { scope })
      .catch(() => {
        /* dev / unsupported */
      });
  });
}
