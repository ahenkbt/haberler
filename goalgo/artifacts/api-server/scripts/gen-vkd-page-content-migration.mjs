/**
 * VKD eksik sayfa HTML güncellemeleri -> 0053 migration
 *
 *   node ./scripts/gen-vkd-page-content-migration.mjs
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

function scopeBakanlikHtml(raw) {
  let out = String(raw ?? "");
  out = out.replace(/\bbody\s*\{/g, ".vkd-bakanlik-scope {");
  if (!out.includes("vkd-bakanlik-scope")) {
    const styleEnd = out.indexOf("</style>");
    if (styleEnd >= 0) {
      out = `${out.slice(0, styleEnd + 8)}\n<div class="vkd-bakanlik-scope">\n${out.slice(styleEnd + 8).trim()}\n</div>`;
    }
  }
  return out;
}

const sources = [
  {
    slug: "gazilerimiz",
    file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\gazilerimiz.txt",
    transform: (html) => cleanHmImportedTemplateHtml(html),
  },
  {
    slug: "isimsiz-kahramanlar",
    file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\isimsiz-kahramanlar.txt",
    transform: (html) => cleanHmImportedTemplateHtml(html),
  },
  {
    slug: "kadin-kahramanlarimiz",
    file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\kadın kahramanlarımız.txt",
    transform: (html) => cleanHmImportedTemplateHtml(html),
  },
  {
    slug: "bakanlik",
    file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\bakanlık.txt",
    transform: (html) => cleanHmImportedTemplateHtml(scopeBakanlikHtml(html)),
  },
];

const updates = sources.map(({ slug, file, transform }) => {
  const html = transform(readFileSync(file, "utf8"));
  if (!html) throw new Error(`Empty HTML for ${slug}`);
  return { slug, bodyHtml: html };
});

const updatesJson = JSON.stringify(updates);
const tag = "vkd_page_updates_json";
if (updatesJson.includes(`$${tag}$`)) {
  throw new Error("updates JSON contains dollar-quote delimiter");
}

const sql = `-- VKD eksik sayfa icerikleri: gazilerimiz, isimsiz-kahramanlar, kadin-kahramanlarimiz, bakanlik
DO $$
DECLARE
  pages jsonb;
  upd record;
  idx int;
  updates jsonb := $${tag}$${updatesJson}$${tag}$::jsonb;
BEGIN
  SELECT layout_json->'hmExtraPages' INTO pages FROM hm_news_sites WHERE slug = 'vkd';
  IF pages IS NULL THEN
    RAISE EXCEPTION 'VKD hmExtraPages not found';
  END IF;

  FOR upd IN SELECT * FROM jsonb_to_recordset(updates) AS x(slug text, "bodyHtml" text)
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
          'title', initcap(replace(upd.slug, '-', ' ')),
          'slug', upd.slug,
          'bodyHtml', upd."bodyHtml",
          'enabled', true,
          'fullWidth', true
        )
      );
    ELSE
      pages := jsonb_set(
        jsonb_set(pages, ARRAY[idx::text, 'bodyHtml'], to_jsonb(upd."bodyHtml"), true),
        ARRAY[idx::text, 'enabled'],
        'true'::jsonb,
        true
      );
    END IF;
  END LOOP;

  UPDATE hm_news_sites
  SET
    layout_json = jsonb_set(layout_json, '{hmExtraPages}', pages, true),
    updated_at = now()
  WHERE slug = 'vkd';
END $$;
`;

const outPath = path.resolve(__dirname, "../../../lib/db/migrations/0053_vkd_page_content_updates.sql");
writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${sql.length} chars, ${updates.length} pages)`);
