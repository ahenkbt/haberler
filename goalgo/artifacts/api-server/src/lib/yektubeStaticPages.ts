import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";

export type YektubeStaticPage = {
  id: string;
  slug: string;
  title: string;
  lastUpdated: string;
  body: string;
  /** Sol menüde gösterilecek etiket; boşsa menüde görünmez */
  sidebarLabel?: string | null;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_TELIF_BODY = `## Platform Hakkında

YekTube, Türkiye'nin ve Türk Dünyasının yerli ve milli arama motoru ve süper uygulaması (Super App) ekosistemi tarafından sağlanan yenilikçi bir video içerik platformudur. YekTube; yektube.com ve yekpare.net/yp/ adresleri üzerinden bağımsız olarak hizmet verdiği gibi, aynı zamanda yekpare.net/habermerkezi altyapısını kullanan ulusal ve yerel haber sitelerinin video/TV sayfalarından da yayın yapan entegre bir video portalı olarak faaliyet göstermektedir.

## 1. İçerik Sağlama Yöntemi ve Sorumluluk Sınırı

### YouTube API Kullanımı

YekTube platformunda yer alan tüm normal videolar, oynatma listeleri (playlist), kanallar ve canlı yayınlar, YouTube Data API aracılığıyla ve YouTube'un resmi yerleştirme (embed) kurallarına tam uyumlu olarak yayınlanmaktadır.

### Barındırma (Hosting) Durumu

YekTube, sistem altyapısında doğrudan herhangi bir video dosyası barındırmaz. Sitede gösterimi yapılan tüm dijital içerikler kaynak olarak doğrudan YouTube sunucularından anlık çekilmektedir. Bu bağlamda, asıl kaynağı YouTube olan içerikler için YekTube'a karşı herhangi bir telif hakkı ihlali iddiasında bulunulamaz, platformumuzdan telif talep edilemez. Telif hakkı sahiplerinin, taleplerini yasal olarak içeriğin asıl barındırıldığı yer olan YouTube platformuna iletmeleri gerekmektedir.

### Yayıncı Sorumluluğu

Platformumuzda gösterimi sunulan tüm içeriklerin hukuki, cezai ve mali sorumluluğu tamamen ilgili videonun YouTube üzerindeki kendi yayıncısını ve sahibini bağlar. YekTube sadece video gösterimi yapan bir aracı platformdur.

## 2. Kullanıcı Katkıları ve YekTube'un Hak Talebi

### Kullanıcıların Eklediği İçerikler

Kullanıcılar veya iş ortakları tarafından YouTube bağlantıları (link) ve entegrasyon araçları kullanılarak YekTube veya Yekpare haber siteleri altyapısına eklenen hiçbir video, kanal veya yayın üzerinde YekTube herhangi bir telif ya da hak talebinde bulunmamaktadır. İçerik sahipleri, içeriklerinin telif ve mülkiyet haklarını kendilerinde saklı tutarlar.

## 3. Yasaklı İçerikler ve Yayın İlkeleri

YekTube, topluluk güvenliğine, evrensel hukuka ve kişi haklarına yüksek düzeyde saygı duyan milli bir platformdur. Kaynağı YouTube platformu olsa dahi, aşağıdaki nitelikleri taşıyan videoların YekTube ekosisteminde listelenmesine ve gösterilmesine kesinlikle izin verilmez:

- Gerçek veya tüzel kişilere, kamu veya özel kurumlara karşı yapılan hakaret, tehdit, iftira veya karalama niteliği taşıyan içerikler,
- Toplumu kin, nefret ve düşmanlığa tahrik eden, ayrımcılık içeren veya ulusal güvenliği tehdit eden yayınlar,
- Yasalara aykırı, telif hırsızlığı içeren, müstehcen veya genel ahlak kurallarını ihlal eden içerikler.

## 4. "Uyar-Kaldır" Sistemi ve Hukuki Uyum

Platformumuz, 5651 sayılı Kanun kapsamında "Yer Sağlayıcı" ilkesiyle hareket etmektedir. Sistemimizin büyüklüğü, geniş haber ağı entegrasyonları ve anlık içerik akışı göz önünde bulundurulduğunda, eklenen her videonun içeriğinin önceden tek tek denetlenmesi teknik olarak mümkün değildir. Ancak:

- Sistemimiz tarafından gözden kaçan,
- Hak sahipleri tarafından haklı nedenlerle itiraz edilen,
- Kişilik haklarını ihlal ettiği veya haksız rekabet yarattığı gerekçesiyle bildirilen,
- Veya hukuki/resmi merciler tarafından kaldırılması zorunlu hale getirilen tüm içerikler, şikayet veya bildirim tarafımıza ulaştığı anda incelenerek derhal ve anında YekTube sisteminden kaldırılır.

## 5. Kurumsal Bilgiler ve İletişim

Telif hakkı ihlalleri, kişilik haklarının ihlali veya yasalara aykırı olduğunu düşündüğünüz içeriklerin kaldırılması talepleri (Uyar-Kaldır) için resmi işletici kurumumuzla aşağıdaki kanallar üzerinden iletişime geçebilirsiniz. Yapılan başvurular yasal süreler içerisinde ivedilikle incelenerek gerekli aksiyonlar alınacaktır.

**E-Posta:** ahenkbt@gmail.com

**Yasal Sahibi:** Ahenk Bilgi Teknolojileri Ltd

**Kayıtlı Adres:** 71-75, Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ`;

function defaultPages(): YektubeStaticPage[] {
  const now = new Date().toISOString();
  return [
    {
      id: "telif-kullanim-default",
      slug: "telif-kullanim",
      title: "YekTube Telif Hakkı ve Kullanım Şartları",
      lastUpdated: "29 Haziran 2026",
      body: DEFAULT_TELIF_BODY,
      sidebarLabel: "Telif & Kullanım",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

let pagesCache: YektubeStaticPage[] | null = null;

async function ensurePagesColumn(): Promise<void> {
  await db.execute(sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS yektube_static_pages_json TEXT`);
}

async function readPagesJsonRaw(): Promise<string | null> {
  await ensurePagesColumn();
  const result = await db.execute(sql`SELECT yektube_static_pages_json FROM site_settings LIMIT 1`);
  const rows = (result as { rows?: Array<{ yektube_static_pages_json?: string | null }> }).rows ?? result;
  const row = Array.isArray(rows) ? rows[0] : null;
  const json = row?.yektube_static_pages_json;
  return typeof json === "string" ? json : null;
}

async function writePagesJsonRaw(json: string): Promise<void> {
  await ensurePagesColumn();
  const [existing] = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable).limit(1);
  if (existing) {
    await db.execute(
      sql`UPDATE site_settings SET yektube_static_pages_json = ${json} WHERE id = ${existing.id}`,
    );
  }
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 80;
}

function normalizePage(raw: unknown): YektubeStaticPage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<YektubeStaticPage>;
  const slug = typeof o.slug === "string" ? slugify(o.slug) : "";
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const body = typeof o.body === "string" ? o.body : "";
  const lastUpdated = typeof o.lastUpdated === "string" ? o.lastUpdated.trim() : "";
  const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : randomUUID();
  if (!isValidSlug(slug) || !title) return null;
  const now = new Date().toISOString();
  return {
    id,
    slug,
    title,
    lastUpdated: lastUpdated || "—",
    body,
    sidebarLabel:
      typeof o.sidebarLabel === "string" && o.sidebarLabel.trim() ? o.sidebarLabel.trim() : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : now,
  };
}

function normalizePages(raw: unknown): YektubeStaticPage[] {
  if (!Array.isArray(raw)) return defaultPages();
  const pages = raw.map(normalizePage).filter((p): p is YektubeStaticPage => p !== null);
  return pages.length > 0 ? pages : defaultPages();
}

export async function loadStaticPages(): Promise<YektubeStaticPage[]> {
  if (pagesCache) return pagesCache;
  const raw = await readPagesJsonRaw();
  if (!raw?.trim()) {
    const seeded = defaultPages();
    await writePagesJsonRaw(JSON.stringify(seeded));
    pagesCache = seeded;
    return seeded;
  }
  try {
    pagesCache = normalizePages(JSON.parse(raw));
  } catch {
    pagesCache = defaultPages();
  }
  return pagesCache;
}

async function persistPages(pages: YektubeStaticPage[]): Promise<YektubeStaticPage[]> {
  const normalized = normalizePages(pages);
  await writePagesJsonRaw(JSON.stringify(normalized));
  pagesCache = normalized;
  return normalized;
}

export function invalidateStaticPagesCache(): void {
  pagesCache = null;
}

export async function getStaticPageBySlug(slug: string): Promise<YektubeStaticPage | null> {
  const key = slugify(slug);
  const pages = await loadStaticPages();
  return pages.find((p) => p.slug === key) ?? null;
}

export async function listSidebarStaticPages(): Promise<
  Array<Pick<YektubeStaticPage, "slug" | "title" | "sidebarLabel">>
> {
  const pages = await loadStaticPages();
  return pages
    .filter((p) => p.sidebarLabel)
    .map((p) => ({ slug: p.slug, title: p.title, sidebarLabel: p.sidebarLabel }));
}

export type CreateStaticPageInput = {
  slug: string;
  title: string;
  lastUpdated?: string;
  body?: string;
  sidebarLabel?: string | null;
};

export async function createStaticPage(input: CreateStaticPageInput): Promise<YektubeStaticPage> {
  const slug = slugify(input.slug);
  if (!isValidSlug(slug)) throw new Error("Geçersiz slug");
  const title = input.title.trim();
  if (!title) throw new Error("Başlık gerekli");
  const pages = await loadStaticPages();
  if (pages.some((p) => p.slug === slug)) throw new Error("Bu slug zaten kullanılıyor");
  const now = new Date().toISOString();
  const page: YektubeStaticPage = {
    id: randomUUID(),
    slug,
    title,
    lastUpdated: input.lastUpdated?.trim() || "—",
    body: input.body ?? "",
    sidebarLabel: input.sidebarLabel?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
  await persistPages([...pages, page]);
  return page;
}

export type UpdateStaticPageInput = Partial<
  Pick<YektubeStaticPage, "slug" | "title" | "lastUpdated" | "body" | "sidebarLabel">
>;

export async function updateStaticPage(id: string, input: UpdateStaticPageInput): Promise<YektubeStaticPage> {
  const pages = await loadStaticPages();
  const idx = pages.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Sayfa bulunamadı");
  const current = pages[idx]!;
  let slug = current.slug;
  if (typeof input.slug === "string" && input.slug.trim()) {
    slug = slugify(input.slug);
    if (!isValidSlug(slug)) throw new Error("Geçersiz slug");
    if (pages.some((p) => p.slug === slug && p.id !== id)) throw new Error("Bu slug zaten kullanılıyor");
  }
  const next: YektubeStaticPage = {
    ...current,
    slug,
    title: typeof input.title === "string" && input.title.trim() ? input.title.trim() : current.title,
    lastUpdated:
      typeof input.lastUpdated === "string" && input.lastUpdated.trim()
        ? input.lastUpdated.trim()
        : current.lastUpdated,
    body: typeof input.body === "string" ? input.body : current.body,
    sidebarLabel:
      input.sidebarLabel === null
        ? null
        : typeof input.sidebarLabel === "string"
          ? input.sidebarLabel.trim() || null
          : current.sidebarLabel ?? null,
    updatedAt: new Date().toISOString(),
  };
  const updated = [...pages];
  updated[idx] = next;
  await persistPages(updated);
  return next;
}

export async function deleteStaticPage(id: string): Promise<void> {
  const pages = await loadStaticPages();
  const next = pages.filter((p) => p.id !== id);
  if (next.length === pages.length) throw new Error("Sayfa bulunamadı");
  if (next.length === 0) throw new Error("Son sayfa silinemez");
  await persistPages(next);
}

export { isValidSlug, slugify };
