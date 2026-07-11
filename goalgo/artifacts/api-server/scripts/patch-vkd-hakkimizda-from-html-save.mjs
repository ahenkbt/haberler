/**
 * Kaydedilmiş tam HTML sayfasından (tarayıcı "Save As") VKD hakkimizda bodyHtml üretir.
 *
 *   node ./scripts/patch-vkd-hakkimizda-from-html-save.mjs "C:/Users/.../hakkımızda.txt"
 *   node ./scripts/patch-vkd-hakkimizda-from-html-save.mjs "..." --write-migration
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Open+Sans:wght@400;600;700&display=swap">';

const SLUG_ALIASES = new Map([
  ["genel-baskan", "baskan"],
  ["genel-baskanimiz", "baskan"],
]);

function rewriteVkdPageLinks(html) {
  let out = String(html ?? "");
  out = out.replace(/https?:\/\/(?:www\.)?vatankahramanlari\.org\.tr/gi, "");
  out = out.replace(/https?:\/\/(?:www\.)?vatankahramanlari\.org/gi, "");
  for (const [from, to] of SLUG_ALIASES) {
    out = out.replace(new RegExp(`href="/${from}(?=/|"|\\?)`, "gi"), `href="/${to}`);
  }
  out = out.replace(/href="\/dernek\/hakkimizda\/?"/gi, 'href="/hakkimizda"');
  return out;
}

function extractPrimaryRoot(html) {
  const m = html.match(/:root\{--cr:[^}]+\}/);
  return m?.[0] ?? "";
}

function extractTpStyleBlock(html) {
  const m = html.match(/<style>\s*\/\* ── TUKAV UYUM EŞLEMESİ ── \*\/[\s\S]*?<\/style>/i);
  if (!m) throw new Error("TUKAV tp-* style bloğu bulunamadı.");
  return m[0];
}

function extractPageContentBlock(html) {
  const startNeedle = `<div style="font-family:'Open Sans',system-ui,sans-serif;color:#1e293b">`;
  const start = html.indexOf(startNeedle);
  if (start < 0) throw new Error("Sayfa içerik kökü bulunamadı.");
  const footerStyle = html.indexOf("<style>\n#footer", start);
  const sliceEnd = footerStyle > start ? footerStyle : html.indexOf('<footer id="footer"', start);
  if (sliceEnd < 0) throw new Error("Sayfa içeriği sonu bulunamadı.");
  return html.slice(start, sliceEnd).trim();
}

export function buildHakkimizdaBodyHtmlFromSavedPage(rawHtml) {
  const html = String(rawHtml ?? "");
  const primaryRoot = extractPrimaryRoot(html);
  const tpStyles = extractTpStyleBlock(html);
  const content = extractPageContentBlock(html);
  if (!primaryRoot) throw new Error(":root renk değişkenleri bulunamadı.");

  const scopedRoot = primaryRoot.replace(
    ":root{",
    ".vkd-hakkimizda-page{",
  );
  const scopedTpStyles = tpStyles
    .replace(/^<style>/i, `<style>${scopedRoot}`)
    .replace(/:root\s*\{[^}]+\}/i, "");

  const bodyHtml = rewriteVkdPageLinks(
    `<div class="vkd-hakkimizda-page">${FONT_LINK}${scopedTpStyles}${content}</div>`,
  );
  return bodyHtml;
}

function patchLayoutJson(layout, bodyHtml) {
  const pages = layout.hmExtraPages;
  if (!Array.isArray(pages)) throw new Error("layout.hmExtraPages yok.");
  const idx = pages.findIndex((p) => String(p?.slug ?? "").toLowerCase() === "hakkimizda");
  if (idx < 0) throw new Error("hakkimizda slug bulunamadı.");
  pages[idx] = {
    ...pages[idx],
    title: "Hakkımızda",
    slug: "hakkimizda",
    bodyHtml,
    enabled: true,
    fullWidth: true,
    importSource: "wordpress-template",
    sourceName: "hakkımızda.txt",
    importedAt: new Date().toISOString(),
  };
  layout.hmExtraPages = pages;
  return layout;
}

function writeMigration(layout, migrationPath, bodyHtmlLen) {
  const layoutJson = JSON.stringify(layout);
  const tag = "vkd_hakkimizda_layout";
  if (layoutJson.includes(`$${tag}$`)) throw new Error("layout JSON dollar-quote çakışması");
  const fullSql = `-- VKD hakkimizda: tam CSS + icerik (${bodyHtmlLen} karakter bodyHtml)
UPDATE hm_news_sites
SET
  layout_json = $${tag}$${layoutJson}$${tag}$,
  updated_at = now()
WHERE slug = 'vkd';
`;
  writeFileSync(migrationPath, fullSql, "utf8");
  console.log(`Migration: ${migrationPath} (${fullSql.length} chars)`);
}

function main() {
  const args = process.argv.slice(2);
  const writeMigrationFlag = args.includes("--write-migration");
  const sourcePath = args.find((a) => !a.startsWith("--"));
  if (!sourcePath) {
    console.error('Kullanım: node ./scripts/patch-vkd-hakkimizda-from-html-save.mjs "C:/path/hakkımızda.txt" [--write-migration]');
    process.exit(1);
  }

  const raw = readFileSync(path.resolve(sourcePath), "utf8");
  const bodyHtml = buildHakkimizdaBodyHtmlFromSavedPage(raw);
  console.log(`bodyHtml: ${bodyHtml.length} karakter`);

  const importPath = path.join(__dirname, "out/vkd-layout-import.json");
  const payload = JSON.parse(readFileSync(importPath, "utf8"));
  payload.layout = patchLayoutJson(payload.layout, bodyHtml);
  writeFileSync(importPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Güncellendi: ${importPath}`);

  if (writeMigrationFlag) {
    const migrationPath = path.resolve(__dirname, "../../../lib/db/migrations/0050_vkd_hakkimizda_full_page.sql");
    writeMigration(payload.layout, migrationPath, bodyHtml.length);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
