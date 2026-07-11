/** Yekpare `/` landing — admin düzenlenebilir vitrin yapılandırması. */

export const LANDING_IMAGE_BASE = "/vendor-themes/foodmart/FoodMart-1.0.0/images";

/** Admin boş bırakırsa landing CTA etiketleri için güvenli yedekler */
export const LANDING_CTA_LABEL_FALLBACKS = {
  search: "Ara",
  location: "Konum",
  appDownload: "Uygulamayı indir",
  vendor: "Satışa başla",
  delivery: "Kurye başvurusu",
  discount: "Siparişe başla",
  highlight: "Keşfet",
  highlightLocated: "Servislere git",
  explore: "Keşfet",
  maps: "Harita",
  start: "Başla",
  details: "Detayları gör",
} as const;

/** Hero cam hızlı aksiyonları — yedek emoji (admin metni emoji içermiyorsa eklenir) */
export const LANDING_HERO_QUICK_ACTION_EMOJI = {
  location: "📍",
  explore: "🔎",
  maps: "🗺️",
} as const;

export function resolveLandingCtaLabel(value: string | undefined | null, fallback: string): string {
  const t = typeof value === "string" ? value.trim() : "";
  return t || fallback;
}

function hasLeadingEmoji(text: string): boolean {
  return /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F)?/u.test(text.trim());
}

/** Admin JSON emoji içermese bile hero hızlı aksiyon etiketine emoji ekler */
export function resolveLandingHeroQuickActionLabel(
  value: string | undefined | null,
  fallback: string,
  emoji: string,
): string {
  const base = resolveLandingCtaLabel(value, fallback);
  if (hasLeadingEmoji(base)) return base;
  return `${emoji} ${base}`;
}

export const LANDING_SECTION_IDS = [
  "hero",
  "stats",
  "zones",
  "banners",
  "appDownload",
  "partners",
  "vendorCta",
  "deliveryCta",
  "discount",
  "testimonials",
  "gallery",
  "highlight",
  "faq",
] as const;

export type LandingSectionId = (typeof LANDING_SECTION_IDS)[number];

export type FaqTabId = "customer" | "vendor" | "deliveryman";

export type LandingStat = { value: string; label: string };

export type LandingBanner = {
  title: string;
  subtitle: string;
  image: string;
  href?: string;
};

export type LandingTestimonial = { name: string; role: string; quote: string };

export type LandingGalleryItem = { title: string; image: string };

export type LandingZone = { name: string; modules: string; href?: string };

export type LandingHeroQuickAction = {
  label: string;
  href: string;
};

export type LandingFaqTab = {
  id: FaqTabId;
  label: string;
  items: Array<{ q: string; a: string }>;
};

export type YekpareLandingDesign = {
  version: 1;
  sectionOrder: LandingSectionId[];
  sections: Record<LandingSectionId, { enabled: boolean }>;
  hero: {
    title: string;
    subtitle: string;
    /** Opsiyonel hero arka plan görseli — yalnızca showBackgroundImage true iken render edilir */
    backgroundImage: string;
    /** Opsiyonel sağ vitrin görseli — yalnızca showSideImage true iken render edilir */
    sideImage: string;
    showBackgroundImage: boolean;
    showSideImage: boolean;
    locationPrompt: string;
    modulePrompt: string;
    searchPlaceholder: string;
    searchButtonLabel: string;
    locationButtonLabel: string;
    quickActions: LandingHeroQuickAction[];
  };
  stats: LandingStat[];
  zones: {
    title: string;
    description: string;
    items: LandingZone[];
  };
  banners: LandingBanner[];
  appDownload: {
    title: string;
    subtitle: string;
    image: string;
    ctaLabel: string;
    ctaHref: string;
  };
  partners: {
    title: string;
    subtitle: string;
    logos: string[];
  };
  vendorCta: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    image: string;
  };
  deliveryCta: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    image: string;
  };
  discount: {
    eyebrow: string;
    title: string;
    ctaLabel: string;
    ctaHref: string;
    backgroundImage: string;
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: LandingTestimonial[];
  };
  gallery: {
    title: string;
    subtitle: string;
    items: LandingGalleryItem[];
  };
  highlight: {
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    image: string;
  };
  faq: {
    title: string;
    sidebarTitle: string;
    sidebarText: string;
    sidebarHref: string;
    tabs: LandingFaqTab[];
  };
};

