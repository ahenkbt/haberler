import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

type Row = Record<string, unknown>;

export type VendorThemeSlotType = "text" | "textarea" | "image" | "color";

export type VendorThemeSlotDef = {
  key: string;
  label: string;
  type: VendorThemeSlotType;
  defaultValue?: string;
  placeholder?: string;
};

export type VendorThemeDef = {
  key: string;
  name: string;
  description: string;
  previewImage: string;
  cssHref: string;
  themeGroup?: string;
  /** alisveris | siparis | turizm | ulasim */
  verticals: string[];
  /** provider_subtype eşleşmeleri (boş = tüm alt türler) */
  subtypes: string[];
  slots: VendorThemeSlotDef[];
};

export const VENDOR_THEME_CATALOG: VendorThemeDef[] = [
  {
    key: "foodmart",
    name: "Market Vitrini",
    description: "Modern e-ticaret / market vitrini",
    previewImage: "/vendor-themes/foodmart/FoodMart-1.0.0/images/ad-image-1.png",
    cssHref: "/vendor-themes/foodmart/FoodMart-1.0.0/style.css",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Taze ürünler, hızlı teslimat" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Siparişinizi hemen verin, kapınıza gelsin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/foodmart/FoodMart-1.0.0/images/ad-image-1.png" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Ücretsiz kargo fırsatı" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#3BB77E" },
    ],
  },
  {
    key: "sellzy-store",
    name: "Pazaryeri Mağazası",
    description: "Modern çok satıcılı alışveriş mağazası",
    previewImage: "/vendor-themes/ecommerce/sellzy-store.svg",
    cssHref: "/vendor-themes/ecommerce/sellzy-store.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Mağazanız Yekpare pazaryerinde" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Ürünlerinizi modern pazaryeri görünümüyle sergileyin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/sellzy-store.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Pazaryeri vitrini" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#10b981" },
    ],
  },
  {
    key: "nest-market",
    name: "Yeşil Market",
    description: "Market, gıda ve çok kategorili mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/nest-market.svg",
    cssHref: "/vendor-themes/ecommerce/nest-market.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Günlük ihtiyaçlar, taze ürünler" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Ürünlerinizi ferah ve kategori odaklı market vitriniyle yayınlayın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/nest-market.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Market teması" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#3bb77e" },
    ],
  },
  {
    key: "pixio-shop",
    name: "Butik Koleksiyon",
    description: "Moda, butik ve lifestyle mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/pixio-shop.svg",
    cssHref: "/vendor-themes/ecommerce/pixio-shop.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Yeni sezon mağazanızda" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Moda ve butik ürünleri güçlü görsel odaklı mağaza vitrininde sergileyin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/pixio-shop.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Stil vitrini" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#ea580c" },
    ],
  },
  {
    key: "kartify-shop",
    name: "Kartlı Mağaza",
    description: "Hızlı, kart odaklı modern e-ticaret vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-shop.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-shop.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Ürünlerinizi hızlıca keşfettirin" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Kampanya, ürün kartı ve kategori geçişleri güçlü bir alışveriş vitrini." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-shop.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Kartlı mağaza" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#4f46e5" },
    ],
  },
  {
    key: "kartify-gadget",
    name: "Teknoloji Showroom",
    description: "Teknoloji, aksesuar ve gadget mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-gadget.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-gadget.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Yeni nesil ürünler vitrinde" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Gadget, aksesuar ve teknoloji ürünlerini net kartlar ve hızlı kampanyalarla sergileyin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-gadget.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Teknoloji vitrini" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#2563eb" },
    ],
  },
  {
    key: "kartify-mega-mart",
    name: "Mega Market",
    description: "Çok kategorili kampanya ve market vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-mega-mart.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-mega-mart.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Tüm kategoriler tek mağazada" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Mega mart düzeniyle kampanyaları, kategorileri ve öne çıkan ürünleri birlikte gösterin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-mega-mart.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Mega market" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#f97316" },
    ],
  },
  {
    key: "kartify-organic-store",
    name: "Organik Mağaza",
    description: "Organik ürün, gıda ve doğal market vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-organic-store.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-organic-store.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Doğal ürünler, ferah vitrin" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Organik market ve sağlıklı yaşam ürünlerini yumuşak renkli mağaza görünümüyle sunun." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-organic-store.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Organik vitrin" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#65a30d" },
    ],
  },
  {
    key: "kartify-style-tech",
    name: "Stil & Teknoloji",
    description: "Lifestyle, moda ve teknoloji karması vitrin",
    previewImage: "/vendor-themes/ecommerce/kartify-style-tech.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-style-tech.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Stil ve teknolojiyi buluşturun" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Aksesuar, moda ve teknoloji ürünleri için modern ve kontrastlı vitrin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-style-tech.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Stil teknoloji" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#7c3aed" },
    ],
  },
  {
    key: "kartify-electro",
    name: "Elektronik Mağazası",
    description: "Elektronik ve cihaz odaklı mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-electro.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-electro.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Elektronik fırsatları öne çıkarın" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Cihaz, bilgisayar ve elektronik ürünleri güçlü kontrastlı mağaza temasıyla yayınlayın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-electro.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Elektronik vitrin" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#0ea5e9" },
    ],
  },
  {
    key: "kartify-baby-shop",
    name: "Bebek & Çocuk",
    description: "Bebek, çocuk ve oyuncak mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-baby-shop.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-baby-shop.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Minikler için renkli mağaza" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Bebek, çocuk ve oyuncak ürünlerini pastel renkli sıcak bir vitrinle sergileyin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-baby-shop.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Bebek mağazası" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#f472b6" },
    ],
  },
  {
    key: "listinghub-shop",
    name: "Rehberli Mağaza",
    description: "Rehber ve mağaza karması ürün vitrini",
    previewImage: "/vendor-themes/ecommerce/listinghub-shop.svg",
    cssHref: "/vendor-themes/ecommerce/listinghub-shop.css",
    themeGroup: "Alışveriş Mağaza Temaları",
    verticals: ["alisveris", "ecommerce"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Mağazanızı rehber gücüyle tanıtın" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "İşletme bilgisi, ürünler ve iletişimi listeleme odaklı vitrinde birleştirin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/listinghub-shop.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Rehberli vitrin" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#0ea5e9" },
    ],
  },
  {
    key: "sarab",
    name: "Sarab",
    description: "Restoran ve sipariş vitrini",
    previewImage: "/vendor-themes/sarab/sarab-1.0.0/sarab/img/menu/1.jpg",
    cssHref: "/vendor-themes/sarab/sarab-1.0.0/sarab/css/style.css",
    verticals: ["siparis", "delivery"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Lezzet kapınızda" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Menümüzden seçin, hızlıca sipariş verin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/sarab/sarab-1.0.0/sarab/img/menu/1.jpg" },
      { key: "ctaText", label: "Sipariş butonu metni", type: "text", defaultValue: "Menüye göz at" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#c8a97e" },
    ],
  },
  {
    key: "restaurantly",
    name: "Restaurantly",
    description: "Fine dining / şık restoran vitrini",
    previewImage: "/vendor-themes/restaurant-cafe/restaurantly.svg",
    cssHref: "/vendor-themes/restaurant-cafe/restaurantly.css",
    themeGroup: "Restaurant ve Cafe Temaları",
    verticals: ["siparis", "delivery"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Özel lezzetler, zarif sunum" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Restoranınızın atmosferini ve menüsünü şık bir vitrinle gösterin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/restaurant-cafe/restaurantly.svg" },
      { key: "ctaText", label: "Sipariş butonu metni", type: "text", defaultValue: "Menüyü incele" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#cda45e" },
    ],
  },
  {
    key: "delfood",
    name: "Delfood",
    description: "Canlı, modern paket servis teması",
    previewImage: "/vendor-themes/restaurant-cafe/delfood.svg",
    cssHref: "/vendor-themes/restaurant-cafe/delfood.css",
    themeGroup: "Restaurant ve Cafe Temaları",
    verticals: ["siparis", "delivery"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Hızlı sipariş, sıcak lezzet" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Paket servis ve restoran menünüz için enerjik bir vitrin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/restaurant-cafe/delfood.svg" },
      { key: "ctaText", label: "Sipariş butonu metni", type: "text", defaultValue: "Hemen sipariş ver" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#ff5a00" },
    ],
  },
  {
    key: "klassy-cafe",
    name: "Klassy Cafe",
    description: "Cafe, bistro ve tatlıcı vitrini",
    previewImage: "/vendor-themes/restaurant-cafe/klassy-cafe.svg",
    cssHref: "/vendor-themes/restaurant-cafe/klassy-cafe.css",
    themeGroup: "Restaurant ve Cafe Temaları",
    verticals: ["siparis", "delivery"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Kahve, tatlı ve keyifli anlar" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Cafe menünüzü sıcak, davetkar ve modern bir görünümle sunun." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/restaurant-cafe/klassy-cafe.svg" },
      { key: "ctaText", label: "Sipariş butonu metni", type: "text", defaultValue: "Menüye bak" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#fb5849" },
    ],
  },
  {
    key: "tasteit",
    name: "Taste.it",
    description: "Klasik restoran / rezervasyon teması",
    previewImage: "/vendor-themes/restaurant-cafe/tasteit.svg",
    cssHref: "/vendor-themes/restaurant-cafe/tasteit.css",
    themeGroup: "Restaurant ve Cafe Temaları",
    verticals: ["siparis", "delivery"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Yılların lezzeti sofranızda" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Geleneksel restoran deneyimini güçlü ve temiz bir vitrinle anlatın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/restaurant-cafe/tasteit.svg" },
      { key: "ctaText", label: "Sipariş butonu metni", type: "text", defaultValue: "Lezzetleri keşfet" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#e52b34" },
    ],
  },
  {
    key: "kusina",
    name: "Kusina",
    description: "Doğal, sağlıklı ve butik restoran teması",
    previewImage: "/vendor-themes/restaurant-cafe/kusina.svg",
    cssHref: "/vendor-themes/restaurant-cafe/kusina.css",
    themeGroup: "Restaurant ve Cafe Temaları",
    verticals: ["siparis", "delivery"],
    subtypes: [],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Doğal ve taze lezzetler" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Sağlıklı mutfak, butik restoran ve doğal ürün menüleri için ferah görünüm." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/restaurant-cafe/kusina.svg" },
      { key: "ctaText", label: "Sipariş butonu metni", type: "text", defaultValue: "Taze menüyü gör" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#8fb339" },
    ],
  },
  {
    key: "vacation-rental",
    name: "Vacation Rental",
    description: "Otel, villa ve konaklama vitrini",
    previewImage: "/vendor-themes/vacation-rental/vacation-rental-master/images/bg_1.jpg",
    cssHref: "/vendor-themes/vacation-rental/vacation-rental-master/css/style.css",
    verticals: ["turizm"],
    subtypes: ["otel", "villa"],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Unutulmaz bir konaklama" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Rezervasyon yapın, keyfinize bakın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/vacation-rental/vacation-rental-master/images/bg_1.jpg" },
      { key: "ctaText", label: "Rezervasyon butonu", type: "text", defaultValue: "Müsaitlik sor" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#bf925a" },
    ],
  },
  {
    key: "carbook",
    name: "Carbook",
    description: "Rent a car ve yat / tekne vitrini",
    previewImage: "/vendor-themes/carbook/carbook-master/images/bg_1.jpg",
    cssHref: "/vendor-themes/carbook/carbook-master/css/style.css",
    verticals: ["turizm", "ulasim"],
    subtypes: ["arac", "yat"],
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Yolculuğa hazır mısınız?" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Araç veya tekne kiralama için hemen teklif alın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/carbook/carbook-master/images/bg_1.jpg" },
      { key: "ctaText", label: "Teklif butonu", type: "text", defaultValue: "Hemen kirala" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#01d28e" },
    ],
  },
];

