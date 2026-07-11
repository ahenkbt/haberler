import type { CorsOptions } from "cors";

import type { HelmetOptions } from "helmet";

import helmet from "helmet";

import rateLimit, { MemoryStore } from "express-rate-limit";

import type { Request, RequestHandler } from "express";

import { logger } from "./logger.js";
import { createUpstashRateLimitStore } from "./upstash-rate-limit-store.js";

import {

  LEGACY_PORTAL_HOSTS,

  PORTAL_HOST,

  PORTAL_WWW_HOST,

  listKnownPortalHostKeys,

  normalizePortalHostKey,

} from "./portalBrand.js";

import { isRegisteredCustomDomainOrigin } from "./corsCustomDomains.js";
import { yektubeDedicatedCorsOrigins } from "./yektubeBrand.js";



const isProd = process.env["NODE_ENV"] === "production";



/** Portal kökleri — CORS_ALLOWED_ORIGINS eksik olsa bile turknet.app / yekpare.net çapraz köken istekleri reddedilmesin. */

function defaultPortalCorsOrigins(): string[] {

  const hosts = new Set<string>([

    PORTAL_HOST,

    PORTAL_WWW_HOST,

    ...LEGACY_PORTAL_HOSTS,

    ...listKnownPortalHostKeys(),

  ]);

  return Array.from(hosts)

    .filter(Boolean)

    .flatMap((h) => [`https://${h}`, `https://www.${h.replace(/^www\./, "")}`])

    .map((o) => o.replace(/\/+$/, ""));

}



/**

 * Üretimde virgülle ayrılmış tam kökenler (örn. https://yekpare.net,https://www.yekpare.net).

 * Production varsayılanı sıkıdır; geçici tanılama için RELAX_CORS_IN_PRODUCTION=1 kullanılabilir.

 */

export function parseAllowedCorsOrigins(): string[] {

  const raw = process.env["CORS_ALLOWED_ORIGINS"]?.trim();

  const fromEnv = raw

    ? raw

        .split(",")

        .map((s) => s.trim().replace(/\/+$/, ""))

        .filter(Boolean)

    : [];

  const merged = new Set([...defaultPortalCorsOrigins(), ...yektubeDedicatedCorsOrigins(), ...fromEnv]);

  return Array.from(merged);

}



export function buildCorsOptions(): CorsOptions {

  if (isProd && process.env["RELAX_CORS_IN_PRODUCTION"] === "1") {

    logger.warn(

      "RELAX_CORS_IN_PRODUCTION=1 — CORS tüm kökenlere açık. Geçici tanılama içindir; CORS_ALLOWED_ORIGINS düzeltildikten sonra kaldırın.",

    );

    return { origin: true, credentials: true, allowedHeaders: defaultAllowedHeaders };

  }

  const allowed = parseAllowedCorsOrigins();



  if (isProd && !process.env["CORS_ALLOWED_ORIGINS"]?.trim()) {

    logger.info(

      "CORS_ALLOWED_ORIGINS tanımlı değil — portal kökleri (yekpare.net, turknet.app vb.) varsayılan izin listesine eklendi.",

    );

  }

  if (!isProd) {

    return { origin: true, credentials: true, allowedHeaders: defaultAllowedHeaders };

  }



  const set = new Set(allowed);

  return {

    credentials: true,

    allowedHeaders: defaultAllowedHeaders,

    origin(origin, callback) {

      if (!origin) {

        callback(null, true);

        return;

      }

      if (set.has(origin)) {

        callback(null, true);

        return;

      }

      try {

        const host = normalizePortalHostKey(new URL(origin).hostname);

        if (host.endsWith(".vercel.app")) {

          callback(null, true);

          return;

        }

      } catch {

        /* ignore */

      }

      void isRegisteredCustomDomainOrigin(origin)

        .then((ok) => {

          if (ok) {

            callback(null, true);

            return;

          }

          logger.warn({ origin }, "CORS reddedildi");

          callback(null, false);

        })

        .catch((err) => {

          logger.warn({ origin, err }, "CORS özel alan kontrolü başarısız");

          callback(null, false);

        });

    },

  };

}



const defaultAllowedHeaders: string[] = [

  "Content-Type",

  "Authorization",

  "X-Yekpare-Admin-Secret",

  "X-Requested-With",

  "x-vendor-id",

  "x-vendor-email",

];



