/**
 * turkatahaber.com / yerel.net.tr — Yenişafak PHP yalnızca hakkimizda|kunye|iletisim
 * sayfalarını sunar; hmExtraPages (/iller, /daha) Worker kenarında layout'tan basılır.
 */
import { neonNewsSqlClient, neonSqlClient } from "./neon-edge-db.js";

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

function fallbackDahaNetworkSitesHtml() {
  const sites = [
    ["TürAta Haber", "https://turkatahaber.com/", "https://turkatahaber.com/turkata/turkata-logo.webp"],
    ["Yerel Net", "https://yerel.net.tr/", "https://yerel.net.tr/yerel/yerel-logo.png"],
    ["Yeşil Vatan", "https://yesilvatan.gen.tr/", "https://yesilvatan.gen.tr/yesilvatan/yesilvatan-logo.png"],
    ["TürkSav", "https://turksav.org/", "https://turksav.org/turksav/turksav-logo.png"],
    ["Şehit Gazi", "https://sehitgazi.org.tr/", "https://sehitgazi.org.tr/sehitgazi/sehitgazi-logo.png"],
    ["Dünya Sağlık", "https://dunyasaglik.org/", "https://dunyasaglik.org/dunyasaglik/dunyasaglik-logo.png"],
    ["Fix Haber", "https://fix.tc/", "https://fix.tc/fix/fix-haber-logo.png"],
    ["Sosyal Hizmetler Haber Sitesi", "https://sosyalhizmetler.tr/", "https://sosyalhizmetler.tr/sosyalhizmetler/sosyalhizmetler-logo.webp"],
    ["Ankara Şehir Gazetesi", "https://ankarasehirgazetesi.com/", "https://ankarasehirgazetesi.com/favicon.ico"],
    ["Ankara Haber Gündemi", "https://ankarahabergundemi.com/", "https://ankarahabergundemi.com/favicon.ico"],
    ["Vatan Haber", "https://vatanhaber.net/", "https://vatanhaber.net/media/logos/vatanhaber.net-logo.png"],
    ["Gündemi.org", "https://gundemi.org/", "https://gundemi.org/gundemi/logos/gundemi-org.png"],
  ];
  const items = sites
    .map(
      ([name, href, logo]) =>
        `<li><a class="hm-daha-site-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" width="120" height="48" loading="lazy" decoding="async"><span class="hm-daha-site-name">${escapeHtml(name)}</span></a></li>`,
    )
    .join("");
  return `<section id="daha-haber-siteleri" class="hm-daha-sites"><h2 class="hm-daha-section-title">TürAta Haber Ajansı Haber sitelerimiz</h2><ul class="hm-daha-site-grid">${items}</ul></section>`;
}

function fallbackDahaRegionsHtml() {
  const regions = [
    ["marmara", "Marmara", "bolge-marmara"],
    ["ege", "Ege", "bolge-ege"],
    ["akdeniz", "Akdeniz", "bolge-akdeniz"],
    ["ic-anadolu", "İç Anadolu", "bolge-ic-anadolu"],
    ["karadeniz", "Karadeniz", "bolge-karadeniz"],
    ["dogu-anadolu", "Doğu Anadolu", "bolge-dogu-anadolu"],
    ["guneydogu-anadolu", "Güneydoğu Anadolu", "bolge-guneydogu-anadolu"],
  ];
  return regions
    .map(
      ([id, label, cat]) =>
        `<section id="${id}" class="hm-daha-region"><h2 class="hm-daha-region-title"><a href="/kategori/${cat}" class="hm-daha-il-link">${label}</a></h2><ul class="hm-daha-province-grid"><li><a href="/kategori/${cat}" class="hm-daha-il-link">${label} illeri</a></li></ul></section>`,
    )
    .join("");
}

