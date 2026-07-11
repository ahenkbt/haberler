/**
 * VKD menu + tema sayfalarini migration SQL'e yazar.
 *
 *   node ./scripts/gen-vkd-0055-fix.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeHmWpTemplatePageForSave,
  parseHmWpTemplatePageSource,
} from "../src/lib/hm-wp-template-pages.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THEME_DIR = "C:\\Users\\ahenk\\Downloads\\vatanvakfi\\wp-content\\themes\\vkv-wp-v2";
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../lib/db/migrations");
const INSTITUTION = "VATAN KAHRAMANLARI DERNEĞİ";
const MAX_MIGRATION_CHARS = 240_000;

/** 0053/0054 ile guncellenen sayfalar — tema importu bunlari ezmesin */
const SKIP_THEME_SLUGS = new Set([
  "gazilerimiz",
  "isimsiz-kahramanlar",
  "kadin-kahramanlarimiz",
  "bakanlik",
  "turk-dunyasi-kahramanlari",
  "vefa-galerisi",
]);

const TITLE_BY_SLUG = {
  bagis: "Bağış",
  burs: "Burs Programı",
  faaliyetler: "Faaliyetler",
  hakkimizda: "Hakkımızda",
  "hizmet-bolgesi": "Hizmet Bölgelerimiz",
  "hukuk-savunuculuk": "Hukuk ve Savunuculuk",
  "insani-yardim": "İnsani Yardım",
  kahramanlar: "Kahramanlar",
  sehitlerimiz: "Şehitlerimiz",
  "sehit-gazi-haklari": "Şehit-Gazi Hakları",
  "sosyal-hizmetler": "Sosyal Hizmetler",
  "turkiye-sehit-gazi-dernekleri": "Türkiye Şehit Gazi Dernekleri",
  "uluslararasi-sehit-gazi-haklari": "Uluslararası Ş-G Hakları",
  "uluslararasi-stk": "Uluslararası STK",
  isbirligi: "İşbirliği",
  iletisim: "İletişim",
  "milli-gunler": "Millî Günler",
  "canakkale-savasi": "Çanakkale Savaşı",
  "kurtulus-savasi": "Kurtuluş Savaşı",
  "ataturk-kosesi": "Atatürk Köşesi",
  "ataturk-hayati": "Atatürk'ün Hayatı",
  "ataturk-kronoloji": "Atatürk Kronolojisi",
  "ataturk-ilkeler": "Atatürk İlkeleri",
  "ataturk-sozleri": "Atatürk Sözleri",
};

function slugFromTemplateFilename(sourceName) {
  const base = path.basename(sourceName).replace(/\.php$/i, "");
  const stem = base.replace(/^page[._-]/i, "");
  return stem
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[ğĞ]/g, "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeVkdInstitutionName(raw) {
  let out = String(raw ?? "");
  const replacements = [
    [/Vatan Kahramanları Vakfı/gi, INSTITUTION],
    [/Vatan Kahramanları Derneği/gi, INSTITUTION],
    [/VATAN KAHRAMANLARI VAKFI/gi, INSTITUTION],
    [/Vatan Kahramanlari Vakfi/gi, INSTITUTION],
    [/Vatan Kahramanlari Dernegi/gi, INSTITUTION],
  ];
  for (const [re, name] of replacements) out = out.replace(re, name);
  return out;
}

function buildPageUpdatesSql(tag, updatesJson) {
  if (updatesJson.includes(`$${tag}$`)) throw new Error(`${tag} delimiter collision`);
  return `-- guncellenen sayfa: ${JSON.parse(updatesJson).map((u) => u.slug).join(", ")}
DO $$
DECLARE
  pages jsonb;
  upd record;
  idx int;
  updates jsonb := $${tag}$${updatesJson}$${tag}$::jsonb;
BEGIN
  SELECT layout_json->'hmExtraPages' INTO pages FROM hm_news_sites WHERE slug = 'vkd';
  IF pages IS NULL THEN RAISE EXCEPTION 'VKD hmExtraPages not found'; END IF;

  FOR upd IN SELECT * FROM jsonb_to_recordset(updates) AS x(slug text, title text, "bodyHtml" text)
  LOOP
    idx := NULL;
    FOR i IN 0..jsonb_array_length(pages) - 1 LOOP
      IF lower(trim(pages->i->>'slug')) = lower(trim(upd.slug)) THEN idx := i; EXIT; END IF;
    END LOOP;

    IF idx IS NULL THEN
      pages := pages || jsonb_build_array(jsonb_build_object(
        'id', 'vkd-page-' || replace(upd.slug, ' ', '-'),
        'title', upd.title,
        'slug', upd.slug,
        'bodyHtml', upd."bodyHtml",
        'enabled', true,
        'fullWidth', true,
        'importSource', 'wordpress-template'
      ));
    ELSE
      pages := jsonb_set(
        jsonb_set(
          jsonb_set(pages, ARRAY[idx::text, 'bodyHtml'], to_jsonb(upd."bodyHtml"), true),
          ARRAY[idx::text, 'title'], to_jsonb(upd.title), true
        ),
        ARRAY[idx::text, 'enabled'], 'true'::jsonb, true
      );
    END IF;
  END LOOP;

  UPDATE hm_news_sites
  SET layout_json = jsonb_set(layout_json, '{hmExtraPages}', pages, true), updated_at = now()
  WHERE slug = 'vkd';
END $$;
`;
}