/** API yanıtları JSON; CSP kapalı — ön yüz ayrı hostta ve admin HTML snippet’leri API üzerinden taşınmıyor. */

export function securityHelmetMiddleware(): RequestHandler {

  const opts: HelmetOptions = {

    contentSecurityPolicy: false,

    crossOriginEmbedderPolicy: false,

    crossOriginResourcePolicy: { policy: "cross-origin" },

    referrerPolicy: { policy: "strict-origin-when-cross-origin" },

    permittedCrossDomainPolicies: { permittedPolicies: "none" },

    hidePoweredBy: true,

  };

  return helmet(opts);

}



/**

 * Genel API — brute-force yüzeyini daraltır (IP + trust proxy).

 * Public bootstrap endpointleri rate-limit tüketirse site yanlışlıkla "API yok" durumuna düşer.

 */

function rateLimitRelativePath(req: Request): string {

  const raw = String(req.url ?? req.path ?? "").split("?")[0] ?? "";

  return raw.replace(/\/+$/, "") || "/";

}



/**

 * Kamuya açık vitrin GET uçları — goalgo/shared/public-vitrin-paths.mjs ile senkron.

 * Keşfet, Sipariş, Turizm, Ansiklopedi, Haberler, HM vitrin vb.

 */

const PUBLIC_VITRIN_GET_PREFIXES = [

  "/settings",

  "/public/",

  "/news",

  "/wiki",

  "/authors",

  "/categories",

  "/modules",

  "/ads",

  "/video",

  "/hm/meta/",

  "/hm/showcase-sites",

  "/hm/makale",

  "/hm/pwa-",

  "/tourism/listings",

  "/tourism/cities",

  "/tourism/destinations",

  "/tourism/tours",

  "/delivery/categories",

  "/delivery/module-items",

  "/delivery/marketplace",

  "/delivery/vendors",

  "/delivery/module-banners",

  "/ecommerce-product-categories",

  "/vendors/meta/",

  "/map/homepage-businesses",

  "/map/homepage-featured-offers",

  "/map/categories",

  "/map/stats",

  "/map/discover-categories",

  "/map/insaatfirmalarim",

  "/map/businesses",

  "/tr-address/provinces",

  "/tr-address/districts",

  "/tr-address/neighborhoods",

  "/broadcasts",

] as const;



const ADMIN_PATH_PREFIXES = [

  "/tourism/admin",

  "/hm/editor",

  "/hm/admin",

  "/hm/author",

  "/delivery/admin",

  "/map/admin",

  "/providers/admin",

] as const;



/** Vitrin GET uçları — middleware-api-degrade ile aynı; 429 olunca anasayfa boş kalmasın. */

function isPublicVitrinGetPath(req: Request): boolean {

  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const p = rateLimitRelativePath(req);



  if (ADMIN_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))) return false;



  if (p === "/map/businesses") {

    const backfill = String((req.query as Record<string, unknown>)?.backfill ?? "").toLowerCase();

    if (["1", "true", "yes"].includes(backfill)) return false;

  }



  return PUBLIC_VITRIN_GET_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix));

}



/** Vitrin muafiyeti dışında tutulan pahalı /video alt yolları — genel limite tabidir. */

const VIDEO_EXPENSIVE_SUBPATHS = ["/video/search", "/video/youtube-stream"] as const;

function isExpensiveVideoPath(path: string): boolean {
  return VIDEO_EXPENSIVE_SUBPATHS.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

function isGeneralRateLimitExemptPath(req: Request): boolean {

  const path = rateLimitRelativePath(req);

  if (isExpensiveVideoPath(path)) return false;

  return (

    path === "/healthz" ||
    path === "/healthz/live" ||

    path.startsWith("/sitemap/") ||

    path.startsWith("/rss/") ||

    isPublicVitrinGetPath(req)

  );

}



function rateLimitStore(prefix: string) {
  return createUpstashRateLimitStore(prefix) ?? new MemoryStore();
}



export const generalApiRateLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: isProd ? 800 : 4000,

  standardHeaders: true,

  legacyHeaders: false,

  skip: (req) => isGeneralRateLimitExemptPath(req),

  message: { error: "Çok fazla istek. Lütfen bir süre sonra tekrar deneyin." },

  store: rateLimitStore("general"),

  passOnStoreError: true,

});



