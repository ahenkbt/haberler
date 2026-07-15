/**
 * GSC / Bing / Yandex HTML etiketi doğrulaması — hem kök hem goalgo middleware tarafından kullanılır.
 * @param {{ railwayApiOrigin: (url: string) => string, rootSitemapApiPath: (pathname: string) => string | null, isSitemapApiProxyPath: (pathname: string) => boolean }} deps
 */
export function createMiddlewareSeoVerification(deps) {
  const { railwayApiOrigin, rootSitemapApiPath, isSitemapApiProxyPath } = deps;

  function parsePortalExtraHosts() {
    return String(process.env.PORTAL_EXTRA_HOSTS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase().replace(/^www\./, ""))
      .filter(Boolean);
  }

  function isPortalHost(host) {
    const h = String(host || "")
      .toLowerCase()
      .replace(/^www\./, "")
      .split(":")[0];
    return (
      !h ||
      h === "yekpare.net" ||
      h === "turknet.app" ||
      h === "goalgo.org" ||
      h === "turkiye.li" ||
      h === "getirsepeti.com.tr" ||
      h === "ahenk.net.tr" ||
      h === "haberler.ahenkbt.workers.dev" ||
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.indexOf(".vercel.app") !== -1 ||
      h.indexOf(".workers.dev") !== -1 ||
      parsePortalExtraHosts().includes(h)
    );
  }

  function isVerificationBot(uaRaw) {
    const ua = String(uaRaw || "").toLowerCase();
    return (
      ua.includes("google-site-verification") ||
      ua.includes("googlebot") ||
      ua.includes("google-inspectiontool") ||
      ua.includes("bingbot") ||
      ua.includes("yandex") ||
      ua.includes("duckduckbot") ||
      ua.includes("baiduspider")
    );
  }

  function isStaticShellExcluded(pathname) {
    return (
      pathname.startsWith("/api") ||
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/_next/") ||
      /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webp|woff2?|xml)$/i.test(pathname)
    );
  }

  function isSitemapFeedPath(pathname) {
    const p = String(pathname || "").replace(/\/+$/, "") || "/";
    if (p === "/robots.txt" || p === "/sitemap-static.xml") return true;
    if (rootSitemapApiPath(p)) return true;
    if (isSitemapApiProxyPath(p)) return true;
    if (/^\/api\/rss\/.+\.xml$/i.test(p)) return true;
    if (/^\/rss\/.+\.xml$/i.test(p)) return true;
    return false;
  }

  function htmlEscape(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildVerificationMetaTags(seoVerification) {
    const v = seoVerification && typeof seoVerification === "object" ? seoVerification : null;
    if (!v) return "";
    const google = typeof v.googleSiteVerification === "string" ? v.googleSiteVerification.trim() : "";
    const bing = typeof v.bingSiteVerification === "string" ? v.bingSiteVerification.trim() : "";
    const yandex = typeof v.yandexVerification === "string" ? v.yandexVerification.trim() : "";
    const custom = Array.isArray(v.customMetaTags) ? v.customMetaTags : [];
    let metaTags = "";
    if (google) metaTags += `<meta name="google-site-verification" content="${htmlEscape(google)}" />\n    `;
    if (bing) metaTags += `<meta name="msvalidate.01" content="${htmlEscape(bing)}" />\n    `;
    if (yandex) metaTags += `<meta name="yandex-verification" content="${htmlEscape(yandex)}" />\n    `;
    for (const t of custom) {
      if (!t || typeof t !== "object") continue;
      const name = typeof t.name === "string" ? t.name.trim() : "";
      const content = typeof t.content === "string" ? t.content.trim() : "";
      if (!name || !content) continue;
      if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(name)) continue;
      metaTags += `<meta name="${htmlEscape(name)}" content="${htmlEscape(content)}" />\n    `;
    }
    return metaTags.trim();
  }

  function hasSeoVerification(seoVerification) {
    return Boolean(buildVerificationMetaTags(seoVerification));
  }

  function extractHmSlugFromPath(pathname) {
    const p = String(pathname || "").replace(/\/+$/, "") || "/";
    const tr = p.match(/^\/tr\/([^/?#]+)/i);
    if (tr) return decodeURIComponent(tr[1]);
    const hm = p.match(/^\/hm\/([^/?#]+)/i);
    if (hm) return decodeURIComponent(hm[1]);
    return null;
  }

  function isHmSlugPath(pathname) {
    return Boolean(extractHmSlugFromPath(pathname));
  }

  function isHmPublicShellPath(pathname, host) {
    if (isStaticShellExcluded(pathname)) return false;
    const p = String(pathname || "").replace(/\/+$/, "") || "/";
    if (p.startsWith("/admin") || p.startsWith("/editor") || p.startsWith("/uye") || p.startsWith("/api")) return false;
    if (isHmSlugPath(pathname)) return true;
    return p === "/";
  }

  function stripVerificationMetaFromHtml(html) {
    let out = String(html || "");
    out = out.replace(/<meta\s+[^>]*data-yekpare-verification=["']portal["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*name=["']google-site-verification["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*name=["']msvalidate\.01["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*name=["']yandex-verification["'][^>]*>\s*/gi, "");
    out = out.replace(/<meta\s+[^>]*data-hm-verification=["']1["'][^>]*>\s*/gi, "");
    return out;
  }

  function applyVerificationToIndexHtml(html, seoVerification) {
    let out = stripVerificationMetaFromHtml(html);
    const metaTags = buildVerificationMetaTags(seoVerification);
    if (!metaTags || !/<head[^>]*>/i.test(out)) return out;
    return out.replace(/<head([^>]*)>/i, (m) => `${m}\n    ${metaTags}`);
  }

  function buildVerificationHtml(meta, requestUrl) {
    const v = meta && typeof meta === "object" ? meta.seoVerification : null;
    const metaTags = buildVerificationMetaTags(v);
    const title = (meta && typeof meta.displayName === "string" ? meta.displayName : "") || "Haber";
    const url = new URL(requestUrl);
    return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    ${metaTags}
    <title>${htmlEscape(title)}</title>
    <link rel="canonical" href="${htmlEscape(url.origin + url.pathname)}" />
  </head>
  <body>
    <noscript>${htmlEscape(title)}</noscript>
  </body>
</html>`;
  }

  function serveGoogleVerificationHtmlFile(pathname) {
    const m = /^\/(google[a-z0-9]+\.html)$/i.exec(String(pathname || "").replace(/\/+$/, "") || "/");
    if (!m) return null;
    const filename = m[1];
    return new Response(`google-site-verification: ${filename}`, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    });
  }

  async function fetchHmMetaForHost(apiOrigin, host, pathname) {
    const hmSlug = extractHmSlugFromPath(pathname);
    const url = hmSlug
      ? `${apiOrigin}/api/hm/meta/by-slug/${encodeURIComponent(hmSlug)}`
      : `${apiOrigin}/api/hm/meta/by-domain?domain=${encodeURIComponent(host)}`;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" }, redirect: "manual" });
      if (!res.ok) return null;
      const meta = await res.json().catch(() => null);
      if (!meta || typeof meta !== "object") return null;
      return meta.data && typeof meta.data === "object" ? meta.data : meta;
    } catch {
      return null;
    }
  }

  async function fetchSeoVerificationForHost(apiOrigin, host, pathname) {
    const hmMeta = await fetchHmMetaForHost(apiOrigin, host, pathname);
    if (hmMeta?.seoVerification && hasSeoVerification(hmMeta.seoVerification)) {
      return { seoVerification: hmMeta.seoVerification, displayName: hmMeta.displayName || "Haber" };
    }

    const hmSlugPath = isHmSlugPath(pathname);
    const hmBound = Boolean(hmMeta?.slug);
    if (hmSlugPath || hmBound) return null;

    try {
      const portalRes = await fetch(`${apiOrigin}/api/public/portal-seo`, {
        headers: { accept: "application/json", "x-forwarded-host": host },
        redirect: "manual",
      });
      if (portalRes.ok) {
        const portal = await portalRes.json().catch(() => null);
        if (portal?.seoVerification && hasSeoVerification(portal.seoVerification)) {
          return {
            seoVerification: portal.seoVerification,
            displayName: portal.siteName || "Yekpare",
          };
        }
      }
    } catch {
      /* fall through */
    }
    return null;
  }

  async function injectVerificationIntoSpaIndex(request, incoming) {
    if (request.headers.get("x-verification-inject-skip")) return null;
    if (request.method !== "GET" && request.method !== "HEAD") return null;
    if (!isHmPublicShellPath(incoming.pathname, incoming.hostname || "")) return null;

    const host = (incoming.hostname || "").toLowerCase();
    if (isPortalHost(host) && !isVerificationBot(request.headers.get("user-agent"))) {
      return null;
    }
    const apiOrigin = railwayApiOrigin(request.url);
    const resolved = await fetchSeoVerificationForHost(apiOrigin, host, incoming.pathname);
    const seoVerification = resolved?.seoVerification ?? null;
    const hmSlugPath = isHmSlugPath(incoming.pathname);
    const hmBound = Boolean((await fetchHmMetaForHost(apiOrigin, host, incoming.pathname))?.slug);
    const hmCustomDomain = hmBound;
    if (!seoVerification && !hmSlugPath && !hmCustomDomain) return null;

    if (seoVerification && isVerificationBot(request.headers.get("user-agent"))) {
      const html = buildVerificationHtml(
        { displayName: resolved?.displayName || "Site", seoVerification },
        request.url,
      );
      return new Response(request.method === "HEAD" ? null : html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }

    try {
      const indexUrl = new URL("/index.html", incoming.origin);
      const indexRes = await fetch(indexUrl.toString(), {
        headers: {
          accept: "text/html",
          "x-verification-inject-skip": "1",
          "x-middleware-subrequest": "1",
        },
        redirect: "manual",
      });
      if (!indexRes.ok) {
        if (!seoVerification) return null;
        const metaTags = buildVerificationMetaTags(seoVerification);
        const fallback = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/>${metaTags}</head><body></body></html>`;
        return new Response(request.method === "HEAD" ? null : fallback, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store, max-age=0, must-revalidate",
            "x-yekpare-frontend": "ahenkpress-vercel",
          },
        });
      }
      const html = applyVerificationToIndexHtml(await indexRes.text(), seoVerification);
      return new Response(request.method === "HEAD" ? null : html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store, max-age=0, must-revalidate",
          "x-yekpare-frontend": "ahenkpress-vercel",
        },
      });
    } catch {
      if (!seoVerification) return null;
      const html = buildVerificationHtml(
        { displayName: resolved?.displayName || "Site", seoVerification },
        request.url,
      );
      return new Response(request.method === "HEAD" ? null : html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
  }

  async function serveVerificationBotHtml(request, incoming, host, pathname) {
    if (pathname.startsWith("/api") || isSitemapFeedPath(pathname)) return null;
    if (!isVerificationBot(request.headers.get("user-agent"))) return null;
    if (request.method !== "GET" && request.method !== "HEAD") return null;

    try {
      const apiOrigin = railwayApiOrigin(request.url);
      const p = (pathname || "").replace(/\/+$/, "") || "/";
      const hmSlugPath = isHmSlugPath(p);
      const hmMeta = await fetchHmMetaForHost(apiOrigin, host, p);
      if (hmMeta?.seoVerification && hasSeoVerification(hmMeta.seoVerification)) {
        const html = buildVerificationHtml(hmMeta, request.url);
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      }
      if (hmSlugPath || hmMeta?.slug) return null;
      const portalRes = await fetch(`${apiOrigin}/api/public/portal-seo`, {
        headers: { accept: "application/json", "x-forwarded-host": host },
        redirect: "manual",
      });
      if (portalRes.ok) {
        const portal = await portalRes.json().catch(() => null);
        if (portal?.seoVerification?.googleSiteVerification) {
          const html = buildVerificationHtml(
            { displayName: portal.siteName || "Yekpare", seoVerification: portal.seoVerification },
            request.url,
          );
          return new Response(html, {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          });
        }
      }
    } catch {
      /* fall through */
    }
    return null;
  }

  return {
    isVerificationBot,
    isSitemapFeedPath,
    serveGoogleVerificationHtmlFile,
    injectVerificationIntoSpaIndex,
    serveVerificationBotHtml,
  };
}