const SECTION_SET = new Set<string>(LANDING_SECTION_IDS);

function defaultSectionFlags(): Record<LandingSectionId, { enabled: boolean }> {
  return {
    hero: { enabled: true },
    stats: { enabled: true },
    zones: { enabled: false },
    banners: { enabled: true },
    appDownload: { enabled: true },
    partners: { enabled: false },
    vendorCta: { enabled: true },
    deliveryCta: { enabled: false },
    discount: { enabled: true },
    testimonials: { enabled: true },
    gallery: { enabled: true },
    highlight: { enabled: true },
    faq: { enabled: true },
  };
}

export const defaultYekpareLandingDesign = (): YekpareLandingDesign => ({
  version: 1,
  sectionOrder: [...LANDING_SECTION_IDS],
  sections: defaultSectionFlags(),
  hero: {
    title: "Şehrindeki yemek, market, alışveriş ve hizmetler tek Yekpare'de.",
    subtitle: "Konumunu seç, yakındaki işletmeleri keşfet, sipariş ver ve seyahat planla.",
    backgroundImage: `${LANDING_IMAGE_BASE}/background-pattern.jpg`,
    sideImage: `${LANDING_IMAGE_BASE}/banner-image-1.jpg`,
    showBackgroundImage: false,
    showSideImage: false,
    locationPrompt: "Teslimat adresini gir veya konumunu kullan",
    modulePrompt: "Hizmet modülünü seç",
    searchPlaceholder: "Yemek, market, yakınımdakiler ara",
    searchButtonLabel: "Ara",
    locationButtonLabel: "Konum",
    quickActions: [
      { label: "Keşfet", href: "/kesfet" },
      { label: "Harita", href: "/haritalar" },
    ],
  },
  stats: [
    { value: "10K+", label: "işletme ve hizmet" },
    { value: "81", label: "şehir kapsamı" },
    { value: "24/7", label: "destek ve AI akışı" },
    { value: "100K+", label: "uygulama kullanıcısı" },
  ],
  zones: {
    title: "Hizmet bölgelerimiz",
    description:
      "Yemek, market ve yerel hizmetlerde kullanıcı konumu; turizm ve alışverişte Türkiye geneli vitrinler öne çıkar.",
    items: [
      { name: "İstanbul Avrupa", modules: "Yemek, Market, Alışveriş", href: "/haritalar" },
      { name: "İstanbul Anadolu", modules: "Yemek, Market, Keşfet", href: "/haritalar" },
      { name: "Ankara", modules: "Yemek, Market, Seyahat", href: "/haritalar" },
      { name: "İzmir", modules: "Yemek, Market, Alışveriş", href: "/haritalar" },
      { name: "Antalya", modules: "Seyahat, Yemek, Keşfet", href: "/haritalar" },
      { name: "Türkiye geneli", modules: "Seyahat, Alışveriş, Haberler", href: "/servisler" },
    ],
  },
  banners: [
    {
      title: "İlk siparişe özel",
      subtitle: "Seçili restoranlarda indirim fırsatları",
      image: `${LANDING_IMAGE_BASE}/banner-image-1.jpg`,
      href: "/yemek",
    },
    {
      title: "Market hızlı teslimat",
      subtitle: "Günlük ihtiyaçlar kapında",
      image: `${LANDING_IMAGE_BASE}/banner-image-2.jpg`,
      href: "/market",
    },
    {
      title: "Yerel mağazalar",
      subtitle: "Alışveriş vitrinlerini keşfet",
      image: `${LANDING_IMAGE_BASE}/post-thumb-1.jpg`,
      href: "/alisveris",
    },
  ],
  appDownload: {
    title: "Yekpare mobil uygulamasını indir",
    subtitle: "Sipariş, keşif, harita ve haber akışına telefonundan hızlı eriş.",
    image: `${LANDING_IMAGE_BASE}/app-store.jpg`,
    ctaLabel: "Uygulamayı indir",
    ctaHref: "/uygulamayi-indir",
  },
  partners: {
    title: "Güvenilen markalar",
    subtitle: "Yekpare ekosistemindeki iş ortakları ve servis markaları.",
    logos: ["Yekpare", "Market", "Lezzet", "Turizm", "Mağaza", "Keşfet", "Haber", "YekTube"],
  },
  vendorCta: {
    title: "Yekpare'de satışa başla",
    description: "Restoran, market, mağaza veya hizmet işletmeni ekle; müşteriler seni tek platformda bulsun.",
    ctaLabel: "Satışa başla",
    ctaHref: "/isletme-basvuru",
    image: `${LANDING_IMAGE_BASE}/post-thumb-2.jpg`,
  },
  deliveryCta: {
    title: "Teslimat ekibine katıl",
    description: "Kurye uygulaması ile siparişleri takip et, rotanı yönet ve kazancını gör.",
    ctaLabel: "Kurye başvurusu",
    ctaHref: "/kurye-basvuru",
    image: `${LANDING_IMAGE_BASE}/post-thumb-3.jpg`,
  },
  discount: {
    eyebrow: "Özel fırsat",
    title: "İlk siparişinde avantajlı teslimat",
    ctaLabel: "Siparişe başla",
    ctaHref: "/yemek",
    backgroundImage: `${LANDING_IMAGE_BASE}/bg-light.jpg`,
  },
  testimonials: {
    title: "Kullanıcı yorumları",
    subtitle: "Müşteri, işletme ve teslimat deneyimleri",
    items: [
      { name: "Ayşe K.", role: "Müşteri", quote: "Yemek ve market siparişlerini tek uygulamadan yönetmek çok pratik." },
      { name: "Mehmet D.", role: "İşletme sahibi", quote: "Menü ve vitrin yönetimi kolay; müşteriler bizi hızlı buluyor." },
      { name: "Selin T.", role: "Müşteri", quote: "Konum seçince yakındaki işletmeler anında listeleniyor." },
    ],
  },
  gallery: {
    title: "Yekpare deneyimi",
    subtitle: "Platformdan seçilmiş kareler",
    items: [
      { title: "Yemek siparişi", image: `${LANDING_IMAGE_BASE}/post-thumb-1.jpg` },
      { title: "Market teslimat", image: `${LANDING_IMAGE_BASE}/post-thumb-2.jpg` },
      { title: "Yerel keşif", image: `${LANDING_IMAGE_BASE}/post-thumb-3.jpg` },
      { title: "Alışveriş vitrini", image: `${LANDING_IMAGE_BASE}/product-thumb-11.jpg` },
      { title: "Seyahat planı", image: `${LANDING_IMAGE_BASE}/banner-image-2.jpg` },
      { title: "Mobil uygulama", image: `${LANDING_IMAGE_BASE}/app-store.jpg` },
    ],
  },
  highlight: {
    title: "Yakınındaki hizmetleri keşfetmeye hazır mısın?",
    description: "Konumunu seç, modülünü belirle ve Yekpare'nin sipariş, alışveriş ve seyahat akışına geç.",
    ctaLabel: "Servislere git",
    ctaHref: "/servisler",
    image: `${LANDING_IMAGE_BASE}/banner-image-2.jpg`,
  },
  faq: {
    title: "Sık sorulan sorular",
    sidebarTitle: "Yasal bilgilendirme",
    sidebarText:
      "Yekpare satıcı değildir; sipariş ve ödemeler ilgili işletmeyle yapılır. Ayrıntılı SSS ve kullanım koşulları için yasal sayfalara gidin.",
    sidebarHref: "/sss",
    tabs: [
      {
        id: "customer",
        label: "Müşteriyim",
        items: [
          {
            q: "Yekpare nedir? Kim satıcıdır?",
            a: "yekpare.net, işletmelerin abonelikle listelendiği firma rehberi ve pazaryeridir. Satıcı, siparişi veya rezervasyonu alan işletmedir; Yekpare satıcı konumunda değildir.",
          },
          {
            q: "Ödeme kime yapılır?",
            a: "Ürün ve hizmet ödemeleri doğrudan ilgili işletmeye veya işletmenin ödeme altyapısına yapılır. Yekpare kullanıcı ödemesi tahsil etmez.",
          },
          {
            q: "Yekpare'de hangi servisler var?",
            a: "Yemek, market, alışveriş, seyahat, keşfet, haritalar ve haber akışları aynı platformda birleşir. Her modülde listelenen işletmeler kendi fiyat ve politikalarını yönetir.",
          },
          {
            q: "İade ve şikayet süreci",
            a: "İade ve iptal taleplerini önce ilgili işletmeyle iletin. Platform veya yanıltıcı ilan şikayetleri için /destek sayfasını kullanabilirsiniz.",
          },
          {
            q: "TURSAB ve turizm rezervasyonu",
            a: "TURSAB belgesi listelenen acenteye aittir. Rezervasyon öncesi belgeleri işletmeden teyit edin. Turizm SSS: /turizm/turlar/sss",
          },
        ],
      },
      {
        id: "vendor",
        label: "İşletmeyim",
        items: [
          {
            q: "İşletmemi nasıl listelerim?",
            a: "İşletme başvurusu veya ilgili modül paneli üzerinden abonelikli kayıt yapılır. Onay sonrası profil servis sağlayıcı panelinden yönetilir.",
          },
          {
            q: "Abonelik modeli nedir?",
            a: "İşletmeler platformda görünmek için abonelik öder; bu bedel listeleme hizmeti içindir, son kullanıcı ödemesi değildir.",
          },
          {
            q: "Hangi modüllerde vitrin açabilirim?",
            a: "Yemek, market, alışveriş, turizm, ulaşım ve yerel hizmet modüllerinde, başvuru ve paket koşullarına göre vitrin açabilirsiniz.",
          },
        ],
      },
      {
        id: "deliveryman",
        label: "Kuryeyim",
        items: [
          {
            q: "Teslimat ekibine nasıl katılırım?",
            a: "Kurye başvuru sayfasından formu doldurarak süreci başlatabilirsiniz.",
          },
        ],
      },
    ],
  },
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function mergeSectionOrder(raw: unknown, base: LandingSectionId[]): LandingSectionId[] {
  if (!Array.isArray(raw)) return base;
  const seen = new Set<LandingSectionId>();
  const out: LandingSectionId[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !SECTION_SET.has(item)) continue;
    const id = item as LandingSectionId;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of base) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

function mergeSections(raw: unknown, base: Record<LandingSectionId, { enabled: boolean }>) {
  const next = { ...base };
  if (!isRecord(raw)) return next;
  for (const id of LANDING_SECTION_IDS) {
    const row = raw[id];
    if (!isRecord(row)) continue;
    next[id] = { enabled: (row as { enabled?: unknown }).enabled !== false };
  }
  return next;
}

function str(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  return t || fallback;
}

function img(v: unknown, fallback: string): string {
  const s = str(v, fallback);
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
  return fallback;
}

export function parseYekpareLandingDesignFromJson(raw: string | null | undefined): YekpareLandingDesign {
  const defaults = defaultYekpareLandingDesign();
  if (!raw?.trim()) return defaults;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!isRecord(data)) return defaults;
    const d = data as Partial<YekpareLandingDesign>;
    const heroRaw = isRecord(data.hero) ? data.hero : {};
    const zonesRaw = isRecord(data.zones) ? data.zones : {};
    const appRaw = isRecord(data.appDownload) ? data.appDownload : {};
    const partnersRaw = isRecord(data.partners) ? data.partners : {};
    const vendorRaw = isRecord(data.vendorCta) ? data.vendorCta : {};
    const deliveryRaw = isRecord(data.deliveryCta) ? data.deliveryCta : {};
    const discountRaw = isRecord(data.discount) ? data.discount : {};
    const testimonialsRaw = isRecord(data.testimonials) ? data.testimonials : {};
    const galleryRaw = isRecord(data.gallery) ? data.gallery : {};
    const highlightRaw = isRecord(data.highlight) ? data.highlight : {};
    const faqRaw = isRecord(data.faq) ? data.faq : {};

    return {
      version: 1,
      sectionOrder: mergeSectionOrder(d.sectionOrder, defaults.sectionOrder),
      sections: mergeSections(data.sections, defaults.sections),
      hero: {
        title: str(heroRaw.title, defaults.hero.title),
        subtitle: str(heroRaw.subtitle, defaults.hero.subtitle),
        backgroundImage: img(heroRaw.backgroundImage, defaults.hero.backgroundImage),
        sideImage: img(heroRaw.sideImage, defaults.hero.sideImage),
        showBackgroundImage: heroRaw.showBackgroundImage === true,
        showSideImage: heroRaw.showSideImage === true,
        locationPrompt: str(heroRaw.locationPrompt, defaults.hero.locationPrompt),
        modulePrompt: str(heroRaw.modulePrompt, defaults.hero.modulePrompt),
        searchPlaceholder: str(heroRaw.searchPlaceholder, defaults.hero.searchPlaceholder),
        searchButtonLabel: str(heroRaw.searchButtonLabel, defaults.hero.searchButtonLabel),
        locationButtonLabel: str(heroRaw.locationButtonLabel, defaults.hero.locationButtonLabel),
        quickActions: Array.isArray(heroRaw.quickActions)
          ? heroRaw.quickActions
              .filter((a) => isRecord(a))
              .map((a) => ({
                label: str(a.label, ""),
                href: str(a.href, "/servisler"),
              }))
              .filter((a) => a.label)
              .slice(0, 2)
          : defaults.hero.quickActions,
      },
      stats: Array.isArray(data.stats)
        ? data.stats
            .filter((s) => isRecord(s))
            .map((s) => ({
              value: str(s.value, ""),
              label: str(s.label, ""),
            }))
            .filter((s) => s.value && s.label)
        : defaults.stats,
      zones: {
        title: str(zonesRaw.title, defaults.zones.title),
        description: str(zonesRaw.description, defaults.zones.description),
        items: Array.isArray(zonesRaw.items)
          ? zonesRaw.items
              .filter((z) => isRecord(z))
              .map((z) => ({
                name: str(z.name, ""),
                modules: str(z.modules, ""),
                href: str(z.href, "/haritalar"),
              }))
              .filter((z) => z.name)
          : defaults.zones.items,
      },
      banners: Array.isArray(data.banners)
        ? data.banners
            .filter((b) => isRecord(b))
            .map((b) => ({
              title: str(b.title, ""),
              subtitle: str(b.subtitle, ""),
              image: img(b.image, defaults.banners[0]?.image ?? ""),
              href: str(b.href, ""),
            }))
            .filter((b) => b.title)
        : defaults.banners,
      appDownload: {
        title: str(appRaw.title, defaults.appDownload.title),
        subtitle: str(appRaw.subtitle, defaults.appDownload.subtitle),
        image: img(appRaw.image, defaults.appDownload.image),
        ctaLabel: str(appRaw.ctaLabel, defaults.appDownload.ctaLabel),
        ctaHref: str(appRaw.ctaHref, defaults.appDownload.ctaHref),
      },
      partners: {
        title: str(partnersRaw.title, defaults.partners.title),
        subtitle: str(partnersRaw.subtitle, defaults.partners.subtitle),
        logos: Array.isArray(partnersRaw.logos)
          ? partnersRaw.logos.map((l) => str(l, "")).filter(Boolean)
          : defaults.partners.logos,
      },
      vendorCta: {
        title: str(vendorRaw.title, defaults.vendorCta.title),
        description: str(vendorRaw.description, defaults.vendorCta.description),
        ctaLabel: str(vendorRaw.ctaLabel, defaults.vendorCta.ctaLabel),
        ctaHref: str(vendorRaw.ctaHref, defaults.vendorCta.ctaHref),
        image: img(vendorRaw.image, defaults.vendorCta.image),
      },
      deliveryCta: {
        title: str(deliveryRaw.title, defaults.deliveryCta.title),
        description: str(deliveryRaw.description, defaults.deliveryCta.description),
        ctaLabel: str(deliveryRaw.ctaLabel, defaults.deliveryCta.ctaLabel),
        ctaHref: str(deliveryRaw.ctaHref, defaults.deliveryCta.ctaHref),
        image: img(deliveryRaw.image, defaults.deliveryCta.image),
      },
      discount: {
        eyebrow: str(discountRaw.eyebrow, defaults.discount.eyebrow),
        title: str(discountRaw.title, defaults.discount.title),
        ctaLabel: str(discountRaw.ctaLabel, defaults.discount.ctaLabel),
        ctaHref: str(discountRaw.ctaHref, defaults.discount.ctaHref),
        backgroundImage: img(discountRaw.backgroundImage, defaults.discount.backgroundImage),
      },
      testimonials: {
        title: str(testimonialsRaw.title, defaults.testimonials.title),
        subtitle: str(testimonialsRaw.subtitle, defaults.testimonials.subtitle),
        items: Array.isArray(testimonialsRaw.items)
          ? testimonialsRaw.items
              .filter((t) => isRecord(t))
              .map((t) => ({
                name: str(t.name, ""),
                role: str(t.role, ""),
                quote: str(t.quote, ""),
              }))
              .filter((t) => t.name && t.quote)
          : defaults.testimonials.items,
      },
      gallery: {
        title: str(galleryRaw.title, defaults.gallery.title),
        subtitle: str(galleryRaw.subtitle, defaults.gallery.subtitle),
        items: Array.isArray(galleryRaw.items)
          ? galleryRaw.items
              .filter((g) => isRecord(g))
              .map((g) => ({
                title: str(g.title, ""),
                image: img(g.image, defaults.gallery.items[0]?.image ?? ""),
              }))
              .filter((g) => g.title)
          : defaults.gallery.items,
      },
      highlight: {
        title: str(highlightRaw.title, defaults.highlight.title),
        description: str(highlightRaw.description, defaults.highlight.description),
        ctaLabel: str(highlightRaw.ctaLabel, defaults.highlight.ctaLabel),
        ctaHref: str(highlightRaw.ctaHref, defaults.highlight.ctaHref),
        image: img(highlightRaw.image, defaults.highlight.image),
      },
      faq: {
        title: str(faqRaw.title, defaults.faq.title),
        sidebarTitle: str(faqRaw.sidebarTitle, defaults.faq.sidebarTitle),
        sidebarText: str(faqRaw.sidebarText, defaults.faq.sidebarText),
        sidebarHref: str(faqRaw.sidebarHref, defaults.faq.sidebarHref),
        tabs: Array.isArray(faqRaw.tabs)
          ? faqRaw.tabs
              .filter((tab) => isRecord(tab))
              .map((tab) => ({
                id: (["customer", "vendor", "deliveryman"].includes(String(tab.id))
                  ? tab.id
                  : "customer") as FaqTabId,
                label: str(tab.label, "Sekme"),
                items: Array.isArray(tab.items)
                  ? tab.items
                      .filter((it) => isRecord(it))
                      .map((it) => ({ q: str(it.q, ""), a: str(it.a, "") }))
                      .filter((it) => it.q && it.a)
                  : [],
              }))
              .filter((tab) => tab.items.length > 0)
          : defaults.faq.tabs,
      },
    };
  } catch {
    return defaults;
  }
}

export function serializeYekpareLandingDesign(design: YekpareLandingDesign): string {
  return JSON.stringify(design);
}

export function resolveLandingSectionOrder(design: YekpareLandingDesign): LandingSectionId[] {
  return mergeSectionOrder(design.sectionOrder, [...LANDING_SECTION_IDS]);
}

export function isLandingSectionEnabled(design: YekpareLandingDesign, id: LandingSectionId): boolean {
  return design.sections[id]?.enabled !== false;
}

export const LANDING_SECTION_LABELS: Record<LandingSectionId, string> = {
  hero: "Hero (üst vitrin)",
  stats: "İstatistik bandı",
  zones: "Hizmet bölgeleri",
  banners: "Kampanya bannerları",
  appDownload: "Mobil uygulama",
  partners: "Marka şeridi",
  vendorCta: "İşletme CTA",
  deliveryCta: "Kurye CTA",
  discount: "İndirim bandı",
  testimonials: "Kullanıcı yorumları",
  gallery: "Görsel galeri",
  highlight: "Alt vurgu CTA",
  faq: "SSS",
};
