import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { seedEcommerceProductCategoriesIfNeeded } from "./ecommerce-product-categories.js";

const r = <T>(res: { rows?: T[] } | T[]): T[] =>
  (Array.isArray(res) ? res : (res.rows ?? [])) as T[];

export type MarketplaceBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaLabel?: string;
  href: string;
  imageUrl?: string | null;
  tone?: "green" | "emerald" | "yellow" | "pink";
};

export type MarketplaceBrand = {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  href: string;
};

export type MarketplaceBlogPost = {
  id: number;
  title: string;
  excerpt: string;
  href: string;
  imageUrl?: string | null;
  publishedAt?: string | null;
};

export type MarketplacePromoBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  name?: string | null;
  href: string;
  buttonHref?: string;
  buttonTitle?: string;
  imageUrl?: string | null;
  bgColor?: string;
  layout?: "wide" | "split" | "row";
};

const MARKETPLACE_HERO: MarketplaceBanner[] = [
  {
    id: "hero-market-1",
    title: "Binlerce ürün ve güvenilir mağaza tek Yekpare'de",
    subtitle: "Elektronik, moda, ev & yaşam, market ve yerel satıcılardan alışveriş yapın.",
    ctaLabel: "Alışverişe başla",
    href: "/magaza/urunler",
    imageUrl: "https://images.unsplash.com/photo-1483986768956-1e1459e1b44e?w=1200&q=80",
    tone: "green",
  },
  {
    id: "hero-market-2",
    title: "Elektronik ve teknolojide haftalık fırsatlar",
    subtitle: "Telefon, bilgisayar, küçük ev aletleri ve aksesuarlarda seçili indirimler.",
    ctaLabel: "Fırsatları keşfet",
    href: "/magaza/kategoriler",
    imageUrl: "https://images.unsplash.com/photo-1468495246313-6d6cfc8ee47a?w=1200&q=80",
    tone: "emerald",
  },
  {
    id: "hero-market-3",
    title: "Moda, ev & yaşam ve market ihtiyaçları",
    subtitle: "Giyimden ev dekoruna, günlük market alışverişinden yerel mağazalara kadar her şey bir arada.",
    ctaLabel: "Kategorilere git",
    href: "/magaza/urunler",
    imageUrl: "https://images.unsplash.com/photo-1445205170230-053b830160a0?w=1200&q=80",
    tone: "yellow",
  },
];

const FALLBACK_BRANDS: MarketplaceBrand[] = [
  { id: 1, name: "TechLine", slug: "techline", logoUrl: null, href: "/magaza/markalar" },
  { id: 2, name: "ModaPlus", slug: "modaplus", logoUrl: null, href: "/magaza/markalar" },
  { id: 3, name: "EvYaşam", slug: "ev-yasam", logoUrl: null, href: "/magaza/markalar" },
  { id: 4, name: "FreshMart", slug: "freshmart", logoUrl: null, href: "/magaza/markalar" },
  { id: 5, name: "StyleHub", slug: "stylehub", logoUrl: null, href: "/magaza/markalar" },
  { id: 6, name: "HomeBase", slug: "homebase", logoUrl: null, href: "/magaza/markalar" },
];

const FALLBACK_BLOGS: MarketplaceBlogPost[] = [
  {
    id: 1,
    title: "Online alışverişte güvenli ödeme ipuçları",
    excerpt: "3D Secure, iade koşulları ve satıcı değerlendirmeleriyle güvenle alışveriş yapın.",
    href: "/magaza/blog",
    imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    publishedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Ev & yaşam kategorisinde trend ürünler",
    excerpt: "Dekorasyon, mutfak ve organizasyon ürünlerinde öne çıkan seçkiler.",
    href: "/magaza/blog",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    publishedAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Moda ve aksesuar alışveriş rehberi",
    excerpt: "Sezon trendleri, beden rehberi ve yerel mağaza vitrinlerinden alışveriş önerileri.",
    href: "/magaza/blog",
    imageUrl: "https://images.unsplash.com/photo-1445205170230-053b830160a0?w=800&q=80",
    publishedAt: new Date().toISOString(),
  },
];