function fallbackDahaPage() {
  return {
    slug: "daha",
    title: "Daha",
    bodyHtml: `<div class="hm-daha-page hm-extra-page-root"><div class="hm-daha-main"><section id="daha-hakkimizda" class="hm-daha-about"><p>TÜRKATA HABER AJANSI, Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın haber ajansıdır. 1998’den bu yana yerel yönetimler, kamu kurumları ile sivil toplum ve sektör gündemini Türkçe olarak kamuoyuna aktarır.</p><p>Yerelin Sesini Geleceğe Taşıyan Güvenilir Haber Ağı.</p><h2 id="yayin-ilkeleri">Yayın ilkeleri</h2><p>Ajans, başlık, özet ve kaynak bağlantısıyla sınırlı besleme kayıtlarını olduğu gibi gösterir. Tam metin, kaynağın kendi sayfasındadır. Editörün yazdığı haberler bu sitede yayımlanır.</p></section>${fallbackDahaNetworkSitesHtml()}<section id="daha-konsept" class="hm-daha-concept"><p>TürAta Haber Ajansı kamu ve yerel gündemi bir arada sunar: cumhurbaşkanlığı, bakanlıklar, TBMM ve kamu kurumlarından belediye, valilik ve 81 il haberine — yerelin sesini ulusal ve uluslararası okura taşıyan güvenilir bir yayın ağı.</p></section><section id="daha-81-il-projesi" class="hm-daha-proje"><h2 class="hm-daha-proje-title">81 İl 81 Haber Sitesi Projesi</h2><p class="hm-daha-proje-sub">TürkAta Haber Ajansı &amp; Türk Kültürünü Araştırma ve Tanıtma Vakfı İş Birliğiyle</p><h3>Proje Amacı</h3><p>81 İl 81 Haber Sitesi Projesi; Türkiye’nin her bir köşesini, köklü tarihini, zengin kültürünü ve eşsiz güzelliklerini il il, ilçe ilçe ve mahalle mahalle tüm dünyaya tanıtmak amacıyla hayata geçirilmiş milli bir yayıncılık ve kültür hareketidir.</p><p>TürkAta Haber Ajansı’nın güçlü habercilik altyapısı ile Türk Kültürünü Araştırma ve Tanıtma Vakfı’nın akademik ve kültürel birikimini bir araya getiren bu proje, yerel değerlerimizi ulusal ve uluslararası alanda hak ettiği noktaya taşımayı hedefler.</p><h3>Projenin Temel Kapsamı</h3><ul><li><strong>Yerel Kültür ve Envanter:</strong> Her ilin, ilçenin ve mahallenin kendine özgü tarihi dokusunu, mimarisini, sözlü kültürünü, geleneklerini ve el sanatlarını dijital kayıt altına almak.</li><li><strong>Turizm ve Gastronomi Tanıtımı:</strong> Bölgesel lezzetleri, doğal güzellikleri, tarihi ören yerlerini ve tescilli coğrafi işaretli ürünleri detaylı rehberlerle öne çıkarmak.</li><li><strong>Doğru ve Tarafsız Yerel Habercilik:</strong> Her ilin kendi yerel dinamiklerini, başarılarını, sosyal ve kültürel etkinliklerini tarafsız habercilik anlayışıyla dijital mecralara taşımak.</li><li><strong>Sözlü Tarih ve Yerel Portreler:</strong> Mahallelerimizin ve köylerimizin hafızası olan yaşlılarımızın, yerel zanaatkârlarımızın ve değerlerimizin hikâyelerini gelecek nesillere aktarmak.</li></ul><h3>Proje Odak Noktaları</h3><ul><li><strong>81 İl Genel Tanıtımı:</strong> İllerin tarihi gelişimi, sosyo-ekonomik yapısı ve genel kültür profili.</li><li><strong>İlçe Rehberleri:</strong> Her ilçenin öne çıkan simgeleri, gezilecek yerleri ve ekonomik değerleri.</li><li><strong>Mahalle ve Köy Biyografileri:</strong> Unutulmaya yüz tutmuş mahalle kültürleri, yerel isimlerin hikâyeleri ve mikro kültür çalışmaları.</li><li><strong>Kültür Etkinlikleri ve Haber:</strong> Yerel festivaller, fuarlar, sergiler ve anma günlerinin anlık takibi.</li></ul></section></div><aside class="hm-daha-aside ys-aside" aria-label="Uluslararası ve iller"><p class="hm-daha-lead">Uluslararası kuruluşlar, dış politika ve Türkiye'nin 81 ili — bölge ve il başlıklarından yerel gündeme geçin.</p><section id="daha-uluslararasi" class="hm-daha-intl"><h2 class="hm-daha-section-title">Uluslararası</h2><ul class="hm-daha-cat-grid"><li><a href="/kategori/nato" class="hm-daha-cat-link">NATO</a></li><li><a href="/kategori/uluslararasi-kuruluslar" class="hm-daha-cat-link">Uluslararası Kuruluşlar</a></li><li><a href="/kategori/birlesmis-milletler" class="hm-daha-cat-link">Birleşmiş Milletler</a></li><li><a href="/kategori/avrupa-birligi" class="hm-daha-cat-link">Avrupa Birliği</a></li></ul></section><section id="daha-bolgeler" class="hm-daha-bolgeler"><h2 class="hm-daha-section-title">Bölgeler ve iller</h2>${fallbackDahaRegionsHtml()}</section></aside></div>`,
  };
}