let ensuredThemeCols = false;
let ensuredDomainsTable = false;

export async function ensureVendorThemeColumns(): Promise<void> {
  if (ensuredThemeCols) return;
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS theme_key TEXT`);
  await db.execute(sql`ALTER TABLE vendors ADD COLUMN IF NOT EXISTS theme_config JSONB NOT NULL DEFAULT '{}'::jsonb`);
  ensuredThemeCols = true;
}

export async function ensureVendorCustomDomainsTable(): Promise<void> {
  if (ensuredDomainsTable) return;
  await ensureVendorThemeColumns();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS vendor_custom_domains (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      domain TEXT NOT NULL,
      position SMALLINT NOT NULL DEFAULT 1,
      verified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'`);
  await db.execute(sql`ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS admin_note TEXT`);
  await db.execute(sql`ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await db.execute(sql`ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`);
  await db.execute(sql`ALTER TABLE vendor_custom_domains ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS vendor_custom_domains_domain_uq
      ON vendor_custom_domains (lower(trim(domain)))
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS vendor_custom_domains_vendor_id_idx
      ON vendor_custom_domains (vendor_id)
  `);
  ensuredDomainsTable = true;
}

export function normalizeVendorDomain(raw: string | undefined | null): string | null {
  let s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  s = s.split(":")[0] ?? "";
  if (s.startsWith("www.")) s = s.slice(4);
  if (!s || s.includes(" ") || !s.includes(".")) return null;
  return s;
}

export function vendorDomainLookupCandidates(raw: string | undefined | null): string[] {
  const base = normalizeVendorDomain(raw);
  if (!base) return [];
  const out = new Set<string>([base]);
  if (!base.startsWith("www.")) out.add(`www.${base}`);
  else out.add(base.slice(4));
  return [...out];
}

export function resolveDefaultThemeKey(v: {
  vendorType?: string | null;
  providerType?: string | null;
  providerSubtype?: string | null;
}): string {
  const vt = String(v.vendorType ?? "").toLowerCase();
  const pt = String(v.providerType ?? vt).toLowerCase();
  const sub = String(v.providerSubtype ?? "").toLowerCase();

  if (pt === "turizm" || vt === "turizm") {
    if (sub === "arac" || sub === "yat") return "carbook";
    if (sub === "otel" || sub === "villa") return "vacation-rental";
    return "vacation-rental";
  }
  if (pt === "ulasim" || vt === "ulasim") return "carbook";
  if (pt === "siparis" || pt === "delivery" || vt === "delivery") return "sarab";
  if (pt === "alisveris" || pt === "ecommerce" || vt === "ecommerce") return "nest-market";
  return "foodmart";
}

export function themeDefByKey(key: string | null | undefined): VendorThemeDef | undefined {
  const k = String(key ?? "").trim().toLowerCase();
  return VENDOR_THEME_CATALOG.find((t) => t.key === k);
}

export function themesForVendor(v: {
  vendorType?: string | null;
  providerType?: string | null;
  providerSubtype?: string | null;
}): VendorThemeDef[] {
  const vt = String(v.vendorType ?? "").toLowerCase();
  const pt = String(v.providerType ?? vt).toLowerCase();
  const sub = String(v.providerSubtype ?? "").toLowerCase();
  return VENDOR_THEME_CATALOG.filter((t) => {
    const verticalOk =
      t.verticals.includes(pt) ||
      t.verticals.includes(vt) ||
      (pt === "delivery" && t.verticals.includes("siparis")) ||
      (vt === "ecommerce" && t.verticals.includes("alisveris"));
    if (!verticalOk) return false;
    if (!t.subtypes.length) return true;
    return t.subtypes.includes(sub);
  });
}

export function mergeThemeConfig(
  themeKey: string,
  saved: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const def = themeDefByKey(themeKey);
  const out: Record<string, string> = {};
  for (const slot of def?.slots ?? []) {
    const raw = saved?.[slot.key];
    out[slot.key] = String(raw ?? slot.defaultValue ?? "").trim();
  }
  return out;
}

export type VendorNavMenuItem = {
  id: string;
  label: string;
  href: string;
  enabled?: boolean;
};

export function cleanVendorNavMenuItems(items: VendorNavMenuItem[]): VendorNavMenuItem[] | null {
  const cleaned = items
    .map((item, index): VendorNavMenuItem | null => {
      const label = String(item.label ?? "").trim().slice(0, 80);
      const href = String(item.href ?? "").trim().slice(0, 500) || "#";
      if (!label) return null;
      const id = String(item.id ?? "").trim() || `vnav-${index + 1}`;
      return {
        id,
        label,
        href,
        enabled: item.enabled === false ? false : true,
      };
    })
    .filter((item): item is VendorNavMenuItem => item != null)
    .slice(0, 24);
  return cleaned.length ? cleaned : null;
}

export function parseVendorNavMenuItems(raw: unknown): VendorNavMenuItem[] {
  if (!Array.isArray(raw)) return [];
  return (
    cleanVendorNavMenuItems(
      raw.map((item, index) => {
        const o = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          id: String(o.id ?? `vnav-${index + 1}`),
          label: String(o.label ?? ""),
          href: String(o.href ?? "#"),
          enabled: o.enabled === false ? false : true,
        };
      }),
    ) ?? []
  );
}

export function resolveVendorNavMenuEnabled(raw: unknown): boolean {
  return raw === true;
}

export function resolveVendorStripMenuEnabled(raw: unknown): boolean {
  return raw === true;
}

export function readVendorNavMenuFromThemeConfig(saved: Record<string, unknown> | null | undefined): {
  navMenuEnabled: boolean;
  navMenuItems: VendorNavMenuItem[];
  stripMenuEnabled: boolean;
  stripMenuItems: VendorNavMenuItem[];
} {
  const src = saved ?? {};
  return {
    navMenuEnabled: resolveVendorNavMenuEnabled(src.navMenuEnabled),
    navMenuItems: parseVendorNavMenuItems(src.navMenuItems),
    stripMenuEnabled: resolveVendorStripMenuEnabled(src.stripMenuEnabled),
    stripMenuItems: parseVendorNavMenuItems(src.stripMenuItems),
  };
}

export function resolveVendorStorefrontPath(v: {
  slug: string;
  vendorType?: string | null;
  providerType?: string | null;
  providerSubtype?: string | null;
}): string {
  const slug = String(v.slug ?? "").trim();
  const pt = String(v.providerType ?? v.vendorType ?? "").toLowerCase();
  const vt = String(v.vendorType ?? "").toLowerCase();
  const sub = String(v.providerSubtype ?? "").toLowerCase();

  if (pt === "turizm" || vt === "turizm") {
    const typeMap: Record<string, string> = {
      otel: "hotel",
      arac: "car",
      villa: "villa",
      tur: "tour",
      yat: "boat",
    };
    const tourismType = typeMap[sub] || "hotel";
    return `/turizm/${encodeURIComponent(tourismType)}/${encodeURIComponent(slug)}`;
  }
  if (pt === "siparis" || pt === "delivery" || vt === "delivery") {
    return `/siparis/satici/${encodeURIComponent(slug)}`;
  }
  if (pt === "alisveris" || pt === "ecommerce" || vt === "ecommerce") {
    return `/alisveris/magaza/${encodeURIComponent(slug)}`;
  }
  return `/siparis/satici/${encodeURIComponent(slug)}`;
}

export function resolveVendorCustomDomainShortPath(v: {
  id?: number | string | null;
  name?: string | null;
  slug?: string | null;
}): string {
  const nameOrSlug = String(v.name ?? v.slug ?? "m").trim().toLocaleLowerCase("tr-TR");
  const first = (nameOrSlug.match(/[a-z0-9çğıöşü]/i)?.[0] ?? "m")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]/gi, "m")
    .toLowerCase();
  const numericId = Number(v.id ?? 0);
  const code = Number.isFinite(numericId) && numericId > 0
    ? Math.floor(numericId).toString(36).padStart(4, "0")
    : String(v.slug ?? "site").replace(/[^a-z0-9]/gi, "").slice(0, 4).padEnd(4, "0").toLowerCase();
  return `/${first}${code}`;
}

export function attachThemeToPublicVendor(
  vendorPublic: Record<string, unknown>,
): Record<string, unknown> {
  const themeKey =
    String(vendorPublic.themeKey ?? vendorPublic.theme_key ?? "").trim() ||
    resolveDefaultThemeKey({
      vendorType: String(vendorPublic.vendorType ?? vendorPublic.vendor_type ?? ""),
      providerType: String(vendorPublic.providerType ?? vendorPublic.provider_type ?? ""),
      providerSubtype: String(vendorPublic.providerSubtype ?? vendorPublic.provider_subtype ?? ""),
    });
  const savedRaw = vendorPublic.themeConfig ?? vendorPublic.theme_config;
  const saved =
    savedRaw && typeof savedRaw === "object" && !Array.isArray(savedRaw)
      ? (savedRaw as Record<string, unknown>)
      : {};
  vendorPublic.themeKey = themeKey;
  vendorPublic.themeConfig = mergeThemeConfig(themeKey, saved);
  const navMenu = readVendorNavMenuFromThemeConfig(saved);
  vendorPublic.navMenuEnabled = navMenu.navMenuEnabled;
  vendorPublic.navMenuItems = navMenu.navMenuItems;
  vendorPublic.stripMenuEnabled = navMenu.stripMenuEnabled;
  vendorPublic.stripMenuItems = navMenu.stripMenuItems;
  return vendorPublic;
}

export async function getVendorByCustomDomain(hostRaw: string): Promise<Row | null> {
  await ensureVendorCustomDomainsTable();
  const candidates = vendorDomainLookupCandidates(hostRaw);
  if (!candidates.length) return null;

  for (const domain of candidates) {
    const rows = (
      await db.execute<Row>(sql`
        SELECT v.id, v.name, v.slug, v.vendor_type, v.provider_type, v.provider_subtype,
               v.theme_key, v.theme_config, v.active, v.application_status,
               d.domain, d.verified_at
        FROM vendor_custom_domains d
        JOIN vendors v ON v.id = d.vendor_id
        WHERE lower(trim(d.domain)) = ${domain}
          AND (d.status = 'approved' OR d.verified_at IS NOT NULL)
          AND v.active = true
        LIMIT 1
      `)
    ).rows as Row[] | undefined;
    const row = rows?.[0];
    if (row) return row;
  }
  return null;
}

export async function listVendorDomains(vendorId: number): Promise<
  Array<{ id: number; domain: string; position: number; verified_at: string | null; status: string; admin_note: string | null }>
> {
  await ensureVendorCustomDomainsTable();
  const rows = (
    await db.execute<Row>(sql`
      SELECT id, domain, position, verified_at, status, admin_note
      FROM vendor_custom_domains
      WHERE vendor_id = ${vendorId}
      ORDER BY position ASC, id ASC
    `)
  ).rows as Row[] | undefined;
  return (rows ?? []).map((r) => ({
    id: Number(r.id),
    domain: String(r.domain ?? ""),
    position: Number(r.position ?? 1),
    verified_at: r.verified_at ? String(r.verified_at) : null,
    status: String(r.status ?? "approved"),
    admin_note: r.admin_note ? String(r.admin_note) : null,
  }));
}

export function serializeVendorDomainMeta(row: Row): Record<string, unknown> {
  const slug = String(row.slug ?? "").trim();
  const storefrontPath = resolveVendorStorefrontPath({
    slug,
    vendorType: String(row.vendor_type ?? ""),
    providerType: String(row.provider_type ?? ""),
    providerSubtype: String(row.provider_subtype ?? ""),
  });
  const themeKey =
    String(row.theme_key ?? "").trim() ||
    resolveDefaultThemeKey({
      vendorType: String(row.vendor_type ?? ""),
      providerType: String(row.provider_type ?? ""),
      providerSubtype: String(row.provider_subtype ?? ""),
    });
  const savedRaw = row.theme_config;
  const saved =
    savedRaw && typeof savedRaw === "object" && !Array.isArray(savedRaw)
      ? (savedRaw as Record<string, unknown>)
      : typeof savedRaw === "string"
        ? (() => {
            try {
              return JSON.parse(savedRaw) as Record<string, unknown>;
            } catch {
              return {};
            }
          })()
        : {};
  return {
    vendorId: Number(row.id),
    slug,
    name: String(row.name ?? ""),
    vendorType: String(row.vendor_type ?? ""),
    providerType: String(row.provider_type ?? ""),
    providerSubtype: String(row.provider_subtype ?? ""),
    storefrontPath,
    shortPath: resolveVendorCustomDomainShortPath({
      id: Number(row.id),
      name: String(row.name ?? ""),
      slug,
    }),
    themeKey,
    themeConfig: mergeThemeConfig(themeKey, saved),
    ...readVendorNavMenuFromThemeConfig(saved),
    domain: String(row.domain ?? ""),
  };
}