export function buildMarketplaceHomeExtras(input: {
  vendors: Array<{ id: number; name: string; slug: string; imageUrl?: string | null; storefrontHref?: string }>;
  products: Array<{ id: number; name: string; categoryName?: string | null; href: string; imageUrl?: string | null }>;
  lang: "tr" | "en";
}): {
  heroBanners: MarketplaceBanner[];
  promoBanners: MarketplacePromoBanner[];
  bottomPromoBanners: MarketplacePromoBanner[];
  brands: MarketplaceBrand[];
  blogPosts: MarketplaceBlogPost[];
} {
  const { vendors, products, lang } = input;
  const heroBanners = MARKETPLACE_HERO.map((b) => ({
    ...b,
    title: lang === "en" ? b.title : b.title,
  }));

  const promoBanners: MarketplacePromoBanner[] = [
    {
      id: "promo-1",
      title: lang === "en" ? "Weekly marketplace deals" : "Haftalık pazaryeri fırsatları",
      subtitle: lang === "en" ? "Selected products across categories" : "Elektronik, moda ve ev kategorilerinde seçili indirimler",
      href: "/magaza/kampanyalar",
      imageUrl: products[0]?.imageUrl ?? "https://images.unsplash.com/photo-1468495246313-6d6cfc8ee47a?w=900&q=80",
      layout: "wide",
    },
    {
      id: "promo-2",
      title: lang === "en" ? "Local store picks" : "Yerel mağaza seçkileri",
      subtitle: lang === "en" ? "Shop from trusted neighborhood vendors" : "Güvenilir yerel satıcılardan ürün ve kampanyalar",
      href: "/magaza/urunler",
      imageUrl: products[1]?.imageUrl ?? "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80",
      layout: "split",
    },
    {
      id: "promo-3",
      title: lang === "en" ? "Fashion & lifestyle" : "Moda & yaşam",
      subtitle: lang === "en" ? "Clothing, accessories and home favorites" : "Giyim, aksesuar ve ev ürünlerinde popüler seçkiler",
      href: "/magaza/urunler",
      imageUrl: products[2]?.imageUrl ?? "https://images.unsplash.com/photo-1445205170230-053b830160a0?w=900&q=80",
      layout: "row",
    },
  ];

  const brands: MarketplaceBrand[] = vendors.length
    ? vendors.slice(0, 8).map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug,
        logoUrl: v.imageUrl ?? null,
        href: `/alisveris/magaza/${encodeURIComponent(v.slug)}`,
      }))
    : FALLBACK_BRANDS;

  const blogPosts: MarketplaceBlogPost[] = products.length
    ? products.slice(0, 3).map((p, index) => ({
        id: p.id,
        title: `${p.name} — ${lang === "en" ? "marketplace highlight" : "pazaryeri vitrini"}`,
        excerpt:
          p.categoryName
            ? `${p.categoryName} kategorisinde öne çıkan ürünleri keşfedin.`
            : "Yekpare pazaryerinde yeni ürün ve kampanya haberleri.",
        href: p.href,
        imageUrl: p.imageUrl ?? FALLBACK_BLOGS[index]?.imageUrl ?? null,
        publishedAt: new Date().toISOString(),
      }))
    : FALLBACK_BLOGS;

  const bottomPromoBanners: MarketplacePromoBanner[] = [
    {
      id: "bottom-1",
      title: lang === "en" ? "Free shipping on orders over 250 TL" : "250 TL üzeri ücretsiz kargo",
      subtitle: lang === "en" ? "Selected marketplace stores" : "Seçili pazaryeri mağazalarında geçerli",
      name: lang === "en" ? "Delivery" : "Teslimat",
      href: "/magaza/urunler",
      buttonHref: "/magaza/urunler",
      buttonTitle: lang === "en" ? "Shop now" : "Alışverişe başla",
      imageUrl: products[3]?.imageUrl ?? "https://images.unsplash.com/photo-1607083206869-4c6872a72ca3?w=900&q=80",
      bgColor: "#E8F5E9",
      layout: "row",
    },
    {
      id: "bottom-2",
      title: lang === "en" ? "Become a seller on Yekpare" : "Yekpare'de satıcı olun",
      subtitle: lang === "en" ? "Open your store in minutes" : "Dakikalar içinde mağazanızı açın",
      name: lang === "en" ? "Vendors" : "Satıcılar",
      href: "/magaza/satici-ol",
      buttonHref: "/magaza/satici-ol",
      buttonTitle: lang === "en" ? "Apply" : "Başvur",
      imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80",
      bgColor: "#FFF3E0",
      layout: "row",
    },
  ];

  return { heroBanners, promoBanners, bottomPromoBanners, brands, blogPosts };
}

