/**
 * VKD menü + sayfa güncellemelerini canlı API'ye parça parça uygular.
 *
 *   set ADMIN_MAINTENANCE_SECRET=...
 *   npx tsx ./scripts/apply-vkd-layout-delta.mjs
 *   npx tsx ./scripts/apply-vkd-layout-delta.mjs --api=https://goalgo-production.up.railway.app
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  normalizeHmWpTemplatePageForSave,
  parseHmWpTemplatePageSource,
} from "../src/lib/hm-wp-template-pages.ts";
import { applyHmLayoutDelta, parseHmLayoutJson } from "../src/lib/hm-layout-delta.ts";
import { normalizeVkdInstitutionName } from "./gen-vkd-0055-fix.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const THEME_DIR = "C:\\Users\\ahenk\\Downloads\\vatanvakfi\\wp-content\\themes\\vkv-wp-v2";
const SITE_SLUG = "vkd";
const INSTITUTION = "VATAN KAHRAMANLARI DERNEĞİ";
const DEFAULT_API = "https://yekpare.net";
const PAGES_PER_BATCH = 2;

const SKIP_THEME_SLUGS = new Set([
  "gazilerimiz",
  "isimsiz-kahramanlar",
  "kadin-kahramanlarimiz",
  "bakanlik",
  "turk-dunyasi-kahramanlari",
  "vefa-galerisi",
]);

const TXT_PAGES = [
  { slug: "gazilerimiz", title: "Gazilerimiz", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\gazilerimiz.txt" },
  { slug: "isimsiz-kahramanlar", title: "İsimsiz Kahramanlar", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\isimsiz-kahramanlar.txt" },
  { slug: "kadin-kahramanlarimiz", title: "Kadın Kahramanlarımız", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\kadın kahramanlarımız.txt" },
  { slug: "bakanlik", title: "Bakanlık", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\bakanlık.txt" },
  { slug: "turk-dunyasi-kahramanlari", title: "Türk Dünyası Kahramanları", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\türk-dünyası.txt" },
  { slug: "vefa-galerisi", title: "Vefa Galerisi", file: "C:\\Users\\ahenk\\OneDrive\\Belgeler\\vefa galerisi.txt" },
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

function argVal(name) {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

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
    const preview = parseHmWpTemplatePageSource(fileName, readFileSync(filePath));
    const saved = normalizeHmWpTemplatePageForSave(
      {
        sourceName: fileName,
        title: TITLE_BY_SLUG[slug] ?? preview.title,
        slug,
        bodyHtml: normalizeVkdInstitutionName(preview.bodyHtml),
        enabled: true,
        fullWidth: true,
      },
      index,
    );
    if (saved) pages.push(saved);
  }
  return pages;
}

function loadTxtPages() {
  const pages = [];
  for (let index = 0; index < TXT_PAGES.length; index += 1) {
    const { slug, title, file } = TXT_PAGES[index];
    const raw = readFileSync(file, "utf8");
    const saved = normalizeHmWpTemplatePageForSave(
      {
        sourceName: path.basename(file),
        title,
        slug,
        bodyHtml: normalizeVkdInstitutionName(raw),
        enabled: true,
        fullWidth: true,
      },
      index,
    );
    if (saved) pages.push(saved);
  }
  return pages;
}

async function postDelta(apiBase, secret, payload) {
  const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/hm/admin/sites/${encodeURIComponent(SITE_SLUG)}/layout-delta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Yekpare-Admin-Secret": secret,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`layout-delta ${res.status}: ${text.slice(0, 400)}`);
  return text;
}

async function applyDeltaToDb(payload) {
  const { db, hmNewsSitesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const [site] = await db.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, SITE_SLUG)).limit(1);
  if (!site) throw new Error(`HM site bulunamadı: ${SITE_SLUG}`);

  const prev = parseHmLayoutJson(site.layoutJson);
  const { layout, updatedPages, menuUpdated } = applyHmLayoutDelta(prev, payload);
  const layoutJson = JSON.stringify(layout);
  if (layoutJson.length > 1_000_000) {
    throw new Error(`layout_json çok büyük (${layoutJson.length} / 1000000)`);
  }

  const patch = {
    layoutJson,
    updatedAt: new Date(),
  };
  if (typeof payload.displayName === "string" && payload.displayName.trim()) {
    patch.displayName = payload.displayName.trim();
  }
  if (typeof payload.description === "string" && payload.description.trim()) {
    patch.description = payload.description.trim();
  }

  await db.update(hmNewsSitesTable).set(patch).where(eq(hmNewsSitesTable.id, site.id));
  return { updatedPages, menuUpdated };
}

async function main() {
  const useDb = process.argv.includes("--db");
  const apiBase = (argVal("--api") ?? DEFAULT_API).trim();
  const secret = String(process.env.ADMIN_MAINTENANCE_SECRET ?? "").trim();

  if (useDb) {
    const dbUrl = String(process.env.DATABASE_URL ?? "").trim();
    if (!dbUrl || dbUrl.includes("localhost") || dbUrl.includes("kullanici:sifre")) {
      console.error("Canlı DB için geçerli DATABASE_URL gerekli (Railway Postgres → Connect).");
      process.exit(1);
    }
  } else if (!secret) {
    console.error("ADMIN_MAINTENANCE_SECRET tanımlı değil (veya --db kullanın).");
    process.exit(1);
  }

  const menuItems = loadMenuItems();
  const menuPayload = {
    displayName: INSTITUTION,
    description: "Vatan Kahramanları Derneği resmi haber ve kurumsal vitrin sitesi.",
    hmCorporateMenuItems: menuItems,
  };

  console.log("1/… Menü uygulanıyor…");
  if (useDb) {
    await applyDeltaToDb(menuPayload);
  } else {
    await postDelta(apiBase, secret, menuPayload);
  }
  console.log(`Menü tamam (${menuItems.length} madde).`);

  const allPages = [...loadThemePages(), ...loadTxtPages()];
  console.log(`2/… ${allPages.length} sayfa parça parça uygulanıyor…`);
  for (let i = 0; i < allPages.length; i += PAGES_PER_BATCH) {
    const batch = allPages.slice(i, i + PAGES_PER_BATCH);
    if (useDb) {
      await applyDeltaToDb({ pageUpdates: batch });
    } else {
      await postDelta(apiBase, secret, { pageUpdates: batch });
    }
    console.log(`  • ${i + batch.length}/${allPages.length}`);
  }

  console.log(`\nBitti. https://yekpare.net/tr/${SITE_SLUG}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
