/**
 * HM editör siteleri — HTML ilk boyama.
 * Kök / bekleyen meta API'siz /tr/{slug}'a düşer; HTML'e kısa süreli home-bundle gömülür.
 * fetchApi Container yolunda AbortSignal'i siler; TTFB'yi withBudget keser.
 */
export const HM_HTML_BOOT_BUDGET_MS = 280;
const HM_HTML_BOOT_MAX_JSON_CHARS = 180_000;

export function withBudget(promise, ms = HM_HTML_BOOT_BUDGET_MS) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

const HM_DOMAIN_SLUG_FALLBACKS = {
  "suhaberajansi.com": "su",
  "www.suhaberajansi.com": "su",
  "kirsehri.com": "kirsehirhaber",
  "www.kirsehri.com": "kirsehirhaber",
  "kirsehirhaber.org": "kirsehirhaber",
  "www.kirsehirhaber.org": "kirsehirhaber",
  "kirsehir.net": "kirsehirhaber",
  "www.kirsehir.net": "kirsehirhaber",
  "ankarasehirgazetesi.com": "asg",
  "www.ankarasehirgazetesi.com": "asg",
  "ankarahabergundemi.com": "ankarahabergundemi",
  "www.ankarahabergundemi.com": "ankarahabergundemi",
  "vatankahramanlari.org": "vkd",
  "www.vatankahramanlari.org": "vkd",
  "vatanhaber.net": "vatanhaber",
  "www.vatanhaber.net": "vatanhaber",
};

export function normalizeHmBootHost(hostname) {
  return String(hostname || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "")
    .trim();
}

export function hmDomainSlugFallback(hostname) {
  const h = String(hostname || "")
    .toLowerCase()
    .split(":")[0]
    .trim();
  if (!h) return "";
  return (
    String(HM_DOMAIN_SLUG_FALLBACKS[h] || HM_DOMAIN_SLUG_FALLBACKS[`www.${h}`] || "").trim() || ""
  );
}

/** Bilinen HM alanında kök GET — meta API beklemeden 308. */
export function shouldInstantHmRootRedirect(method, pathname, hostname) {
  const m = String(method || "GET").toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path !== "/") return false;
  return Boolean(hmDomainSlugFallback(hostname));
}

export function hmHomeSlugFromPath(pathname, hostname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  const m = path.match(/^\/tr\/([^/]+)$/i) || path.match(/^\/hm\/([^/]+)$/i);
  if (m?.[1]) {
    return String(m[1])
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
  }
  if (path === "/") return hmDomainSlugFallback(hostname);
  return "";
}

export function isHmPublicHomeHtmlPath(pathname, hostname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/" && hmDomainSlugFallback(hostname)) return true;
  return /^\/tr\/[^/]+$/i.test(path) || /^\/hm\/[^/]+$/i.test(path);
}

function safeJsonScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

/** İlk haber görseli — Link: rel=preload as=image */
export function firstHmBootImageUrl(bundle, origin) {
  const lists = [
    bundle?.featured,
    bundle?.centerHeadlines,
    bundle?.manualEditor,
    bundle?.breaking,
    bundle?.popular,
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const raw = String(
        item?.imageUrl || item?.featuredImage || item?.image || item?.thumbnailUrl || "",
      ).trim();
      if (!raw) continue;
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("//")) return `https:${raw}`;
      if (raw.startsWith("/") && origin) return `${String(origin).replace(/\/+$/, "")}${raw}`;
    }
  }
  return "";
}

export function injectHmHtmlBoot(html, boot) {
  if (!html || !boot || typeof boot !== "object") return html;
  const parts = [];
  if (boot.bundle && boot.siteId) {
    const bundleJson = safeJsonScript({
      siteId: boot.siteId,
      savedAt: boot.savedAt || Date.now(),
      bundle: boot.bundle,
    });
    if (bundleJson.length <= HM_HTML_BOOT_MAX_JSON_CHARS) {
      parts.push(`window.__YEKPARE_HM_HOME_BUNDLE__=${bundleJson};`);
    }
  }
  if (boot.meta && boot.meta.id) {
    const metaJson = safeJsonScript(boot.meta);
    if (metaJson.length <= HM_HTML_BOOT_MAX_JSON_CHARS) {
      parts.push(`window.__YEKPARE_HM_NESTED_META__=${metaJson};`);
    }
  }
  if (boot.slug) {
    parts.push(
      `window.__YEKPARE_HM_DOMAIN_BOOT__=${safeJsonScript({
        slug: boot.slug,
        host: boot.host || "",
        savedAt: boot.savedAt || Date.now(),
      })};`,
    );
  }
  if (parts.length === 0) return html;
  const tag = `<script>${parts.join("")}</script>`;
  const charset = html.match(/<meta charset=["']UTF-8["']\s*\/?>/i);
  if (charset && charset.index != null) {
    const at = charset.index + charset[0].length;
    return `${html.slice(0, at)}\n${tag}${html.slice(at)}`;
  }
  if (html.includes("</head>")) return html.replace("</head>", `${tag}\n</head>`);
  return `${tag}${html}`;
}

function jsonOk(res) {
  return Boolean(res && res.ok);
}

/**
 * Kenar cache hit ise ~50ms; miss ise bütçe dolunca HTML'i geciktirme.
 * @param {{ fetchApi: Function, origin: string, env: object, incoming: URL }} opts
 */
export async function raceHmHtmlBoot(opts) {
  const { fetchApi, origin, env, incoming } = opts || {};
  const slug = hmHomeSlugFromPath(incoming?.pathname, incoming?.hostname);
  if (!slug || typeof fetchApi !== "function" || !origin) return null;
  const domain = String(incoming?.hostname || "").toLowerCase();
  const headers = {
    accept: "application/json",
    "x-forwarded-host": incoming.host || domain,
    "x-forwarded-proto": "https",
  };
  const cfCache = { cacheTtl: 60, cacheEverything: true };
  try {
    const metaUrl = `${origin}/api/hm/meta/by-slug/${encodeURIComponent(slug)}?domain=${encodeURIComponent(domain)}`;
    const bundleUrl = `${origin}/api/hm/home-bundle?slug=${encodeURIComponent(slug)}&sliderLimit=15`;
    const [metaRes, bundleRes] = await Promise.all([
      fetchApi(env, metaUrl, { headers, cf: cfCache }),
      fetchApi(env, bundleUrl, { headers, cf: cfCache }),
    ]);
    const meta = jsonOk(metaRes) ? await metaRes.json().catch(() => null) : null;
    const bundle = jsonOk(bundleRes) ? await bundleRes.json().catch(() => null) : null;
    const siteId = Number(meta?.id || bundle?.siteId);
    if (!Number.isFinite(siteId) || siteId <= 0) {
      return meta?.id ? { siteId: Number(meta.id), slug, host: domain, savedAt: Date.now(), meta, bundle: null } : null;
    }
    return {
      siteId,
      slug,
      host: domain,
      savedAt: Date.now(),
      meta: meta && typeof meta === "object" ? meta : null,
      bundle: bundle && typeof bundle === "object" ? bundle : null,
    };
  } catch {
    return null;
  }
}
