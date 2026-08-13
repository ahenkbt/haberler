/**
 * Yektube SPA path rewrite + Assets fetch helpers.
 * CF Assets default html_handling 307's /yektube-v2/index.html → /yektube-v2/;
 * following that Location as a public fetch re-enters this Worker (dedicated-host
 * 301 to /yp) and never serves the nested SPA. Always fetch Assets with
 * redirect=manual and follow Location only via ASSETS.
 */

export function isYektubeSurfacePath(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return (
    p === "/yp" ||
    p.startsWith("/yp/") ||
    p === "/yektube-v2" ||
    p.startsWith("/yektube-v2/") ||
    p === "/muzik" ||
    p.startsWith("/muzik/") ||
    p === "/cocuk" ||
    p.startsWith("/cocuk/") ||
    p === "/canli" ||
    p.startsWith("/canli/") ||
    p === "/yek-gonder" ||
    p.startsWith("/yek-gonder/") ||
    p === "/yeklive" ||
    p.startsWith("/yeklive/") ||
    p === "/hesabim" ||
    p.startsWith("/hesabim/") ||
    p === "/studio" ||
    p.startsWith("/studio/") ||
    p === "/yektube" ||
    p.startsWith("/yektube/")
  );
}

/**
 * /yp ve Yektube yüzeyleri → yektube-v2/index.html
 * (Vercel/Netlify rewrite'ları CF Worker yolunda çalışmıyor;
 *  aksi halde portal SPA /yp'yi vendor short-path sanıp beyaz ekran veriyor.)
 */
export function rewriteYektubeSpaPath(pathname) {
  const raw = String(pathname || "/") || "/";
  const noQuery = raw.split("?")[0] || "/";

  const ypStaticMap = {
    "/yp/sw.js": "/yektube-v2/sw.js",
    "/yp/manifest.webmanifest": "/yektube-v2/manifest.webmanifest",
    "/yp/yektube-icon.png": "/yektube-v2/yektube-icon.png",
    "/yp/yektube-logo.png": "/yektube-v2/yektube-logo.png",
    "/yp/yektube-video-tv-logo.png": "/yektube-v2/yektube-video-tv-logo.png",
    "/yp/offline.html": "/yektube-v2/offline.html",
  };
  if (ypStaticMap[noQuery]) return ypStaticMap[noQuery];

  const last = noQuery.split("/").pop() || "";
  if (last.includes(".") && !/\.html?$/i.test(last)) return null;

  const p = noQuery.replace(/\/+$/, "") || "/";
  if (
    p === "/yp" ||
    p.startsWith("/yp/") ||
    p === "/muzik" ||
    p.startsWith("/muzik/") ||
    p === "/cocuk" ||
    p.startsWith("/cocuk/") ||
    p === "/canli" ||
    p.startsWith("/canli/") ||
    p === "/yek-gonder" ||
    p.startsWith("/yek-gonder/") ||
    p === "/yeklive" ||
    p.startsWith("/yeklive/") ||
    p === "/hesabim" ||
    p.startsWith("/hesabim/") ||
    p === "/studio" ||
    p.startsWith("/studio/") ||
    p === "/yektube" ||
    p.startsWith("/yektube/") ||
    p === "/yektube-v2" ||
    p.startsWith("/yektube-v2/")
  ) {
    return "/yektube-v2/index.html";
  }
  return null;
}

export function isYektubeSpaHtml(html) {
  const s = String(html || "");
  return /yektube-v2\/assets\//i.test(s) || /<title>\s*Yektube\s*<\/title>/i.test(s);
}

/** Assets binding: never follow 3xx out to the public Worker URL. */
export function withAssetPath(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
  });
}

export function nextSameOriginAssetPath(requestUrl, locationHeader) {
  if (!locationHeader) return null;
  let next;
  try {
    next = new URL(locationHeader, requestUrl);
  } catch {
    return null;
  }
  const origin = new URL(requestUrl).origin;
  if (next.origin !== origin) return null;
  const path = next.pathname || "/";
  const current = new URL(requestUrl).pathname;
  if (path === current) return null;
  return path;
}

export async function fetchStaticAssets(env, request, pathname) {
  let path = pathname || "/";
  for (let i = 0; i < 5; i++) {
    const req = withAssetPath(request, path);
    const resp = await env.ASSETS.fetch(req);
    if (![301, 302, 303, 307, 308].includes(resp.status)) return resp;
    const next = nextSameOriginAssetPath(req.url, resp.headers.get("location"));
    if (!next || next === path) return resp;
    path = next;
  }
  return env.ASSETS.fetch(withAssetPath(request, path));
}
