export type VendorThemeSlotType = "text" | "textarea" | "image" | "color";

export type VendorThemeSlotDef = {
  key: string;
  label: string;
  type: VendorThemeSlotType;
  defaultValue?: string;
};

export type VendorThemeDef = {
  key: string;
  name: string;
  description: string;
  previewImage: string;
  cssHref: string;
  fontFamily?: string;
  themeGroup?: string;
  slots: VendorThemeSlotDef[];
};

export const VENDOR_THEME_CATALOG: VendorThemeDef[] = [
  {
    key: "foodmart",
    name: "Market Vitrini",
    description: "Alışveriş / e-ticaret vitrini",
    previewImage: "/vendor-themes/foodmart/FoodMart-1.0.0/images/gift.svg",
    cssHref: "/vendor-themes/foodmart/FoodMart-1.0.0/style.css",
    fontFamily: "'Nunito', 'Open Sans', system-ui, sans-serif",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Taze ürünler, hızlı teslimat" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Siparişinizi hemen verin, kapınıza gelsin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/foodmart/FoodMart-1.0.0/images/gift.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Ücretsiz kargo fırsatı" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#3BB77E" },
    ],
  },
  {
    key: "sellzy-store",
    name: "Pazar Bahçesi",
    description: "Modern çok satıcılı alışveriş mağazası",
    previewImage: "/vendor-themes/ecommerce/sellzy-store.svg",
    cssHref: "/vendor-themes/ecommerce/sellzy-store.css",
    fontFamily: "'Inter', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Mağazanız Yekpare pazaryerinde" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Ürünlerinizi modern pazaryeri görünümüyle sergileyin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/sellzy-store.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Mağaza vitrini" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#10b981" },
    ],
  },
  {
    key: "nest-market",
    name: "Taze Pazar",
    description: "Market, gıda ve çok kategorili mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/nest-market.svg",
    cssHref: "/vendor-themes/ecommerce/nest-market.css",
    fontFamily: "'Nunito', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Günlük ihtiyaçlar, taze ürünler" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Ürünlerinizi ferah ve kategori odaklı market vitriniyle yayınlayın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/nest-market.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Taze market vitrini" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#3bb77e" },
    ],
  },
  {
    key: "pixio-shop",
    name: "Moda Işığı",
    description: "Moda, butik ve lifestyle mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/pixio-shop.svg",
    cssHref: "/vendor-themes/ecommerce/pixio-shop.css",
    fontFamily: "'Poppins', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
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
    name: "Kar Çiçeği",
    description: "Hızlı, kart odaklı modern e-ticaret vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-shop.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-shop.css",
    fontFamily: "'Inter', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Ürünlerinizi hızlıca keşfettirin" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Kampanya, ürün kartı ve kategori geçişleri güçlü bir alışveriş vitrini." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-shop.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Kar Çiçeği mağaza" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#4f46e5" },
    ],
  },
  {
    key: "kartify-gadget",
    name: "Tekno Vitrin",
    description: "Teknoloji, aksesuar ve gadget mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-gadget.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-gadget.css",
    fontFamily: "'Inter', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
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
    name: "Büyük Çarşı",
    description: "Çok kategorili kampanya ve market vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-mega-mart.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-mega-mart.css",
    fontFamily: "'Inter', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Tüm kategoriler tek mağazada" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Geniş mağaza düzeniyle kampanyaları, kategorileri ve öne çıkan ürünleri birlikte gösterin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-mega-mart.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Büyük Çarşı" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#f97316" },
    ],
  },
  {
    key: "kartify-organic-store",
    name: "Doğal Pazar",
    description: "Organik ürün, gıda ve doğal market vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-organic-store.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-organic-store.css",
    fontFamily: "'Nunito', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Doğal ürünler, ferah vitrin" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Organik market ve sağlıklı yaşam ürünlerini yumuşak renkli mağaza görünümüyle sunun." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-organic-store.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Doğal pazar" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#65a30d" },
    ],
  },
  {
    key: "kartify-style-tech",
    name: "Stil Teknoloji",
    description: "Lifestyle, moda ve teknoloji karması vitrin",
    previewImage: "/vendor-themes/ecommerce/kartify-style-tech.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-style-tech.css",
    fontFamily: "'Poppins', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
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
    name: "Elektrik Mavisi",
    description: "Elektronik ve cihaz odaklı mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-electro.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-electro.css",
    fontFamily: "'Inter', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Elektronik fırsatları öne çıkarın" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Cihaz, bilgisayar ve elektronik ürünleri güçlü kontrastlı mağaza temasıyla yayınlayın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-electro.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Elektronik fırsatlar" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#0ea5e9" },
    ],
  },
  {
    key: "kartify-baby-shop",
    name: "Minik Dünya",
    description: "Bebek, çocuk ve oyuncak mağaza vitrini",
    previewImage: "/vendor-themes/ecommerce/kartify-baby-shop.svg",
    cssHref: "/vendor-themes/ecommerce/kartify-baby-shop.css",
    fontFamily: "'Nunito', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Minikler için renkli mağaza" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Bebek, çocuk ve oyuncak ürünlerini pastel renkli sıcak bir vitrinle sergileyin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/kartify-baby-shop.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Minik Dünya" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#f472b6" },
    ],
  },
  {
    key: "listinghub-shop",
    name: "Rehber Vitrin",
    description: "Rehber ve mağaza karması ürün vitrini",
    previewImage: "/vendor-themes/ecommerce/listinghub-shop.svg",
    cssHref: "/vendor-themes/ecommerce/listinghub-shop.css",
    fontFamily: "'Inter', system-ui, sans-serif",
    themeGroup: "Alışveriş Mağaza Temaları",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Mağazanızı rehber gücüyle tanıtın" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "İşletme bilgisi, ürünler ve iletişimi listeleme odaklı vitrinde birleştirin." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/ecommerce/listinghub-shop.svg" },
      { key: "promoBadge", label: "Promosyon rozeti", type: "text", defaultValue: "Rehber vitrin" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#0ea5e9" },
    ],
  },
  {
    key: "sarab",
    name: "Sarab",
    description: "Sipariş / restoran vitrini",
    previewImage: "/vendor-themes/sarab/sarab-1.0.0/sarab/img/menu/1.jpg",
    cssHref: "/vendor-themes/sarab/sarab-1.0.0/sarab/css/style.css",
    fontFamily: "'Cormorant Garamond', Georgia, serif",
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
    fontFamily: "'Playfair Display', Georgia, serif",
    themeGroup: "Restaurant ve Cafe Temaları",
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
    fontFamily: "'Poppins', system-ui, sans-serif",
    themeGroup: "Restaurant ve Cafe Temaları",
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
    fontFamily: "'Poppins', system-ui, sans-serif",
    themeGroup: "Restaurant ve Cafe Temaları",
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
    fontFamily: "'Roboto', system-ui, sans-serif",
    themeGroup: "Restaurant ve Cafe Temaları",
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
    fontFamily: "'Poppins', system-ui, sans-serif",
    themeGroup: "Restaurant ve Cafe Temaları",
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
    description: "Otel / villa vitrini",
    previewImage: "/vendor-themes/vacation-rental/vacation-rental-master/images/bg_1.jpg",
    cssHref: "/vendor-themes/vacation-rental/vacation-rental-master/css/style.css",
    fontFamily: "'Poppins', system-ui, sans-serif",
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
    description: "Rent a car / yat & tekne vitrini",
    previewImage: "/vendor-themes/carbook/carbook-master/images/bg_1.jpg",
    cssHref: "/vendor-themes/carbook/carbook-master/css/style.css",
    fontFamily: "'Poppins', system-ui, sans-serif",
    slots: [
      { key: "heroTitle", label: "Ana başlık", type: "text", defaultValue: "Yolculuğa hazır mısınız?" },
      { key: "heroSubtitle", label: "Alt başlık", type: "textarea", defaultValue: "Araç veya tekne kiralama için hemen teklif alın." },
      { key: "heroImage", label: "Hero görseli", type: "image", defaultValue: "/vendor-themes/carbook/carbook-master/images/bg_1.jpg" },
      { key: "ctaText", label: "Teklif butonu", type: "text", defaultValue: "Hemen kirala" },
      { key: "accentColor", label: "Vurgu rengi", type: "color", defaultValue: "#01d28e" },
    ],
  },
];

export function themeDefByKey(key: string | null | undefined): VendorThemeDef | undefined {
  const k = String(key ?? "").trim().toLowerCase();
  return VENDOR_THEME_CATALOG.find((t) => t.key === k);
}

export function resolveVendorThemeConfig(
  themeKey: string,
  saved?: Record<string, string> | null,
): Record<string, string> {
  const def = themeDefByKey(themeKey);
  const out: Record<string, string> = {};
  for (const slot of def?.slots ?? []) {
    out[slot.key] = String(saved?.[slot.key] ?? slot.defaultValue ?? "").trim();
  }
  return out;
}

import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { readVendorDomainMetaCache } from "@/lib/vendorDomainStorage";

export function isVendorStandaloneHost(host?: string): boolean {
  if (typeof window === "undefined") return false;
  const h = (host ?? window.location.hostname).toLowerCase().split(":")[0] ?? "";
  if (!h || h === "localhost" || h === "127.0.0.1") return false;
  if (isDefaultPortalHost(h)) return false;
  return Boolean(readVendorDomainMetaCache(h));
}
