/**
 * Google Indexing API + çoklu arama motoru site haritası ping — haber yayınlandığında bildirim.
 *
 * Gerekli ortam değişkenleri (Indexing API — tercih edilen):
 * - GOOGLE_INDEXING_CLIENT_EMAIL — servis hesabı e-postası
 * - GOOGLE_INDEXING_PRIVATE_KEY — PEM private key (\\n kaçışlı tek satır olabilir)
 *   VEYA GOOGLE_INDEXING_CREDENTIALS_JSON — tam servis hesabı JSON
 *
 * Opsiyonel:
 * - GOOGLE_INDEXING_DISABLED=1 — tüm bildirimleri kapat
 * - SITE_PUBLIC_ORIGIN — yekpare.net kök (sitemap ping için)
 *
 * Kimlik bilgisi yoksa: site haritası Google + Bing + Yandex ping (sitemap-search-engine-ping.ts).
 */
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, getNewsDbForRead, hmNewsSitesTable, newsTable, type NewsRow } from "@workspace/db";
import { getHmNewsSiteByIdCompat } from "./hm-site-compat.js";
import { sitePublicOrigin } from "./site-public-origin.js";
import { logger } from "./logger.js";
import { scheduleNewsSitemapPing } from "./sitemap-search-engine-ping.js";

const INDEXING_SCOPE = "https://www.googleapis.com/auth/indexing";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PUBLISH_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const HM_PREFIX = "tr";

type ServiceAccountCreds = { client_email: string; private_key: string };

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function indexingDisabled(): boolean {
  return process.env.GOOGLE_INDEXING_DISABLED?.trim() === "1";
}

function parseServiceAccountCreds(): ServiceAccountCreds | null {
  const jsonRaw = process.env.GOOGLE_INDEXING_CREDENTIALS_JSON?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as ServiceAccountCreds;
      if (parsed.client_email && parsed.private_key) return parsed;
    } catch {
      /* fall through */
    }
  }
  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL?.trim();
  const keyRaw = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.trim();
  if (!email || !keyRaw) return null;
  return { client_email: email, private_key: keyRaw.replace(/\\n/g, "\n") };
}

export function hasGoogleIndexingCredentials(): boolean {
  return parseServiceAccountCreds() != null;
}

async function getGoogleAccessToken(): Promise<string | null> {
  const creds = parseServiceAccountCreds();
  if (!creds) return null;
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
    return cachedAccessToken.token;
  }
  const iat = Math.floor(now / 1000);
  const assertion = jwt.sign(
    {
      iss: creds.client_email,
      scope: INDEXING_SCOPE,
      aud: TOKEN_URL,
      iat,
      exp: iat + 3600,
    },
    creds.private_key,
    { algorithm: "RS256" },
  );
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, "[google-indexing] access token alınamadı");
    return null;
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  const token = data.access_token?.trim();
  if (!token) return null;
  cachedAccessToken = {
    token,
    expiresAt: now + Math.max(60, Number(data.expires_in ?? 3600)) * 1000,
  };
  return token;
}

async function submitUrlToIndexingApi(url: string, type: "URL_UPDATED" | "URL_DELETED"): Promise<boolean> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return false;
  try {
    const res = await fetch(PUBLISH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn({ url, status: res.status, body: body.slice(0, 200) }, "[google-indexing] URL bildirimi reddedildi");
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ url, err }, "[google-indexing] URL bildirimi hatası");
    return false;
  }
}

function hmArticlePublicUrl(
  siteSlug: string,
  articleSlug: string,
  domain: string | null | undefined,
  portalBase: string,
): string {
  const tail = `/haber/${encodeURIComponent(articleSlug)}`;
  const d = String(domain ?? "").trim();
  if (d) {
    try {
      const origin = new URL(/^https?:\/\//i.test(d) ? d : `https://${d}`).origin;
      return `${origin.replace(/\/+$/, "")}${tail}`;
    } catch {
      /* fall through */
    }
  }
  return `${portalBase.replace(/\/+$/, "")}/${HM_PREFIX}/${encodeURIComponent(siteSlug)}${tail}`;
}

/** Yayınlanmış haber için indekslenecek kanonik URL listesi. */
export async function buildNewsIndexingUrls(row: Pick<NewsRow, "slug" | "siteId" | "status">): Promise<string[]> {
  if (row.status !== "published") return [];
  const slug = String(row.slug ?? "").trim();
  if (!slug) return [];
  const portalBase = sitePublicOrigin().replace(/\/+$/, "");
  const urls = new Set<string>();

  if (row.siteId == null) {
    urls.add(`${portalBase}/haber/${encodeURIComponent(slug)}`);
    const hmSites = await db
      .select({
        slug: hmNewsSitesTable.slug,
        domain: hmNewsSitesTable.domain,
      })
      .from(hmNewsSitesTable)
      .where(eq(hmNewsSitesTable.active, true));
    for (const site of hmSites) {
      urls.add(hmArticlePublicUrl(site.slug, slug, site.domain, portalBase));
    }
  } else {
    const site = await getHmNewsSiteByIdCompat(row.siteId);
    if (site) {
      urls.add(hmArticlePublicUrl(site.slug, slug, site.domain, portalBase));
    }
  }

  return [...urls];
}

/** Haber yayınlandığında Google'a bildir (async — hata yutulur). */
export function scheduleGoogleNewsIndexing(row: Pick<NewsRow, "slug" | "siteId" | "status">): void {
  if (indexingDisabled() || row.status !== "published") return;
  void (async () => {
    const urls = await buildNewsIndexingUrls(row);
    if (!urls.length) return;

    if (hasGoogleIndexingCredentials()) {
      for (const url of urls) {
        await submitUrlToIndexingApi(url, "URL_UPDATED");
      }
      logger.info({ count: urls.length, slug: row.slug }, "[google-indexing] URL_UPDATED gönderildi");
    }

    scheduleNewsSitemapPing(row);
  })().catch((err) => {
    logger.warn({ err, slug: row.slug }, "[google-indexing] bildirim hatası");
  });
}

/** Slug ile haber satırı yükle ve indeksle (RSS import sonrası). */
export async function scheduleGoogleNewsIndexingBySlug(slug: string): Promise<void> {
  const s = String(slug ?? "").trim();
  if (!s) return;
  const [row] = await getNewsDbForRead()
    .select({
      slug: newsTable.slug,
      siteId: newsTable.siteId,
      status: newsTable.status,
    })
    .from(newsTable)
    .where(eq(newsTable.slug, s))
    .limit(1);
  if (row) scheduleGoogleNewsIndexing(row);
}
