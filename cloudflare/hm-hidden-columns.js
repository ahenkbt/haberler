/**
 * Köşe yazısı (hm_makaleler) gizleme listesi — PHP Neon (twilight-pine) tarafı.
 *
 * İki kaynak:
 *  1) hm_site_content_hidden (site_id = PHP site id): public_slug + title ya da ref_id + public_slug.
 *  2) Kopya temizliğinde satırlar silinmeden site_id = -1000000 - siteId'ye taşındı (kosedup-20261009);
 *     o satırların id + slug çifti de gizli sayılır.
 *
 * Hata olursa boş küme döner (liste/senkron hiç durmaz; yalnız filtre uygulanmaz).
 */
const MOVED_SITE_OFFSET = 1000000;

function norm(v) {
  return String(v ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

export function emptyHiddenColumnKeys() {
  return { slugTitle: new Set(), idSlug: new Set(), size: 0 };
}

export async function loadHiddenColumnKeys(newsSql, phpSiteId) {
  const keys = emptyHiddenColumnKeys();
  const sid = Number(phpSiteId);
  if (!newsSql || !Number.isFinite(sid) || sid <= 0) return keys;
  try {
    const rows = await newsSql`
      SELECT public_slug, title, ref_id FROM hm_site_content_hidden
      WHERE site_id = ${sid} AND kind IS DISTINCT FROM 'rss'
    `;
    for (const r of rows || []) {
      const slug = norm(r.public_slug);
      if (!slug) continue;
      keys.slugTitle.add(`${slug}|${norm(r.title)}`);
      if (r.ref_id != null) keys.idSlug.add(`${Number(r.ref_id)}|${slug}`);
    }
  } catch (err) {
    console.error("[hm-hidden-columns/hidden]", String(err?.message || err).slice(0, 160));
  }
  try {
    const moved = await newsSql`
      SELECT id, slug FROM hm_makaleler WHERE site_id = ${-(MOVED_SITE_OFFSET + sid)}
    `;
    for (const r of moved || []) {
      const slug = norm(r.slug);
      if (slug) keys.idSlug.add(`${Number(r.id)}|${slug}`);
    }
  } catch (err) {
    console.error("[hm-hidden-columns/moved]", String(err?.message || err).slice(0, 160));
  }
  keys.size = keys.slugTitle.size + keys.idSlug.size;
  return keys;
}

export function isHiddenColumnRow(keys, row) {
  if (!keys || !keys.size || !row) return false;
  const slug = norm(row.slug);
  if (!slug) return false;
  if (keys.slugTitle.has(`${slug}|${norm(row.title)}`)) return true;
  return row.id != null && keys.idSlug.has(`${Number(row.id)}|${slug}`);
}