function main() {
const menuItems = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../lib/db/migrations/0052_vkd_corporate_menu.sql"), "utf8").match(
    /\$vkd_menu_json\$(\[.*?\])\$vkd_menu_json\$/s,
  )?.[1] ?? "[]",
);
if (!menuItems.some((m) => m.id === "vkd-menu-kah-vefa")) {
  menuItems.push({
    id: "vkd-menu-kah-vefa",
    label: "Vefa Galerisi",
    href: "/vefa-galerisi",
    parentId: "vkd-menu-kahramanlar",
    enabled: true,
  });
}
const menuJson = JSON.stringify(menuItems);

const menuSql = `-- VKD kurumsal menu (0052 + vefa galerisi) — idempotent
UPDATE hm_news_sites
SET
  layout_json = jsonb_set(layout_json, '{hmCorporateMenuItems}', $vkd_menu_fix_json$${menuJson}$vkd_menu_fix_json$::jsonb, true),
  display_name = '${INSTITUTION}',
  description = 'Vatan Kahramanları Derneği resmi haber ve kurumsal vitrin sitesi.',
  updated_at = now()
WHERE slug = 'vkd';
`;

writeFileSync(path.join(MIGRATIONS_DIR, "0055_vkd_menu_fix.sql"), menuSql, "utf8");

const phpFiles = readdirSync(THEME_DIR)
  .filter((name) => /^page[._-].*\.php$/i.test(name))
  .sort();

const updates = [];
for (let index = 0; index < phpFiles.length; index += 1) {
  const fileName = phpFiles[index];
  const filePath = path.join(THEME_DIR, fileName);
  if (readFileSync(filePath).byteLength === 0) continue;
  const slug = slugFromTemplateFilename(fileName);
  if (SKIP_THEME_SLUGS.has(slug)) continue;
  const preview = parseHmWpTemplatePageSource(fileName, readFileSync(filePath));
  const title = TITLE_BY_SLUG[slug] ?? preview.title;
  const saved = normalizeHmWpTemplatePageForSave(
    {
      sourceName: fileName,
      title,
      slug,
      bodyHtml: normalizeVkdInstitutionName(preview.bodyHtml),
      enabled: true,
      fullWidth: true,
    },
    index,
  );
  if (!saved?.bodyHtml.trim()) continue;
  updates.push({ slug: saved.slug, title: saved.title, bodyHtml: saved.bodyHtml });
}

const nameFixSql = `-- Tum sayfalarda kurum adi duzeltmesi
DO $$
DECLARE
  pages jsonb;
  i int;
  html text;
BEGIN
  SELECT layout_json->'hmExtraPages' INTO pages FROM hm_news_sites WHERE slug = 'vkd';
  IF pages IS NULL THEN RETURN; END IF;
  FOR i IN 0..jsonb_array_length(pages) - 1 LOOP
    html := pages->i->>'bodyHtml';
    IF html IS NULL OR html = '' THEN CONTINUE; END IF;
    html := regexp_replace(html, 'Vatan Kahramanları Vakfı', '${INSTITUTION}', 'gi');
    html := regexp_replace(html, 'Vatan Kahramanları Derneği', '${INSTITUTION}', 'gi');
    html := regexp_replace(html, 'VATAN KAHRAMANLARI VAKFI', '${INSTITUTION}', 'gi');
    pages := jsonb_set(pages, ARRAY[i::text, 'bodyHtml'], to_jsonb(html), true);
  END LOOP;
  UPDATE hm_news_sites SET layout_json = jsonb_set(layout_json, '{hmExtraPages}', pages, true), updated_at = now() WHERE slug = 'vkd';
END $$;
`;

const pageFiles = [];
let batch = 0;
let chunk = [];
let chunkChars = 0;

function flushChunk() {
  if (!chunk.length) return;
  batch += 1;
  const idx = 55 + batch;
  const suffix = batch === 1 ? "" : `_${batch}`;
  const fileName = `${String(idx).padStart(4, "0")}_vkd_theme_pages${suffix}.sql`;
  const tag = `vkd_theme_pages_${batch}`;
  writeFileSync(path.join(MIGRATIONS_DIR, fileName), buildPageUpdatesSql(tag, JSON.stringify(chunk)), "utf8");
  pageFiles.push(fileName);
  console.log(`Wrote ${fileName} (${chunk.length} pages, ${chunkChars} chars)`);
  chunk = [];
  chunkChars = 0;
}

for (const upd of updates) {
  const size = JSON.stringify(upd).length;
  if (chunk.length > 0 && chunkChars + size > MAX_MIGRATION_CHARS) flushChunk();
  chunk.push(upd);
  chunkChars += size;
}
flushChunk();

const nameIdx = 56 + batch;
const nameFile = `${String(nameIdx).padStart(4, "0")}_vkd_institution_name_fix.sql`;
writeFileSync(path.join(MIGRATIONS_DIR, nameFile), nameFixSql, "utf8");
console.log(`Wrote ${nameFile}`);
console.log(`Menu: ${menuItems.length} items, theme pages: ${updates.length}, skipped: ${[...SKIP_THEME_SLUGS].join(", ")}`);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();
