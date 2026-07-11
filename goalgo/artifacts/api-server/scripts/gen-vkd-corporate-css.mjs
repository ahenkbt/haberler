import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../..");

const basePhp = readFileSync(path.join(root, "aiaddin/wordpress/themes/yenitema/inc/vkv-page-base.php"), "utf8");
const ibPhp = readFileSync(path.join(root, "aiaddin/wordpress/themes/yenitema/page-isbirligi.php"), "utf8");
const sehitlikBundle = JSON.parse(
  readFileSync(path.join(root, "goalgo/data/vkd/pages-016.json"), "utf8"),
);
const sehitlikHtml = sehitlikBundle?.pageUpdates?.[0]?.bodyHtml ?? "";

function extractStyleBlocks(src) {
  const blocks = [];
  for (const m of src.matchAll(/<style>([\s\S]*?)<\/style>/gi)) blocks.push(m[1]);
  return blocks.join("\n");
}

const scope =
  ".hm-custom-page-body--corporate, .hm-custom-page-body--corporate .hm-vkd-page-root, .hm-vkd-page-root, .ms-portal";
const pageScope =
  ".hm-custom-page-body--corporate, .hm-custom-page-body--corporate .hm-vkd-page-root, .hm-vkd-page-root";

function scopeDangerousGlobalRules(css) {
  const scopedMainBlock = `${pageScope} #content, ${pageScope} .site-main, ${pageScope} .entry-content,
${pageScope} .page-content, ${pageScope} #primary, ${pageScope} #main, ${pageScope} .container,
${pageScope} .wp-block-group, ${pageScope} .wp-block-cover {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
}`;

  return css
    .replace(/#content,\s*main,\s*\.site-main[\s\S]*?\}/g, scopedMainBlock)
    .replace(/\*,\s*\*::before,\s*\*::after\s*\{[^}]+\}/g, "")
    .replace(
      /#content,#MainContent,main#content\{[^}]+\}/g,
      `${pageScope} #content, ${pageScope} #MainContent, ${pageScope} main#content{max-width:100%!important;padding:0!important;width:100%!important;margin:0!important}`,
    );
}

let css = `${extractStyleBlocks(basePhp)}\n${extractStyleBlocks(ibPhp)}\n${extractStyleBlocks(sehitlikHtml)}`;
css = scopeDangerousGlobalRules(css);
css = css
  .replace(/:root\s*\{/g, `${scope} {`)
  .replace(/max-width:\s*1440px/g, "max-width:1280px")
  .replace(/max-width:\s*1180px/g, "max-width:1280px")
  .replace(/--w:\s*1440px/g, "--w:1280px");

const header = "/* VKD kurumsal şablon sayfaları — tp-* / ib-* / ms-portal ortak stiller (1280px) */\n";
const outCss = header + css;
writeFileSync(path.join(root, "goalgo/artifacts/ahenkpress/src/styles/hmVkdCorporatePages.css"), outCss);
console.log("[gen-vkd-css] bytes:", Buffer.byteLength(outCss));

const faalPhp = readFileSync(path.join(root, "aiaddin/wordpress/themes/yenitema/page.faaliyetler.php"), "utf8");
let body = faalPhp.replace(/<\?[\s\S]*?\?>/g, "").replace(/<\?php[\s\S]*/g, "").trim();
const faalHtml = `<div class="hm-vkd-page-root">\n<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">\n${body}\n</div>`;
const bundle = {
  pageUpdates: [
    {
      id: "wp-template-faaliyetler",
      title: "Faaliyetler",
      slug: "faaliyetler",
      bodyHtml: faalHtml,
      enabled: true,
      fullWidth: false,
      importSource: "wordpress-template",
      sourceName: "page.faaliyetler.php",
      importedAt: new Date().toISOString(),
    },
  ],
};
writeFileSync(path.join(root, "goalgo/data/vkd/pages-021.json"), JSON.stringify(bundle));
console.log("[gen-vkd-css] faaliyetler bundle ok");