function fallbackPageForSlug(slug) {
  if (slug === "iller") return fallbackIllerPage();
  if (slug === "daha") return fallbackDahaPage();
  return null;
}

function scoreExtraPages(pages) {
  let score = 0;
  for (const page of pages) {
    if (!page || typeof page !== "object") continue;
    const slug = String(page.slug ?? "")
      .trim()
      .toLowerCase();
    const body = String(page.bodyHtml ?? "");
    if (slug === "daha" || slug === "iller") score += 10;
    if (body.includes("hm-daha-proje") || body.includes("hm-daha-site-grid")) score += 100;
    // Prefer layouts that include sister brands on the network grid.
    if (body.includes("ankarahabergundemi.com")) score += 40;
    if (body.includes("vatanhaber.net")) score += 40;
    if (body.includes("sosyalhizmetler.tr")) score += 40;
    // TUKAV is the foundation site, not a Haber sitelerimiz network brand.
    if (body.includes("tukav.org")) score -= 40;
    if (body.includes("hm-daha-aside") || body.includes("hm-iller-page")) score += 5;
    score += Math.min(20, Math.floor(body.length / 2000));
  }
  return score;
}

async function fetchLayoutPagesForHost(env, hostname) {
  const host = normalizeHost(hostname);
  // Panel Neon (DATABASE_URL) often has fresher hmExtraPages; PHP NEWS role may be
  // unable to UPDATE hm_news_sites.layout_json — pick the richer layout.
  const clients = [neonSqlClient(env), neonNewsSqlClient(env)].filter(Boolean);
  let best = [];
  let bestScore = -1;
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
      if (!pages.length) continue;
      const score = scoreExtraPages(pages);
      if (score > bestScore) {
        best = pages;
        bestScore = score;
      }
    } catch (err) {
      console.error("[kamu-yerel-extra]", String(err?.message || err).slice(0, 160));
    }
  }
  return best;
}