const AUTH_POST_PATH_SUFFIXES = [

  "/hm/editor/login",

  "/hm/author/login",

  "/hm/author/password-reset-request",

  "/hm/author/password-reset",

  "/members/login",

  "/members/admin-panel-session",

  "/shop/auth/login",

  "/providers/login",

  "/courier/login",

  "/staff/login",

  "/map/users/login",

  "/map/owner/login",

  "/pbx/agent/login",

] as const;



function isSensitiveAuthPost(req: Request): boolean {

  if (req.method !== "POST") return false;

  const orig = (req.originalUrl ?? "").split("?")[0] ?? "";

  const rel = (req.url ?? "").split("?")[0] ?? "";

  return AUTH_POST_PATH_SUFFIXES.some((s) => orig.endsWith(s) || rel.endsWith(s));

}



/** Oturum açma / şifre sıfırlama uçları — daha sıkı tavan. */

export const sensitiveAuthRateLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: isProd ? 40 : 200,

  standardHeaders: true,

  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: { error: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." },

  store: rateLimitStore("auth"),

  passOnStoreError: true,

});



/**
 * Kazıma / kuyruk tetikleyicileri — Chromium bot, harici crawl, gece kazıyıcı.
 * Auth'suz POST uçları; IP başına çok sıkı tavan (trafik/maliyet saldırısı önlenir).
 */
export const scrapeTriggerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla kazıma isteği. Lütfen daha sonra tekrar deneyin." },
  store: rateLimitStore("scrape"),
  passOnStoreError: true,
});

/**
 * YouTube arama / içe aktarma uçları — her istek harici API + DB yazımı tetikleyebilir.
 * Normal haber haritası gezintisi için yeterli, botlar için caydırıcı tavan.
 */
export const youtubeImportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 240 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla video isteği. Lütfen daha sonra tekrar deneyin." },
  store: rateLimitStore("yt-import"),
  passOnStoreError: true,
});

/** Public AI sohbeti — LLM maliyeti; IP başına sıkı tavan. */
export const aiChatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 40 : 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla AI isteği. Lütfen daha sonra tekrar deneyin." },
  store: rateLimitStore("ai-chat"),
  passOnStoreError: true,
});

const SCRAPE_TRIGGER_POST_PATTERNS = [
  /^\/map\/newsmap-scraper\/queue$/,
  /^\/map\/kesfet-night-scraper\/wake$/,
  /^\/map\/businesses\/[^/]+\/scrape-detail$/,
  /^\/map\/scrape-osm$/,
  /^\/map\/scrape-insaatfirmalarim$/,
  /^\/map\/scrape-yatport$/,
  /^\/map\/google-places\/sync-location$/,
] as const;

const YOUTUBE_IMPORT_PATTERNS = [
  /^\/map\/newsmap\/location-youtube$/,
  /^\/map\/newsmap\/location-yektube$/,
  /^\/video\/haber-haritasi\/register-play$/,
  /^\/video\/search$/,
] as const;

const AI_CHAT_PATTERNS = [/^\/yekpare-ai\//] as const;

/** Pahalı uçlara yol bazlı özel limiter — genel limitten önce çalışır. */
export function attachExpensiveEndpointRateLimit(): RequestHandler {

  return (req, res, next) => {

    const path = rateLimitRelativePath(req);

    if (req.method === "POST" && SCRAPE_TRIGGER_POST_PATTERNS.some((re) => re.test(path))) {
      void scrapeTriggerRateLimiter(req, res, next);
      return;
    }

    if (YOUTUBE_IMPORT_PATTERNS.some((re) => re.test(path))) {
      void youtubeImportRateLimiter(req, res, next);
      return;
    }

    if (AI_CHAT_PATTERNS.some((re) => re.test(path))) {
      void aiChatRateLimiter(req, res, next);
      return;
    }

    next();

  };

}

export function attachSensitiveAuthRateLimit(): RequestHandler {

  return (req, res, next) => {

    if (isSensitiveAuthPost(req)) {

      void sensitiveAuthRateLimiter(req, res, next);

      return;

    }

    next();

  };

}

