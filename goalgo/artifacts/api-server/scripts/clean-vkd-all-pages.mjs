/**
 * VKD layout_json içindeki tüm hmExtraPages gövdelerini temizler (0050 sonrası).
 *
 *   node ./scripts/clean-vkd-all-pages.mjs
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

function extractLayoutJsonFromMigration(sql, tag) {
  const open = `$${tag}$`;
  const start = sql.indexOf(open);
  if (start < 0) throw new Error(`Tag not found: ${tag}`);
  const jsonStart = start + open.length;
  const end = sql.indexOf(`$${tag}$`, jsonStart);
  if (end < 0) throw new Error(`Closing tag not found: ${tag}`);
  return JSON.parse(sql.slice(jsonStart, end));
}

const migrationPath = path.resolve(__dirname, "../../../lib/db/migrations/0050_vkd_hakkimizda_full_page.sql");
const sql = readFileSync(migrationPath, "utf8");
const layout = extractLayoutJsonFromMigration(sql, "vkd_hakkimizda_layout");
const pages = Array.isArray(layout.hmExtraPages) ? layout.hmExtraPages : [];
let cleanedCount = 0;
for (const page of pages) {
  if (!page || typeof page !== "object" || typeof page.bodyHtml !== "string") continue;
  const cleaned = cleanHmImportedTemplateHtml(page.bodyHtml);
  if (cleaned !== page.bodyHtml) {
    page.bodyHtml = cleaned;
    cleanedCount += 1;
  }
}

const layoutJson = JSON.stringify(layout);
const tag = "vkd_clean_layout_json";
if (layoutJson.includes(`$${tag}$`)) {
  throw new Error("layout JSON contains dollar-quote delimiter");
}

const outSql = `-- VKD sayfa HTML temizligi: placeholder kaldirma, FA/font linkleri
UPDATE hm_news_sites
SET
  layout_json = $${tag}$${layoutJson}$${tag}$,
  updated_at = now()
WHERE slug = 'vkd';
`;

const outPath = path.resolve(__dirname, "../../../lib/db/migrations/0051_vkd_clean_template_pages.sql");
writeFileSync(outPath, outSql, "utf8");
console.log(`Cleaned ${cleanedCount}/${pages.length} pages -> ${outPath} (${outSql.length} chars)`);
