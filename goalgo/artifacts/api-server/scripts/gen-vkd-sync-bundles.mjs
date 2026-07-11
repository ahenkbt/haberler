/**
 * VKD menü + sayfa paketlerini goalgo/data/vkd/ altına yazar (Railway startup sync için).
 *   npx tsx ./scripts/gen-vkd-sync-bundles.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeHmWpTemplatePageForSave,
  parseHmWpTemplatePageSource,
} from "../src/lib/hm-wp-template-pages.ts";
import { normalizeVkdInstitutionName } from "./gen-vkd-0055-fix.mjs";
import { scopeVkdImportedPageHtml, bakeVkdDirectoryPageScripts } from "./bake-vkd-page-scripts.mjs";
import { buildHakkimizdaBodyHtmlFromSavedPage } from "./patch-vkd-hakkimizda-from-html-save.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../data/vkd");
const THEME_DIR = "C:\\Users\\ahenk\\Downloads\\vatanvakfi\\wp-content\\themes\\vkv-wp-v2";
const PAGES_PER_BUNDLE = 2;
const PAGE_SYNC_VERSION = 4;
const MENU_SYNC_VERSION = 1;

const SKIP_THEME_SLUGS = new Set([
  "gazilerimiz",
  "isimsiz-kahramanlar",
  "kadin-kahramanlarimiz",
  "bakanlik",
  "turk-dunyasi-kahramanlari",
  "vefa-galerisi",
  "hakkimizda",
]);

const EXTRA_THEME_PAGES = [
  { fileName: "sehitlikler.php", slug: "sehitliklerimiz", title: "Şehitliklerimiz", cssRoots: [".ms-portal", ".hm-custom-page-body"] },
];

const TXT_PAGES = [
  { slug: "gazilerimiz", title: "Gazilerimiz", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\gazilerimiz.txt" },
  { slug: "isimsiz-kahramanlar", title: "İsimsiz Kahramanlar", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\isimsiz-kahramanlar.txt" },
  { slug: "kadin-kahramanlarimiz", title: "Kadın Kahramanlarımız", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\kadın kahramanlarımız.txt" },
  { slug: "bakanlik", title: "Bakanlık", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\bakanlık.txt" },
  { slug: "turk-dunyasi-kahramanlari", title: "Türk Dünyası Kahramanları", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\türk-dünyası.txt" },
  { slug: "vefa-galerisi", title: "Vefa Galerisi", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\vefa galerisi.txt" },
  {
    slug: "hakkimizda",
    title: "Hakkımızda",
    file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\hakkımızda.txt",
    builder: buildHakkimizdaBodyHtmlFromSavedPage,
  },
];

const TITLE_BY_SLUG = {
  bagis: "Bağış",
  burs: "Burs Programı",
  faaliyetler: "Faaliyetler",
  hakkimizda: "Hakkımızda",
  "hizmet-bolgesi": "Hizmet Bölgelerimiz",
  "hukuk-savunuculuk": "Hukuk ve Savunuculuk",
  "insani-yardim": "İnsani Yardım",
  "sehit-gazi-haklari": "Şehit-Gazi Hakları",
  "sosyal-hizmetler": "Sosyal Hizmetler",
  iletisim: "İletişim",
  isbirligi: "İşbirliği",
  "milli-gunler": "Millî Günler",
  "canakkale-savasi": "Çanakkale Savaşı",
  "kurtulus-savasi": "Kurtuluş Savaşı",
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

function loadMenuItems() {
  const sql = readFileSync(path.resolve(__dirname, "../../../lib/db/migrations/0055_vkd_menu_fix.sql"), "utf8");
  const match = sql.match(/\$vkd_menu_fix_json\$(\[.*?\])\$vkd_menu_fix_json\$/s);
  if (!match) throw new Error("Menu JSON not found in 0055");
  return JSON.parse(match[1]);
}

function preparePageBodyHtml(rawHtml, options = {}) {
  const normalized = normalizeVkdInstitutionName(String(rawHtml ?? ""));
  return scopeVkdImportedPageHtml(normalized, options);
}

function loadThemePages() {
  const pages = [];
  const phpFiles = readdirSync(THEME_DIR)
    .filter((name) => /^page[._-].*\.php$/i.test(name))
    .sort();
  for (let index = 0; index < phpFiles.length; index += 1) {
    const fileName = phpFiles[index];
    const filePath = path.join(THEME_DIR, fileName);
    if (readFileSync(filePath).byteLength === 0) continue;
    const slug = slugFromTemplateFilename(fileName);
    if (SKIP_THEME_SLUGS.has(slug)) continue;
    const rawFile = readFileSync(filePath, "utf8");
    const bakedRaw = bakeVkdDirectoryPageScripts(rawFile);
    const preview = parseHmWpTemplatePageSource(fileName, bakedRaw);
    const saved = normalizeHmWpTemplatePageForSave(
      {
        sourceName: fileName,
        title: TITLE_BY_SLUG[slug] ?? preview.title,
        slug,
        bodyHtml: preparePageBodyHtml(preview.bodyHtml),
        enabled: true,
        fullWidth: false,
      },
      index,
    );
    if (saved) pages.push(saved);
  }

  for (let index = 0; index < EXTRA_THEME_PAGES.length; index += 1) {
    const extra = EXTRA_THEME_PAGES[index];
    const filePath = path.join(THEME_DIR, extra.fileName);
    if (!readFileSync(filePath).byteLength) continue;
    const rawFile = readFileSync(filePath, "utf8");
    const bakedRaw = bakeVkdDirectoryPageScripts(rawFile);
    const preview = parseHmWpTemplatePageSource(extra.fileName, bakedRaw);
    const saved = normalizeHmWpTemplatePageForSave(
      {
        sourceName: extra.fileName,
        title: extra.title,
        slug: extra.slug,
        bodyHtml: preparePageBodyHtml(preview.bodyHtml, { cssRoots: extra.cssRoots, wrap: false }),
        enabled: true,
        fullWidth: false,
      },
      phpFiles.length + index,
    );
    if (saved) pages.push(saved);
  }
  return pages;
}

function loadTxtPages() {
  const pages = [];
  for (let index = 0; index < TXT_PAGES.length; index += 1) {
    const { slug, title, file, builder } = TXT_PAGES[index];
    const raw = readFileSync(file, "utf8");
    const bodyHtml = builder ? builder(raw) : raw;
    const saved = normalizeHmWpTemplatePageForSave(
      {
        sourceName: path.basename(file),
        title,
        slug,
        bodyHtml: preparePageBodyHtml(bodyHtml, { wrapperClass: slug === "hakkimizda" ? "vkd-hakkimizda-page" : "hm-vkd-page-root", wrap: slug !== "hakkimizda" }),
        enabled: true,
        fullWidth: false,
      },
      index,
    );
    if (saved) pages.push(saved);
  }
  return pages;
}

mkdirSync(OUT_DIR, { recursive: true });

const menuItems = loadMenuItems();
writeFileSync(
  path.join(OUT_DIR, "menu.json"),
  JSON.stringify({
    displayName: "VATAN KAHRAMANLARI DERNEĞİ",
    description: "Vatan Kahramanları Derneği resmi haber ve kurumsal vitrin sitesi.",
    hmCorporateMenuItems: menuItems,
  }),
  "utf8",
);

const allPages = [...loadThemePages(), ...loadTxtPages()];
let bundleIndex = 0;
for (let i = 0; i < allPages.length; i += PAGES_PER_BUNDLE) {
  bundleIndex += 1;
  const batch = allPages.slice(i, i + PAGES_PER_BUNDLE);
  const name = `pages-${String(bundleIndex).padStart(3, "0")}.json`;
  writeFileSync(path.join(OUT_DIR, name), JSON.stringify({ pageUpdates: batch }), "utf8");
}

writeFileSync(
  path.join(OUT_DIR, "manifest.json"),
  JSON.stringify(
    {
      version: 3,
      pageSyncVersion: PAGE_SYNC_VERSION,
      menuSyncVersion: MENU_SYNC_VERSION,
      menuItems: menuItems.length,
      pageBundles: bundleIndex,
      pageCount: allPages.length,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Wrote ${OUT_DIR}: menu + ${bundleIndex} page bundles (${allPages.length} pages)`);
