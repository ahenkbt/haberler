/**
 * Yektube hızlı deploy / bakım — tarayıcı konsoluna yapıştırın.
 * Önkoşul: /yp/admin oturumu açık (admin girişi yapılmış).
 *
 * Chrome DevTools → Console → yapıştır → Enter
 */
(async function yektubeHizliDeploy() {
  const api = (path, init = {}) =>
    fetch(`/api${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      ...init,
    }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.message || `HTTP ${r.status}`);
      return j;
    });

  const log = (label, data) => console.log(`%c[Yektube] ${label}`, "color:#2563eb;font-weight:bold", data);

  try {
    log("1/5 SEO durumu", await api("/video/seo-meta/status"));
    log("2/5 Toplu senkron + Gemini", await api("/video/sync-all", { method: "POST", body: JSON.stringify({ geminiClassify: true }) }));
    log("3/5 Shorts", await api("/video/sync-shorts", { method: "POST", body: "{}" }));
    const origin = location.origin.replace(/\/+$/, "");
    const sitemapUrls = [`${origin}/sitemap.xml`, `${origin}/yektube-videos-1.xml`];
    const ping = async (base, url) => {
      try {
        const r = await fetch(`${base}?sitemap=${encodeURIComponent(url)}`, { mode: "no-cors" });
        return r.type === "opaque" ? "sent" : r.status;
      } catch {
        return "skip";
      }
    };
    log("4/5 Sitemap", {
      static: await fetch("/api/sitemap/yektube-static.xml").then((r) => r.status),
      videos1: await fetch("/api/sitemap/yektube-videos-1.xml").then((r) => r.status),
      google: await ping("https://www.google.com/ping", sitemapUrls[0]),
      yandex: await ping("https://webmaster.yandex.com/ping", sitemapUrls[1]),
    });
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      log("5/5 Service Worker", `${regs.length} kayıt silindi — sayfayı Ctrl+F5 yenileyin`);
    } else {
      log("5/5", "SW yok — Ctrl+F5 yeterli");
    }
    console.log("%c✓ Yektube hızlı deploy tamam", "color:#16a34a;font-size:14px;font-weight:bold");
  } catch (e) {
    console.error("[Yektube] Hata:", e);
  }
})();