const PAGE_STYLE = `<style>
.hm-iller-page{max-width:1100px;margin:0 auto;padding:8px 0 32px}
.hm-iller-lead{font-size:1.05rem;line-height:1.55;margin:0 0 1.25rem;opacity:.9}
.hm-iller-region{margin:0 0 1.75rem}
.hm-iller-region-title{font-size:1.25rem;margin:0 0 .75rem;padding-bottom:.35rem;border-bottom:1px solid var(--ys-line,rgba(0,0,0,.12))}
.hm-iller-province-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.5rem .75rem}
.hm-iller-il-link{display:block;padding:.45rem .6rem;border-radius:6px;text-decoration:none;color:inherit;background:rgba(0,0,0,.04)}
.hm-iller-il-link:hover{background:rgba(11,51,98,.1)}
.ys-extra-page.ys-page:has(.hm-daha-page){grid-template-columns:minmax(0,1fr);gap:8px}
.hm-daha-page{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,320px);gap:32px;align-items:start;max-width:none;margin:0;padding:0 0 36px;color:var(--ys-text,#1a1a1a)}
.hm-daha-main{min-width:0}
.hm-daha-about{font-size:1.02rem;line-height:1.65;margin:0 0 1.5rem}
.hm-daha-about p{margin:0 0 .85rem}
.hm-daha-about h2{font-size:1.15rem;margin:1.25rem 0 .55rem;color:var(--ys-navy,#0b3362)}
.hm-daha-section-title{font-size:1.2rem;margin:0 0 .75rem;padding-bottom:.35rem;border-bottom:1px solid var(--ys-line,rgba(0,0,0,.12));color:var(--ys-navy,#0b3362)}
.hm-daha-concept{margin:0 0 1.75rem;padding:1rem 1.1rem;background:linear-gradient(135deg,rgba(11,51,98,.06),rgba(11,51,98,.02));border-left:3px solid var(--ys-navy,#0b3362);border-radius:0 8px 8px 0;line-height:1.6}
.hm-daha-concept p{margin:0}
.hm-daha-sites{margin:0 0 2rem}
.hm-daha-site-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.85rem}
.hm-daha-site-link{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.45rem;min-height:108px;padding:.75rem .6rem;text-decoration:none;color:inherit;background:#fff;border:1px solid var(--ys-line,rgba(0,0,0,.1));border-radius:8px;transition:border-color .15s ease,box-shadow .15s ease}
.hm-daha-site-link:hover{border-color:rgba(11,51,98,.35);box-shadow:0 4px 14px rgba(11,51,98,.08)}
.hm-daha-site-link img{max-width:112px;max-height:48px;width:auto;height:auto;object-fit:contain}
.hm-daha-site-name{font-size:.78rem;font-weight:700;text-align:center;line-height:1.25;color:var(--ys-navy,#0b3362)}
.hm-daha-proje{margin:0 0 1rem;padding:1.25rem 1.35rem;background:#fff;border:1px solid var(--ys-line,rgba(0,0,0,.1));border-radius:10px;box-shadow:0 1px 0 rgba(11,51,98,.04)}
.hm-daha-proje-title{font-size:clamp(1.25rem,2.2vw,1.55rem);margin:0 0 .35rem;line-height:1.25;color:var(--ys-navy,#0b3362);font-weight:900}
.hm-daha-proje-sub{margin:0 0 1.15rem;font-size:.95rem;line-height:1.5;opacity:.88}
.hm-daha-proje h3{font-size:1.05rem;margin:1.15rem 0 .45rem;color:var(--ys-navy,#0b3362)}
.hm-daha-proje p{margin:0 0 .75rem;line-height:1.65;font-size:.98rem}
.hm-daha-proje ul{margin:.25rem 0 .85rem;padding:0 0 0 1.15rem;line-height:1.6}
.hm-daha-proje li{margin:0 0 .45rem}
.hm-daha-aside{display:grid;gap:1.25rem;min-width:0;position:sticky;top:62px;padding:1rem 1.05rem;background:rgba(11,51,98,.03);border:1px solid var(--ys-line,rgba(0,0,0,.08));border-radius:10px}
.hm-daha-lead{font-size:.95rem;line-height:1.5;margin:0;opacity:.9}
.hm-daha-intl,.hm-daha-bolgeler,.hm-daha-region{margin:0}
.hm-daha-aside .hm-daha-section-title,.hm-daha-aside .hm-daha-region-title{font-size:1.05rem;margin:0 0 .55rem;padding-bottom:.3rem;border-bottom:1px solid var(--ys-line,rgba(0,0,0,.12))}
.hm-daha-province-grid,.hm-daha-cat-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.4rem .5rem}
.hm-daha-il-link,.hm-daha-cat-link{display:block;padding:.4rem .55rem;border-radius:6px;text-decoration:none;color:inherit;background:rgba(255,255,255,.85);border:1px solid transparent;font-size:.9rem}
.hm-daha-il-link:hover,.hm-daha-cat-link:hover{background:#fff;border-color:rgba(11,51,98,.2)}
.hm-daha-bolgeler{display:grid;gap:1rem}
@media (max-width:900px){
  .hm-daha-page{grid-template-columns:minmax(0,1fr);gap:1.5rem}
  .hm-daha-aside{position:static}
}
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
  // .ys-page is a 2-col article+aside grid — wrap hub content so /daha left column can fill.
  const mainInner = `${PAGE_STYLE}<div class="ys-wrap ys-extra-page" data-extra-slug="${escapeHtml(page.slug)}"><h1 class="ys-page-title">${escapeHtml(page.title)}</h1>${page.bodyHtml}</div>`;
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
  // Stale PHP Neon layouts often keep an old /daha body (intl+iller only or
  // missing sister brands). Prefer the in-worker promo hub until layout_json
  // can be rewritten on twilight-pine.
  const dahaBody = String(page?.bodyHtml || "");
  if (
    slug === "daha" &&
    page &&
    (!dahaBody.includes("hm-daha-proje") ||
      !dahaBody.includes("hm-daha-site-grid") ||
      !dahaBody.includes("ankarahabergundemi.com") ||
      !dahaBody.includes("vatanhaber.net") ||
      !dahaBody.includes("sosyalhizmetler.tr") ||
      dahaBody.includes("tukav.org"))
  ) {
    page = fallbackDahaPage();
  }
  if (!page) {
    page = fallbackPageForSlug(slug);
  }
  if (!page) return null;

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
