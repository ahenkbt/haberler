/**
 * tukav.org — vakıf markası (paylaşım OG / site_name / logo).
 * Neon portal (Yekpare) ayarları bu hosta sızmamalı.
 * ASSETS: public/tukav/*
 */

export const TUKAV_SLUG = "tukav";
export const TUKAV_DOMAIN = "tukav.org";
export const TUKAV_LOGO_PATH = "/tukav/tukav-logo.png";
export const TUKAV_OG_IMAGE_PATH = "/tukav/tukav-og.png";
export const TUKAV_BRAND_NAME = "TUKAV — Türk Kültürünü Araştırma ve Tanıtma Vakfı";
export const TUKAV_BRAND_TITLE = "TUKAV — Türk Kültürünü Araştırma ve Tanıtma Vakfı";
export const TUKAV_BRAND_DESCRIPTION =
  "Türk Ruhunu Yaşat. Geleceği Aydınlat ! 1998’de Ankara’da kurulan TUKAV (Türk Kültürünü Araştırma ve Tanıtma Vakfı). Türk kültürü, tarihi ve medeniyet mirasını korur.";

const TUKAV_HOSTS = new Set(["tukav.org", "www.tukav.org"]);

export function normalizeTukavHost(raw) {
  return (
    String(raw ?? "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.replace(/^www\./, "")
      ?.replace(/\.$/, "") ?? ""
  );
}

export function isTukavHost(raw) {
  const host = normalizeTukavHost(raw);
  return host === TUKAV_DOMAIN || TUKAV_HOSTS.has(String(raw || "").toLowerCase().split(":")[0]);
}

export function listTukavDomains() {
  return [TUKAV_DOMAIN, `www.${TUKAV_DOMAIN}`];
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function replaceMetaByKey(html, attr, key, value) {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i",
  );
  const tag = `<meta ${attr}="${key}" content="${escHtml(value)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

/**
 * SPA kabuğundaki Yekpare OG meta'yı TUKAV markasına çevir (botlar JS çalıştırmaz).
 */
export function rewriteSpaShellOgForTukav(html, origin) {
  const o = String(origin || `https://${TUKAV_DOMAIN}`).replace(/\/+$/, "");
  const name = TUKAV_BRAND_NAME;
  const title = TUKAV_BRAND_TITLE;
  const desc = TUKAV_BRAND_DESCRIPTION;
  const image = `${o}${TUKAV_OG_IMAGE_PATH}`;
  const url = `${o}/`;
  let out = String(html || "");
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escHtml(title)}</title>`);
  out = replaceMetaByKey(out, "name", "title", title);
  out = replaceMetaByKey(out, "name", "description", desc);
  out = replaceMetaByKey(out, "name", "author", name);
  out = replaceMetaByKey(out, "name", "keywords", `${name}, tukav.org, Türk kültürü`);
  out = replaceMetaByKey(out, "property", "og:title", title);
  out = replaceMetaByKey(out, "property", "og:description", desc);
  out = replaceMetaByKey(out, "property", "og:site_name", name);
  out = replaceMetaByKey(out, "property", "og:url", url);
  out = replaceMetaByKey(out, "property", "og:image", image);
  out = replaceMetaByKey(out, "name", "twitter:title", title);
  out = replaceMetaByKey(out, "name", "twitter:description", desc);
  out = replaceMetaByKey(out, "name", "twitter:image", image);
  out = out.replace(
    /<link[^>]+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escHtml(url)}" />`,
  );
  if (/data-yekpare-portal-jsonld="1"/.test(out)) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NGO",
      "@id": `${o}/#organization`,
      name,
      alternateName: ["TUKAV", "TürkAta", "Türk Kültürünü Araştırma ve Tanıtma Vakfı"],
      url,
      description: desc,
      logo: { "@type": "ImageObject", url: `${o}${TUKAV_LOGO_PATH}` },
      sameAs: ["https://turkatav.org"],
    };
    const ldTag = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    out = out.replace(
      /<script type="application\/ld\+json"[^>]*data-yekpare-portal-jsonld="1"[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
    out = out.replace(/<\/head>/i, `${ldTag}\n</head>`);
  }
  return out;
}
