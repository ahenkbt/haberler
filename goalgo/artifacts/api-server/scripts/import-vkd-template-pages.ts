/**
 * WordPress PHP template sayfalarını HM layout'a yazar (VKD vb.).
 *
 *   pnpm run import:vkd-pages -- "C:/Users/ahenk/Downloads/sayfalar"
 *   pnpm run import:vkd-pages -- --dry-run "C:/path/sayfalar"
 *   pnpm run import:vkd-pages -- --apply-remote --api=https://goalgo-production.up.railway.app "C:/path/sayfalar"
 *
 * Uzak uygulama için Railway'deki ADMIN_MAINTENANCE_SECRET ortam değişkeni gerekir.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: path.join(__dirname, "../../../.env") });
dotenvConfig({ path: path.join(__dirname, "../.env") });

import {
  mergeWpTemplatePagesIntoLayout,
  normalizeHmWpTemplatePageForSave,
  parseHmWpTemplatePageSource,
} from "../src/lib/hm-wp-template-pages";

function normalizeVkdInstitutionName(raw: string): string {
  const INSTITUTION = "VATAN KAHRAMANLARI DERNEĞİ";
  let out = String(raw ?? "");
  out = out.replace(/Vatan Kahramanları Vakfı/gi, INSTITUTION);
  out = out.replace(/Vatan Kahramanları Derneği/gi, INSTITUTION);
  out = out.replace(/VATAN KAHRAMANLARI VAKFI/gi, INSTITUTION);
  return out;
}

const SITE_DISPLAY_NAME = "VATAN KAHRAMANLARI DERNEĞİ";
const LAYOUT_JSON_MAX_CHARS = 2_000_000;
const DEFAULT_META_API = "https://goalgo-production.up.railway.app";

function argVal(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

function slugFromTemplateFilename(sourceName: string): string {
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

const TITLE_BY_SLUG: Record<string, string> = {
  bagis: "Bağış",
  burs: "Burs Programı",
  faaliyetler: "Faaliyetler",
  hakkimizda: "Hakkımızda",
  "hizmet-bolgesi": "Hizmet Bölgeleri",
  "hukuk-savunuculuk": "Hukuk & Savunuculuk",
  "insani-yardim": "İnsani Yardım",
  kahramanlar: "Kahramanlarımız",
  sehitlerimiz: "Şehitlerimiz",
  sehitgazi: "Şehit & Gazi",
  gazilerimiz: "Gazilerimiz",
};

const SLIDER_BAND_QUICK_LINKS = [
  { icon: "🕊️", label: "Şehitler & Gaziler", subtitle: "Kahramanlarımız", href: "/sehitlerimiz" },
  { icon: "🎖️", label: "Kahramanlarımız", subtitle: "Vatan için mücadele", href: "/kahramanlar" },
  { icon: "⚖️", label: "Hukuk & Savunuculuk", subtitle: "Yasal destek", href: "/hukuk-savunuculuk" },
  { icon: "🎓", label: "Burs Programı", subtitle: "Eğitim desteği", href: "/burs" },
  { icon: "🤝", label: "İnsani Yardım", subtitle: "Temel ihtiyaç", href: "/insani-yardim" },
  { icon: "📅", label: "Etkinlikler", subtitle: "Anma törenleri", href: "/faaliyetler" },
  { icon: "🗺️", label: "Hizmet Bölgeleri", subtitle: "Yaygın destek ağı", href: "/hizmet-bolgesi" },
] as const;

function parseHmLayoutJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw || !String(raw).trim()) return {};
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function fetchPrevLayoutFromMeta(siteSlug: string, apiBase: string): Promise<Record<string, unknown>> {
  const url = `${apiBase.replace(/\/+$/, "")}/api/hm/meta/by-slug/${encodeURIComponent(siteSlug)}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  const json = (await res.json()) as { layout?: unknown };
  return json.layout && typeof json.layout === "object" && !Array.isArray(json.layout)
    ? (json.layout as Record<string, unknown>)
    : {};
}

function applyVkdLayoutExtras(layout: Record<string, unknown>): Record<string, unknown> {
  layout.hmVitrinTheme = "corporate";
  layout.corporateBandItems = null;
  layout.hmCorporateQuickLinks = SLIDER_BAND_QUICK_LINKS.map((item, index) => ({
    id: `vkd-quick-${index + 1}`,
    label: item.label,
    subtitle: item.subtitle,
    href: item.href,
    icon: item.icon,
    enabled: true,
  }));
  return layout;
}

async function main() {
  const siteSlug = (argVal("--site-slug") ?? "vkd").trim().toLowerCase();
  const dryRun = process.argv.includes("--dry-run");
  const applyRemote = process.argv.includes("--apply-remote");
  const freshLayout = process.argv.includes("--fresh");
  const apiBase = (argVal("--api") ?? DEFAULT_META_API).replace(/\/+$/, "");
  const outPath = argVal("--out") ?? path.join(__dirname, "out", `${siteSlug}-layout-import.json`);
  const dirArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!dirArg) {
    console.error(
      'Kullanım: pnpm run import:vkd-pages -- [--site-slug=vkd] [--dry-run|--apply-remote] [--api=URL] "C:/path/sayfalar"',
    );
    process.exit(1);
  }
  if (!dryRun && !applyRemote && !process.env.DATABASE_URL) {
    console.error("DATABASE_URL tanımlı değil (--dry-run veya --apply-remote kullanın).");
    process.exit(1);
  }

  const sourceDir = path.resolve(dirArg);
  const entries = await readdir(sourceDir);
  const phpFiles = entries.filter((name) => /^page[._-].*\.php$/i.test(name)).sort();
  if (phpFiles.length === 0) {
    console.error(`PHP template bulunamadı: ${sourceDir}`);
    process.exit(1);
  }

  const pages = [];
  for (let index = 0; index < phpFiles.length; index += 1) {
    const fileName = phpFiles[index]!;
    const buffer = await readFile(path.join(sourceDir, fileName));
    if (buffer.byteLength === 0) {
      console.warn(`Boş dosya atlandı: ${fileName}`);
      continue;
    }
    const preview = parseHmWpTemplatePageSource(fileName, buffer);
    const slug = slugFromTemplateFilename(fileName);
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
    if (!saved) {
      console.warn(`Atlandı (geçersiz): ${fileName}`);
      continue;
    }
    pages.push(saved);
    console.log(`  • ${saved.title} → /${saved.slug}`);
  }

  if (!pages.some((p) => p.slug === "gazilerimiz")) {
    const placeholder = normalizeHmWpTemplatePageForSave(
      {
        sourceName: "page-gazilerimiz.php",
        title: "Gazilerimiz",
        slug: "gazilerimiz",
        bodyHtml:
          '<div class="tp-sec"><div class="tp-sec-w"><h2 class="tp-sec-title">Gazilerimiz</h2><p>Vatan uğruna gönüllü hizmet etmiş gazilerimizin onurunu yaşatmak için çalışıyoruz.</p></div></div>',
        enabled: true,
        fullWidth: true,
      },
      pages.length,
    );
    if (placeholder) {
      pages.push(placeholder);
      console.log(`  • ${placeholder.title} → /${placeholder.slug} (placeholder)`);
    }
  }

  if (pages.length === 0) {
    console.error("İçe aktarılacak geçerli sayfa yok.");
    process.exit(1);
  }

  let prevLayout: Record<string, unknown> = {};
  if (!freshLayout && (dryRun || applyRemote)) {
    prevLayout = await fetchPrevLayoutFromMeta(siteSlug, apiBase);
    console.log(`Mevcut layout meta'dan birleştirildi (${Object.keys(prevLayout).length} anahtar).`);
  } else if (!dryRun && !applyRemote) {
    const { db, hmNewsSitesTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [site] = await db.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, siteSlug)).limit(1);
    if (!site) {
      console.error(`HM site bulunamadı: slug=${siteSlug}`);
      process.exit(1);
    }
    prevLayout = parseHmLayoutJson(site.layoutJson);
  }

  const merged = mergeWpTemplatePagesIntoLayout(prevLayout, pages, { overwrite: true, addToCorporateMenu: false });
  applyVkdLayoutExtras(merged.layout);

  const layoutJson = JSON.stringify(merged.layout);
  if (layoutJson.length > LAYOUT_JSON_MAX_CHARS) {
    console.error(`layout_json çok büyük (${layoutJson.length} / ${LAYOUT_JSON_MAX_CHARS}).`);
    process.exit(1);
  }

  const payload = {
    siteSlug,
    displayName: SITE_DISPLAY_NAME,
    description: "Vatan Kahramanları Derneği resmi haber ve kurumsal vitrin sitesi.",
    layout: merged.layout,
    stats: {
      createdCount: merged.createdCount,
      updatedCount: merged.updatedCount,
      pageCount: pages.length,
    },
  };

  if (dryRun) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");
    console.log(`\nDry-run: ${outPath} (${layoutJson.length} karakter layout)`);
    return;
  }

  if (applyRemote) {
    const secret = String(process.env.ADMIN_MAINTENANCE_SECRET ?? "").trim();
    if (!secret) {
      console.error("ADMIN_MAINTENANCE_SECRET tanımlı değil.");
      process.exit(1);
    }
    const res = await fetch(`${apiBase}/api/hm/admin/sites/${encodeURIComponent(siteSlug)}/import-layout-bundle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Yekpare-Admin-Secret": secret,
      },
      body: JSON.stringify({
        displayName: payload.displayName,
        description: payload.description,
        layout: payload.layout,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`Uzak uygulama başarısız (${res.status}): ${text.slice(0, 400)}`);
      process.exit(1);
    }
    console.log(`\nCanlıya uygulandı: ${text}`);
    console.log(`Önizleme: https://yekpare.net/tr/${siteSlug}`);
    return;
  }

  const { db, hmNewsSitesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const [site] = await db.select().from(hmNewsSitesTable).where(eq(hmNewsSitesTable.slug, siteSlug)).limit(1);
  if (!site) {
    console.error(`HM site bulunamadı: slug=${siteSlug}`);
    process.exit(1);
  }

  await db
    .update(hmNewsSitesTable)
    .set({
      displayName: SITE_DISPLAY_NAME,
      description: payload.description,
      layoutJson,
      updatedAt: new Date(),
    })
    .where(eq(hmNewsSitesTable.id, site.id));

  console.log(`\nBitti. Site: ${siteSlug} (id ${site.id}) — ${SITE_DISPLAY_NAME}`);
  console.log(`Sayfalar: +${merged.createdCount} yeni, ${merged.updatedCount} güncellendi (toplam ${pages.length} dosya).`);
  console.log(`Slider altı hızlı erişim: ${SLIDER_BAND_QUICK_LINKS.length} emoji kutusu ayarlandı.`);
  console.log(`Önizleme: https://yekpare.net/tr/${siteSlug}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
