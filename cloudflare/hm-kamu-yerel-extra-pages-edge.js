/**
 * turkatahaber.com / yerel.net.tr — Yenişafak PHP yalnızca hakkimizda|kunye|iletisim
 * sayfalarını sunar; hmExtraPages (/iller, /daha) Worker kenarında layout'tan basılır.
 */
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";
import { listPublicNewsSites, renderNewsSitesGrid } from "./hm-public-news-sites.js";

export const KAMU_YEREL_EXTRA_PAGE_HOSTS = Object.freeze([
  "turkatahaber.com",
  "yerel.net.tr",
]);

/** PHP'nin kendi sunduğu tek-segment yollar — kenar yakalamaz. */
const PHP_NATIVE_PAGE_SLUGS = new Set([
  "hakkimizda",
  "kunye",
  "iletisim",
  "reklam",
  "abonelik",
  "telif-kullanim",
  "editor",
  "giris",
  "admin",
  "api",
  "assets",
  "turkata",
  "brand",
  "cdn-cgi",
]);

const SHELL_HEADER = "x-kamu-yerel-extra-shell";

function normalizeHost(raw) {
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

export function isKamuYerelExtraPageHost(hostname) {
  return KAMU_YEREL_EXTRA_PAGE_HOSTS.includes(normalizeHost(hostname));
}

/**
 * Tek segment path → extra page slug (iller, daha, …).
 * Rezerve PHP yolları ve çok segmentli path'ler null.
 */
export function kamuYerelExtraPageSlugFromPath(pathname) {
  const p = String(pathname || "")
    .replace(/\/+$/, "")
    .toLowerCase() || "/";
  const m = /^\/([a-z0-9][a-z0-9-]{0,80})$/.exec(p);
  if (!m) return null;
  const slug = m[1];
  if (PHP_NATIVE_PAGE_SLUGS.has(slug)) return null;
  if (slug === "kategori" || slug === "haber" || slug === "yazar" || slug === "koseyazari") return null;
  return slug;
}

function escapeHtml(raw) {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseLayoutPages(layoutRaw) {
  const raw =
    layoutRaw == null ? "" : typeof layoutRaw === "string" ? layoutRaw : JSON.stringify(layoutRaw);
  if (!raw.trim()) return [];
  try {
    const layout = JSON.parse(raw);
    const pages = layout?.hmExtraPages;
    return Array.isArray(pages) ? pages : [];
  } catch {
    return [];
  }
}

function findEnabledExtraPage(pages, slug) {
  const want = String(slug || "")
    .trim()
    .toLowerCase();
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    if (page.enabled === false) continue;
    const pageSlug = String(page.slug ?? "")
      .trim()
      .toLowerCase()
      .replace(/^\/+/, "");
    if (pageSlug === want) {
      return {
        slug: pageSlug,
        title: String(page.title ?? pageSlug).trim() || pageSlug,
        bodyHtml: String(page.bodyHtml ?? ""),
      };
    }
  }
  return null;
}

/** Neon layout yokken bölge kategorilerine düş — canlı /iller yine 200 + bölge linkleri. */
function fallbackIllerPage() {
  const regions = [
    ["marmara", "Marmara", "bolge-marmara"],
    ["ege", "Ege", "bolge-ege"],
    ["akdeniz", "Akdeniz", "bolge-akdeniz"],
    ["ic-anadolu", "İç Anadolu", "bolge-ic-anadolu"],
    ["karadeniz", "Karadeniz", "bolge-karadeniz"],
    ["dogu-anadolu", "Doğu Anadolu", "bolge-dogu-anadolu"],
    ["guneydogu-anadolu", "Güneydoğu Anadolu", "bolge-guneydogu-anadolu"],
  ];
  const sections = regions
    .map(
      ([id, label, cat]) =>
        `<section id="${id}" class="hm-iller-region"><h2 class="hm-iller-region-title"><a href="/kategori/${cat}" class="hm-iller-il-link">${label}</a></h2><ul class="hm-iller-province-grid"><li><a href="/kategori/${cat}" class="hm-iller-il-link">${label} illeri</a></li></ul></section>`,
    )
    .join("");
  return {
    slug: "iller",
    title: "İller",
    bodyHtml: `<div class="hm-iller-page"><p class="hm-iller-lead">Türkiye'nin 81 ilinde kamu ve yerel gündem haberleri — bölge başlığına tıklayarak il kategorilerine ulaşın.</p>${sections}</div>`,
  };
}

function fallbackDahaPage() {
  const iller = fallbackIllerPage();
  return {
    slug: "daha",
    title: "Daha",
    bodyHtml: `<div class="hm-daha-page"><p class="hm-daha-lead">Türkiye'nin 81 ili — bölge ve il başlıklarından yerel gündeme geçin. Uluslararası kuruluş haberleri için <a href="/kategori/dunya">Dünya</a> kategorisine bakın.</p><section id="daha-bolgeler" class="hm-daha-bolgeler"><h2 class="hm-daha-section-title">Bölgeler ve iller</h2>${iller.bodyHtml.replace('class="hm-iller-page"', 'class="hm-daha-inner"').replace(/hm-iller-/g, "hm-daha-")}</section></div>`,
  };
}

function fallbackPageForSlug(slug) {
  if (slug === "iller") return fallbackIllerPage();
  if (slug === "daha") return fallbackDahaPage();
  return null;
}

async function fetchLayoutPagesForHost(env, hostname) {
  const host = normalizeHost(hostname);
  const clients = [neonNewsSqlClient(env), neonSqlClient(env)].filter(Boolean);
  for (const sql of clients) {
    try {
      const rows = await sql`
        SELECT layout_json FROM hm_news_sites
        WHERE lower(regexp_replace(coalesce(domain, ''), '^www\\.', '')) = ${host}
           OR lower(regexp_replace(coalesce(domain2, ''), '^www\\.', '')) = ${host}
           OR lower(regexp_replace(coalesce(domain3, ''), '^www\\.', '')) = ${host}
           OR ( ${host} = 'turkatahaber.com' AND lower(trim(both '/' from coalesce(slug, ''))) = 'turkatahaber' )
           OR ( ${host} = 'yerel.net.tr' AND lower(trim(both '/' from coalesce(slug, ''))) IN ('yerelnet', 'yerel') )
        ORDER BY id ASC
        LIMIT 1
      `;
      const pages = parseLayoutPages(rows?.[0]?.layout_json);
      if (pages.length) return pages;
    } catch (err) {
      console.error("[kamu-yerel-extra]", String(err?.message || err).slice(0, 160));
    }
  }
  return [];
}

const PAGE_STYLE = `<style>
.hm-iller-page,.hm-daha-page{max-width:1100px;margin:0 auto;padding:8px 0 32px}
.hm-iller-lead,.hm-daha-lead{font-size:1.05rem;line-height:1.55;margin:0 0 1.25rem;opacity:.9}
.hm-iller-region,.hm-daha-region,.hm-daha-intl,.hm-daha-bolgeler{margin:0 0 1.75rem}
.hm-iller-region-title,.hm-daha-region-title,.hm-daha-section-title{font-size:1.25rem;margin:0 0 .75rem;padding-bottom:.35rem;border-bottom:1px solid var(--ys-line,rgba(0,0,0,.12))}
.hm-iller-province-grid,.hm-daha-province-grid,.hm-daha-cat-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.5rem .75rem}
.hm-iller-il-link,.hm-daha-il-link,.hm-daha-cat-link{display:block;padding:.45rem .6rem;border-radius:6px;text-decoration:none;color:inherit;background:rgba(0,0,0,.04)}
.hm-iller-il-link:hover,.hm-daha-il-link:hover,.hm-daha-cat-link:hover{background:rgba(11,51,98,.1)}
</style>`;

export function injectExtraPageIntoShell(shellHtml, page, brandName) {
  const brand = String(brandName || "Haber").trim() || "Haber";
  const title = `${page.title} | ${brand}`;
  let html = String(shellHtml || "");
  if (/<title>[^<]*<\/title>/i.test(html)) {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  } else {
    html = html.replace(/<\/head>/i, `<title>${escapeHtml(title)}</title></head>`);
  }
  const mainInner = `${PAGE_STYLE}<article class="ys-page ys-extra-page" data-extra-slug="${escapeHtml(page.slug)}"><h1 class="ys-page-title">${escapeHtml(page.title)}</h1>${page.bodyHtml}</article>`;
  if (/<main\b[^>]*id=["']icerik["'][^>]*>[\s\S]*?<\/main>/i.test(html)) {
    html = html.replace(
      /<main\b[^>]*id=["']icerik["'][^>]*>[\s\S]*?<\/main>/i,
      `<main id="icerik">${mainInner}</main>`,
    );
  } else if (/<main\b[^>]*>[\s\S]*?<\/main>/i.test(html)) {
    html = html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/i, `<main id="icerik">${mainInner}</main>`);
  } else {
    html = html.replace(/<\/body>/i, `<main id="icerik">${mainInner}</main></body>`);
  }
  return html;
}

function minimalShell(page, brandName, origin) {
  const brand = escapeHtml(brandName || "Haber");
  const o = String(origin || "").replace(/\/$/, "");
  return `<!DOCTYPE html>
<html lang="tr" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} | ${brand}</title>
  <link rel="stylesheet" href="${o}/assets/theme.css">
</head>
<body class="ys">
  <header class="ys-header"><div class="ys-bar"><a class="ys-logo" href="/">${brand}</a></div></header>
  <main id="icerik"></main>
</body>
</html>`;
}

/**
 * GET/HEAD /iller|/daha (ve layout'taki diğer hmExtraPages) — PHP 404'ü kenarda doldurur.
 * @returns {Promise<Response|null>}
 */
export async function serveKamuYerelExtraPage(request, env, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (request.headers.get(SHELL_HEADER) === "1") return null;
  if (!isKamuYerelExtraPageHost(incoming.hostname)) return null;
  const slug = kamuYerelExtraPageSlugFromPath(incoming.pathname);
  if (!slug) return null;
  // Yalnızca bilinen kamu-yerel extra slug'ları veya Neon layout'ta tanımlı sayfalar.
  const pages = await fetchLayoutPagesForHost(env, incoming.hostname);
  let page = findEnabledExtraPage(pages, slug);
  if (!page) {
    page = fallbackPageForSlug(slug);
  }
  if (!page) return null;

  // /daha: haber sitesi logo ızgarası her istekte canlı listeden (hm-public-news-sites).
  // Kayıtlı gövdedeki sabit liste yenisiyle değiştirilir; kurumsal ve askıdaki siteler yok.
  if (page.slug === "daha") {
    try {
      const sites = await listPublicNewsSites(env, {
        origin: `${incoming.protocol}//${incoming.host}`,
        exclude: normalizeHost(incoming.hostname),
      });
      if (sites.length) {
        const grid = renderNewsSitesGrid(sites);
        const section = /<section\b[^>]*id=["']daha-haber-siteleri["'][^>]*>[\s\S]*?<\/section>/i;
        let body = page.bodyHtml;
        if (section.test(body)) body = body.replace(section, grid);
        else if (/<div class="hm-daha-main">/i.test(body)) body = body.replace(/<div class="hm-daha-main">/i, `<div class="hm-daha-main">${grid}`);
        else body = grid + body;
        page = { ...page, bodyHtml: body };
      }
    } catch (err) {
      console.error("[kamu-yerel-extra-logos]", String(err?.message || err).slice(0, 160));
    }
  }

  const brand =
    normalizeHost(incoming.hostname) === "yerel.net.tr" ? "Yerel Net" : "TÜRKATA HABER AJANSI";
  const origin = `${incoming.protocol}//${incoming.host}`;
  let shellHtml = "";
  try {
    const shellUrl = new URL("/hakkimizda", origin);
    const shellRes = await fetch(shellUrl.toString(), {
      method: "GET",
      headers: {
        accept: "text/html",
        [SHELL_HEADER]: "1",
        "user-agent": request.headers.get("user-agent") || "kamu-yerel-extra-shell",
      },
      redirect: "follow",
    });
    if (shellRes.ok) {
      shellHtml = await shellRes.text();
    }
  } catch (err) {
    console.error("[kamu-yerel-extra-shell]", String(err?.message || err).slice(0, 120));
  }
  if (!shellHtml || !/<html/i.test(shellHtml)) {
    shellHtml = minimalShell(page, brand, origin);
  }
  const html = injectExtraPageIntoShell(shellHtml, page, brand);
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    "x-yekpare-frontend": "kamu-yerel-extra-page",
    "x-kamu-yerel-extra-slug": page.slug,
  });
  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(html, { status: 200, headers });
}