/** Deterministic healthcare/grocery demo catalog when marketplace is sparse. */
export async function seedMarketplaceHealthcareIfNeeded(): Promise<void> {
  await seedEcommerceProductCategoriesIfNeeded();

  const [countRow] = r<{ total: number }>(
    await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM vendor_menu_items mi
      JOIN vendors v ON v.id = mi.vendor_id
      WHERE v.active = true AND v.vendor_type = 'ecommerce' AND mi.active = true
    `),
  );
  if (Number(countRow?.total ?? 0) >= 24) return;

  const existing = r<{ id: number }>(
    await db.execute(sql`SELECT id FROM vendors WHERE slug = 'yekpare-saglik-market' LIMIT 1`),
  );
  let vendorId = existing[0]?.id;
  if (!vendorId) {
    const inserted = r<{ id: number }>(
      await db.execute(sql`
        INSERT INTO vendors (
          name, slug, description, image_url, cover_url, phone, city, district,
          working_hours, min_order_amount, shipping_fee, shipping_time, free_shipping_above,
          rating, review_count, is_open, featured, active, vendor_type, owner_name
        ) VALUES (
          'Yekpare Sağlık Market', 'yekpare-saglik-market',
          'Vitamin, medikal cihaz, kişisel bakım ve market ürünlerinde güvenilir pazaryeri satıcısı.',
          'https://images.unsplash.com/photo-1587854692152-cf800b432ba3?w=400&q=80',
          'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80',
          '+90 850 000 00 00', 'İstanbul', 'Kadıköy', '09:00-21:00',
          0, 29.90, 2, 250, 4.8, 1280, true, true, true, 'ecommerce', 'Yekpare Partner'
        )
        RETURNING id
      `),
    );
    vendorId = inserted[0]?.id;
  }
  if (!vendorId) return;

  const catRows = r<{ id: number; slug: string }>(
    await db.execute(sql`
      SELECT id, slug FROM ecommerce_product_categories
      WHERE slug IN ('supermarket-gida', 'kozmetik-kisisel-bakim')
      LIMIT 2
    `),
  );
  const groceryCatId = catRows.find((c) => c.slug.includes("supermarket"))?.id ?? null;
  const beautyCatId = catRows.find((c) => c.slug.includes("kozmetik"))?.id ?? null;

  const existingMenuCat = r<{ id: number }>(
    await db.execute(sql`
      SELECT id FROM vendor_menu_categories WHERE vendor_id = ${vendorId} ORDER BY id LIMIT 1
    `),
  );
  let menuCategoryId = existingMenuCat[0]?.id;
  if (!menuCategoryId) {
    const insertedMenu = r<{ id: number }>(
      await db.execute(sql`
        INSERT INTO vendor_menu_categories (vendor_id, name, position, active, ecommerce_category_id)
        VALUES (${vendorId}, 'Sağlık & Market', 1, true, ${groceryCatId})
        RETURNING id
      `),
    );
    menuCategoryId = insertedMenu[0]?.id;
  }
  if (!menuCategoryId) return;

  const demoProducts = [
    ["C Vitamini 1000 mg", "Bağışıklık destek takviyesi, 60 tablet", 189.9, 149.9, "https://images.unsplash.com/photo-1584308664953-8ce105925acc?w=400&q=80", groceryCatId, true],
    ["Dijital Ateş Ölçer", "Temassız hızlı ölçüm, LCD ekran", 449.9, 379.9, "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=400&q=80", groceryCatId, true],
    ["Cilt Nemlendirici Serum", "Hyaluronik asit içerikli günlük bakım", 329.9, 279.9, "https://images.unsplash.com/photo-1596462502278-27bfdd403348?w=400&q=80", beautyCatId, true],
    ["Organik Zeytinyağı 1L", "Soğuk sıkım natürel zeytinyağı", 259.9, null, "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80", groceryCatId, false],
    ["Protein Bar 6'lı Paket", "Yüksek proteinli pratik atıştırmalık", 149.9, 119.9, "https://images.unsplash.com/photo-1606312619070-d48cbd4c8f69?w=400&q=80", groceryCatId, false],
    ["Medikal Yüz Maskesi 50'li", "3 katlı koruyucu maske kutusu", 99.9, 79.9, "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&q=80", groceryCatId, true],
    ["Omega 3 Balık Yağı", "Kalp ve beyin sağlığı destek formülü", 219.9, 189.9, "https://images.unsplash.com/photo-1550572017-edd951aa8f71?w=400&q=80", groceryCatId, false],
    ["Doğal Şampuan 400 ml", "Saç derisi dostu bitkisel içerik", 129.9, 99.9, "https://images.unsplash.com/photo-1527799820374-dcf8d9a4a386?w=400&q=80", beautyCatId, false],
  ] as const;

  for (const [name, description, price, salePrice, imageUrl, ecommerceCategoryId, isPopular] of demoProducts) {
    const exists = r<{ id: number }>(
      await db.execute(sql`
        SELECT id FROM vendor_menu_items
        WHERE vendor_id = ${vendorId} AND name = ${name}
        LIMIT 1
      `),
    );
    if (exists.length) continue;
    await db.execute(sql`
      INSERT INTO vendor_menu_items (
        vendor_id, menu_category_id, name, description, price, sale_price,
        image_url, active, is_popular, stock, ecommerce_category_id
      ) VALUES (
        ${vendorId}, ${menuCategoryId}, ${name}, ${description}, ${String(price)}, ${salePrice != null ? String(salePrice) : null},
        ${imageUrl}, true, ${isPopular}, 120, ${ecommerceCategoryId}
      )
    `);
  }
}
