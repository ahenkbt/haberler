import { useEffect } from "react";

const PBX_MANIFEST = "/pbx/manifest.webmanifest";
const DEFAULT_MANIFEST = "/manifest.json";
const PBX_APP_TITLE = "PBX Agent";

function upsertMeta(name: string, content: string, restore?: string) {
  let meta = document.querySelector(`meta[name="${name}"][data-pbx-pwa]`) as HTMLMetaElement | null;
  if (!meta) {
    const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
    meta = document.createElement("meta");
    meta.name = name;
    meta.setAttribute("data-pbx-pwa", "1");
    if (existing?.content) meta.setAttribute("data-pbx-restore", existing.content);
    else if (restore) meta.setAttribute("data-pbx-restore", restore);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

/** /pbx rotalarında PBX odaklı PWA manifest ve iOS meta etiketleri. */
export function usePbxPwaHead(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    const prevManifest = manifestLink?.href ?? DEFAULT_MANIFEST;
    if (manifestLink) {
      manifestLink.setAttribute("data-pbx-prev-href", prevManifest);
      manifestLink.href = PBX_MANIFEST;
    }

    upsertMeta("apple-mobile-web-app-capable", "yes");
    upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    upsertMeta("apple-mobile-web-app-title", PBX_APP_TITLE, "Yekpare");
    upsertMeta("mobile-web-app-capable", "yes");
    upsertMeta("theme-color", "#1e3a5f", "#0f766e");

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      const restoreHref = link?.getAttribute("data-pbx-prev-href");
      if (link && restoreHref) {
        link.href = restoreHref;
        link.removeAttribute("data-pbx-prev-href");
      }
      document.querySelectorAll("[data-pbx-pwa]").forEach((el) => {
        const restore = el.getAttribute("data-pbx-restore");
        if (el instanceof HTMLMetaElement && restore) el.content = restore;
        el.remove();
      });
    };
  }, [active]);
}
