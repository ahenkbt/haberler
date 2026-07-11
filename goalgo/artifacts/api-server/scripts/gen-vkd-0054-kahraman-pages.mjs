/**
 * VKD kahraman sayfalari: turk-dunyasi-kahramanlari + vefa-galerisi -> 0054 migration
 *
 *   node ./scripts/gen-vkd-0054-kahraman-pages.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FA_LINK =
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">';
const NUNITO_MERriweather_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap">';

function cleanHmImportedTemplateHtml(raw) {
  let out = String(raw ?? "");
  out = out.replace(/<div\b[^>]*class="[^"]*\bwp-content-placeholder\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  out = out.replace(/WordPress\s+içerik\s+alanı/gi, "");
  out = out.replace(/<style>\s*\d{3}(?:;\d{3})*&family=[^<]*<\/style>/gi, "");
  for (let i = 0; i < 8; i += 1) {
    const next = out
      .replace(
        /<div\b[^>]*style="[^"]*max-width:\s*100%[^"]*width:\s*100%[^"]*padding:\s*0[^"]*margin:\s*0[^"]*"[^>]*>\s*<\/div>/gi,
        "",
      )
      .replace(/<div\b([^>]*)>\s*<\/div>/gi, (_match, attrs) =>
        /\b(?:class|id|style)\s*=/.test(String(attrs ?? "")) ? `<div${attrs}></div>` : "",
      );
    if (next === out) break;
    out = next;
  }
  if (/\bfa[\s-]/.test(out) || /\bclass="[^"]*\bfa\b/.test(out)) {
    if (!/font-awesome|fontawesome/i.test(out)) out = `${FA_LINK}\n${out}`;
  }
  if ((/--fn:|Nunito Sans|Merriweather/i.test(out)) && !/fonts\.googleapis\.com/i.test(out)) {
    out = `${NUNITO_MERriweather_LINK}\n${out}`;
  }
  return out.trim();
}

const sources = [
  {
    slug: "turk-dunyasi-kahramanlari",
    title: "Türk Dünyası Kahramanları",
    file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\türk-dünyası.txt",
  },
  {
    slug: "vefa-galerisi",
    title: "Vefa Galerisi",
    file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\vefa galerisi.txt",
  },
];

const updates = sources.map(({ slug, title, file }) => {
  const bodyHtml = cleanHmImportedTemplateHtml(readFileSync(file, "utf8"));
  if (!bodyHtml) throw new Error(`Empty HTML for ${slug}`);
  return { slug, title, bodyHtml };
});

const menuItem = {
  id: "vkd-menu-kah-vefa",
  label: "Vefa Galerisi",
  href: "/vefa-galerisi",
  parentId: "vkd-menu-kahramanlar",
  enabled: true,
};

const updatesJson = JSON.stringify(updates);
const menuJson = JSON.stringify(menuItem);
const updatesTag = "vkd_kahraman_page_updates";
const menuTag = "vkd_kahraman_menu_item";

for (const [tag, json] of [
  [updatesTag, updatesJson],
  [menuTag, menuJson],
]) {
  if (json.includes(`$${tag}$`)) throw new Error(`${tag} delimiter collision`);
}

const sql = `-- VKD kahraman sayfalari: turk-dunyasi-kahramanlari icerigi + vefa-galerisi sayfasi ve menu
DO $$
DECLARE
  pages jsonb;
  menu jsonb;
  upd record;
  idx int;
  updates jsonb := $${updatesTag}$${updatesJson}$${updatesTag}$::jsonb;
  new_menu_item jsonb := $${menuTag}$${menuJson}$${menuTag}$::jsonb;
BEGIN
  SELECT layout_json->'hmExtraPages' INTO pages FROM hm_news_sites WHERE slug = 'vkd';
  IF pages IS NULL THEN
    RAISE EXCEPTION 'VKD hmExtraPages not found';
  END IF;

  FOR upd IN SELECT * FROM jsonb_to_recordset(updates) AS x(slug text, title text, "bodyHtml" text)
  LOOP
    idx := NULL;
    FOR i IN 0..jsonb_array_length(pages) - 1 LOOP
      IF lower(trim(pages->i->>'slug')) = lower(trim(upd.slug)) THEN
        idx := i;
        EXIT;
      END IF;
    END LOOP;

    IF idx IS NULL THEN
      pages := pages || jsonb_build_array(
        jsonb_build_object(
          'id', 'vkd-page-' || replace(upd.slug, ' ', '-'),
          'title', upd.title,
          'slug', upd.slug,
          'bodyHtml', upd."bodyHtml",
          'enabled', true,
          'fullWidth', true
        )
      );
    ELSE
      pages := jsonb_set(
        jsonb_set(
          jsonb_set(pages, ARRAY[idx::text, 'bodyHtml'], to_jsonb(upd."bodyHtml"), true),
          ARRAY[idx::text, 'title'],
          to_jsonb(upd.title),
          true
        ),
        ARRAY[idx::text, 'enabled'],
        'true'::jsonb,
        true
      );
    END IF;
  END LOOP;

  SELECT layout_json->'hmCorporateMenuItems' INTO menu FROM hm_news_sites WHERE slug = 'vkd';
  IF menu IS NULL THEN
    menu := '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(menu) elem
    WHERE elem->>'id' = new_menu_item->>'id'
       OR lower(trim(elem->>'href')) = lower(trim(new_menu_item->>'href'))
  ) THEN
    menu := menu || jsonb_build_array(new_menu_item);
  END IF;

  UPDATE hm_news_sites
  SET
    layout_json = jsonb_set(
      jsonb_set(layout_json, '{hmExtraPages}', pages, true),
      '{hmCorporateMenuItems}',
      menu,
      true
    ),
    updated_at = now()
  WHERE slug = 'vkd';
END $$;
`;

const outPath = path.resolve(__dirname, "../../../lib/db/migrations/0054_vkd_kahraman_pages.sql");
writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${sql.length} chars, ${updates.length} pages)`);
