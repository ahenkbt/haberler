const SKIP_PREFIXES = [
  "/api/",
  "/admin/",
  "/editor/",
  "/embed/",
  "/tr/",
  "/@vite",
  "/@react-refresh",
  "/src/",
  "/node_modules/",
] as const;

function splitPathQuery(pathWithQuery: string): { pathname: string; query: string } {
  const raw = String(pathWithQuery ?? "").trim() || "/";
  const i = raw.indexOf("?");
  if (i === -1) return { pathname: raw, query: "" };
  return { pathname: raw.slice(0, i), query: raw.slice(i) };
}

export function isVendorCustomDomainInfrastructurePath(pathname: string): boolean {
  const p = (pathname || "/").toLowerCase();
  for (const prefix of SKIP_PREFIXES) {
    if (p === prefix.slice(0, -1) || p.startsWith(prefix)) return true;
  }
  if (/\.(js|mjs|css|png|jpe?g|gif|svg|ico|woff2?|json|map|txt|webp|wasm)$/i.test(p)) return true;
  return false;
}

/**
 * Özel mağaza alanında kısa yolları vitrin yoluna eşler.
 * Örn. `/` → `/alisveris/magaza/foo`, `/blog` → `/alisveris/magaza/foo/blog`
 */
export function vendorCustomDomainRedirectTo(
  pathWithQuery: string,
  storefrontPath: string,
  shortPath?: string | null,
): string | null {
  const base = String(storefrontPath ?? "").trim();
  if (!base.startsWith("/")) return null;
  const short = String(shortPath ?? "").trim();

  const { pathname: pathIn, query } = splitPathQuery(
    pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`,
  );
  let pathname = pathIn || "/";

  if (isVendorCustomDomainInfrastructurePath(pathname)) return null;

  if (pathname === "/kesfet" || pathname.startsWith("/kesfet/")) {
    return `https://yekpare.net${pathname}${query}`;
  }

  const baseKesfetPrefix = `${base}/kesfet`;
  if (pathname === baseKesfetPrefix || pathname.startsWith(`${baseKesfetPrefix}/`)) {
    const rest = pathname.slice(baseKesfetPrefix.length) || "";
    return `https://yekpare.net/kesfet${rest}${query}`;
  }

  if (pathname === base || pathname.startsWith(`${base}/`)) return null;

  if (short && (pathname === short || pathname.startsWith(`${short}/`))) {
    return null;
  }

  const blogBase = `${base}/blog`;
  if (pathname === "/blog" || pathname.startsWith("/blog/")) {
    const rest = pathname.slice("/blog".length);
    return `${blogBase}${rest}${query}`;
  }

  const pageAliases: Record<string, string> = {
    "/hakkimizda": "hakkimizda",
    "/about": "hakkimizda",
    "/urunler": base.includes("/siparis/") ? "menu" : "urunler",
    "/products": base.includes("/siparis/") ? "menu" : "urunler",
    "/menu": base.includes("/alisveris/") ? "urunler" : "menu",
    "/iletisim": "iletisim",
    "/contact": "iletisim",
  };
  const alias = pageAliases[pathname.toLowerCase()];
  if (alias) return `${base}/${alias}${query}`;

  if (pathname === "/" || pathname === "") {
    return `${base}${query}`;
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 1) {
    const rest = parts.join("/");
    return `${base}/${rest}${query}`;
  }

  return `${base}${query}`;
}
