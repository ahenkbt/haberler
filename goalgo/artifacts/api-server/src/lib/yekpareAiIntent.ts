import type { YekpareAiLink } from "./yekpareAiFallback.js";

export type YekpareAiLocationContext = {
  city?: string;
  district?: string;
  label?: string;
};

export type YekpareAiIntentResult = {
  reply: string;
  links: YekpareAiLink[];
  /** Gemini yanıtına eklenecek bağlam notu */
  contextNote?: string;
};

const TR_CITIES: Record<string, string> = {
  adana: "Adana",
  adiyaman: "Adıyaman",
  afyon: "Afyonkarahisar",
  afyonkarahisar: "Afyonkarahisar",
  agri: "Ağrı",
  aksaray: "Aksaray",
  amasya: "Amasya",
  ankara: "Ankara",
  antalya: "Antalya",
  ardahan: "Ardahan",
  artvin: "Artvin",
  aydin: "Aydın",
  balikesir: "Balıkesir",
  bartin: "Bartın",
  batman: "Batman",
  bayburt: "Bayburt",
  bilecik: "Bilecik",
  bingol: "Bingöl",
  bitlis: "Bitlis",
  bolu: "Bolu",
  burdur: "Burdur",
  bursa: "Bursa",
  canakkale: "Çanakkale",
  cankiri: "Çankırı",
  corum: "Çorum",
  denizli: "Denizli",
  diyarbakir: "Diyarbakır",
  duzce: "Düzce",
  edirne: "Edirne",
  elazig: "Elazığ",
  erzincan: "Erzincan",
  erzurum: "Erzurum",
  eskisehir: "Eskişehir",
  gaziantep: "Gaziantep",
  giresun: "Giresun",
  gumushane: "Gümüşhane",
  hakkari: "Hakkari",
  hatay: "Hatay",
  igdir: "Iğdır",
  isparta: "Isparta",
  istanbul: "İstanbul",
  izmir: "İzmir",
  kahramanmaras: "Kahramanmaraş",
  karabuk: "Karabük",
  karaman: "Karaman",
  kars: "Kars",
  kastamonu: "Kastamonu",
  kayseri: "Kayseri",
  kilis: "Kilis",
  kirikkale: "Kırıkkale",
  kirklareli: "Kırklareli",
  kirsehir: "Kırşehir",
  kocaeli: "Kocaeli",
  konya: "Konya",
  kutahya: "Kütahya",
  malatya: "Malatya",
  manisa: "Manisa",
  mardin: "Mardin",
  mersin: "Mersin",
  mugla: "Muğla",
  mus: "Muş",
  nevsehir: "Nevşehir",
  nigde: "Niğde",
  ordu: "Ordu",
  osmaniye: "Osmaniye",
  rize: "Rize",
  sakarya: "Sakarya",
  samsun: "Samsun",
  sanliurfa: "Şanlıurfa",
  siirt: "Siirt",
  sinop: "Sinop",
  sivas: "Sivas",
  sirnak: "Şırnak",
  tekirdag: "Tekirdağ",
  tokat: "Tokat",
  trabzon: "Trabzon",
  tunceli: "Tunceli",
  usak: "Uşak",
  van: "Van",
  yalova: "Yalova",
  yozgat: "Yozgat",
  zonguldak: "Zonguldak",
};

type FoodCategory = {
  terms: string[];
  searchTerm: string;
  label: string;
  alternatives: { term: string; label: string }[];
};

const FOOD_CATEGORIES: FoodCategory[] = [
  {
    terms: ["gozleme", "gozlemeci", "gozleme evi"],
    searchTerm: "gözleme",
    label: "gözleme",
    alternatives: [
      { term: "pide", label: "Pide restoranları" },
      { term: "lahmacun", label: "Lahmacun" },
      { term: "restoran", label: "Yakın restoranlar" },
    ],
  },
  {
    terms: ["pide", "pidaci", "pidacı"],
    searchTerm: "pide",
    label: "pide",
    alternatives: [
      { term: "lahmacun", label: "Lahmacun" },
      { term: "kebap", label: "Kebap" },
    ],
  },
  {
    terms: ["lahmacun"],
    searchTerm: "lahmacun",
    label: "lahmacun",
    alternatives: [
      { term: "pide", label: "Pide" },
      { term: "kebap", label: "Kebap" },
    ],
  },
  {
    terms: ["kebap", "kebab", "doner", "döner", "iskender"],
    searchTerm: "kebap",
    label: "kebap",
    alternatives: [
      { term: "pide", label: "Pide" },
      { term: "restoran", label: "Restoranlar" },
    ],
  },
  {
    terms: ["pizza"],
    searchTerm: "pizza",
    label: "pizza",
    alternatives: [{ term: "burger", label: "Burger" }],
  },
  {
    terms: ["burger", "hamburger"],
    searchTerm: "burger",
    label: "burger",
    alternatives: [{ term: "pizza", label: "Pizza" }],
  },
  {
    terms: ["tatli", "tatlı", "baklava", "kunefe", "künefe", "dondurma"],
    searchTerm: "tatlı",
    label: "tatlı",
    alternatives: [{ term: "pastane", label: "Pastane" }],
  },
  {
    terms: ["kahve", "cafe", "kafe", "cay", "çay"],
    searchTerm: "kahve",
    label: "kahve",
    alternatives: [{ term: "pastane", label: "Pastane" }],
  },
  {
    terms: ["market", "grocery", "manav", "bakkal"],
    searchTerm: "market",
    label: "market",
    alternatives: [{ term: "gıda", label: "Gıda" }],
  },
  {
    terms: ["eczane", "ilac", "ilaç"],
    searchTerm: "eczane",
    label: "eczane",
    alternatives: [{ term: "saglik", label: "Sağlık işletmeleri" }],
  },
];

export function normalizeTr(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .trim();
}

function titleCity(city: string): string {
  const n = normalizeTr(city);
  return TR_CITIES[n] ?? city.trim();
}

export function extractCityFromMessage(message: string): string | null {
  const normalized = normalizeTr(message);
  for (const [key, label] of Object.entries(TR_CITIES)) {
    if (
      normalized.includes(key) ||
      normalized.includes(`${key}da`) ||
      normalized.includes(`${key}de`) ||
      normalized.includes(`${key}ta`) ||
      normalized.includes(`${key}te`)
    ) {
      return label;
    }
  }
  return null;
}

function extractFoodCategory(message: string): FoodCategory | null {
  const normalized = normalizeTr(message);
  for (const cat of FOOD_CATEGORIES) {
    if (cat.terms.some((t) => normalized.includes(t))) return cat;
  }
  return null;
}

function encodeQuery(q: string): string {
  return encodeURIComponent(q);
}

export function buildKesfetSearchHref(query: string, city?: string): string {
  const params = new URLSearchParams();
  params.set("q", query);
  if (city?.trim()) params.set("city", titleCity(city));
  return `/kesfet?${params.toString()}`;
}

export function buildYemekCityHref(city?: string): string {
  if (!city?.trim()) return "/yemek";
  return `/yemek?sehir=${encodeURIComponent(titleCity(city))}`;
}

export function buildHaritalarSearchHref(query: string): string {
  return `/haritalar?q=${encodeQuery(query)}`;
}

function resolveCity(message: string, location?: YekpareAiLocationContext): string | null {
  return extractCityFromMessage(message) ?? (location?.city?.trim() ? titleCity(location.city) : null);
}

function locationPhrase(city: string | null, location?: YekpareAiLocationContext): string {
  if (city) return `${city} için`;
  if (location?.city?.trim()) {
    const parts = [location.district, location.city].filter(Boolean);
    return parts.length ? `${parts.join(", ")} konumunuza göre` : "konumunuza göre";
  }
  return "konumunuza göre";
}

function buildFoodSearchIntent(
  message: string,
  pagePath?: string,
  location?: YekpareAiLocationContext,
): YekpareAiIntentResult | null {
  const food = extractFoodCategory(message);
  const isFoodContext =
    !!food ||
    /\b(var\s*mi|var\s*mı|bul|ara|siparis|sipariş|restoran|isletme|işletme|yemek|menu|menü)\b/.test(
      normalizeTr(message),
    );
  if (!isFoodContext && !food) return null;

  const city = resolveCity(message, location);
  const loc = locationPhrase(city, location);
  const category = food ?? {
    searchTerm: "restoran",
    label: "yemek",
    alternatives: [
      { term: "pide", label: "Pide" },
      { term: "kebap", label: "Kebap" },
    ],
    terms: [],
  };

  const citySuffix = city ? ` ${city}'da` : "";
  const altText = category.alternatives
    .slice(0, 2)
    .map((a) => a.label.toLowerCase())
    .join(" veya ");

  let reply: string;
  if (food) {
    reply = city
      ? `${city}'da ${category.label} arayabilirsiniz. ${loc} Keşfet ve Yemek bölümlerinde işletmeleri listeleyebilirim — tam eşleşme olmasa bile ${altText || "yakın restoran"} alternatiflerine bakmak ister misiniz?`
      : `${category.label.charAt(0).toUpperCase() + category.label.slice(1)} araması yapabilirim. Hangi şehir veya ilçede aradığınızı söylerseniz${citySuffix} size daha net yönlendirebilirim; yoksa konumunuzu header'dan seçebilirsiniz.`;
  } else {
    reply = city
      ? `${city}'da yemek ve restoran seçeneklerine bakabilirim. Ne tür bir yemek veya işletme arıyorsunuz?`
      : "Yemek veya restoran araması için hangi şehir veya ilçede olduğunuzu söyleyebilir misiniz? Kayıtlı konumunuz varsa ona göre de yönlendirebilirim.";
  }

  const links: YekpareAiLink[] = [];
  if (city || location?.city) {
    const c = city ?? titleCity(location!.city!);
    links.push({
      label: `${c}'da ${category.label} ara`,
      href: buildKesfetSearchHref(category.searchTerm, c),
    });
    links.push({ label: "Yemek siparişi", href: buildYemekCityHref(c) });
    const alt = category.alternatives[0];
    if (alt) {
      links.push({
        label: alt.label,
        href: buildKesfetSearchHref(alt.term, c),
      });
    }
  } else {
    links.push({
      label: `${category.label.charAt(0).toUpperCase() + category.label.slice(1)} ara`,
      href: buildKesfetSearchHref(category.searchTerm),
    });
    links.push({ label: "Yemek", href: "/yemek" });
    links.push({ label: "Keşfet haritası", href: buildHaritalarSearchHref(category.searchTerm) });
  }

  if (pagePath?.startsWith("/yemek") || pagePath?.startsWith("/kesfet")) {
    reply += " Şu an ilgili sayfadasınız; arama kutusunu da kullanabilirsiniz.";
  }

  return { reply, links: links.slice(0, 3) };
}

function matchAny(normalized: string, terms: string[]): boolean {
  return terms.some((t) => normalized.includes(t));
}

export function buildIntentFallbackReply(
  message: string,
  pagePath?: string,
  location?: YekpareAiLocationContext,
): YekpareAiIntentResult | null {
  const normalized = normalizeTr(message);

  const foodIntent = buildFoodSearchIntent(message, pagePath, location);
  if (foodIntent && (extractFoodCategory(message) || extractCityFromMessage(message))) {
    return foodIntent;
  }

  if (
    matchAny(normalized, [
      "siparis takip",
      "siparisim nerede",
      "kargo takip",
      "takip kodu",
      "siparis kodu",
      "kurye nerede",
    ])
  ) {
    return {
      reply:
        "Siparişinizi sipariş numarası veya takip kodu ile sorgulayabilirsiniz. Numaranız yoksa telefonunuzla geçmiş siparişlerinize de bakabilirsiniz.",
      links: [
        { label: "Sipariş takip", href: "/siparis-takip" },
        { label: "Siparişlerim", href: "/siparislerim" },
        { label: "Destek", href: "/destek" },
      ],
    };
  }

  if (matchAny(normalized, ["siparislerim", "gecmis siparis", "eski siparis", "telefon ile siparis"])) {
    return {
      reply:
        "Geçmiş siparişlerinizi telefon numaranızla listeleyebilirsiniz. Tek bir siparişin durumu için sipariş takip sayfasını kullanın.",
      links: [
        { label: "Siparişlerim", href: "/siparislerim" },
        { label: "Sipariş takip", href: "/siparis-takip" },
      ],
    };
  }

  if (
    matchAny(normalized, [
      "uyelik",
      "uye ol",
      "kayit ol",
      "kaydol",
      "hesap ac",
      "hesap olustur",
      "musteri giris",
      "giris yap",
      "login",
    ])
  ) {
    const isBusiness = matchAny(normalized, [
      "isletme",
      "satici",
      "magaza",
      "restoran",
      "partner",
      "panel",
    ]);
    if (isBusiness) {
      return {
        reply:
          "İşletme veya satıcı hesabı için önce başvuru yapabilir, ardından işletme girişi ile panele erişebilirsiniz. E-ticaret satıcısı olmak için mağaza başvurusunu da inceleyin.",
        links: [
          { label: "İşletme başvuru", href: "/isletme-basvuru" },
          { label: "İşletme girişi", href: "/isletme-giris" },
          { label: "Mağaza satıcı ol", href: "/magaza/satici-ol" },
        ],
      };
    }
    return {
      reply:
        "Müşteri olarak sipariş vermek için üyelik zorunlu değil; sepetten devam edebilirsiniz. Geçmiş siparişleriniz için telefon numaranız yeterli. İşletme hesabı mı arıyorsunuz?",
      links: [
        { label: "Siparişlerim", href: "/siparislerim" },
        { label: "Yemek siparişi", href: "/yemek" },
        { label: "İşletme girişi", href: "/isletme-giris" },
      ],
    };
  }

  if (
    matchAny(normalized, [
      "satici ol",
      "satici olmak",
      "isletme kayit",
      "isletme basvuru",
      "restoran ac",
      "magaza ac",
      "partner ol",
    ])
  ) {
    return {
      reply:
        "Yemek/market işletmesi veya e-ticaret satıcısı olarak platforma katılabilirsiniz. Hangi model size uygun — restoran teslimatı mı, mağaza satıcılığı mı?",
      links: [
        { label: "İşletme başvuru", href: "/isletme-basvuru" },
        { label: "Mağaza satıcı ol", href: "/magaza/satici-ol" },
        { label: "Servis sağlayıcı giriş", href: "/servis-saglayici-giris" },
      ],
    };
  }

  if (matchAny(normalized, ["isletme paneli", "panel giris", "saglayici panel", "servis saglayici"])) {
    return {
      reply:
        "İşletme veya servis sağlayıcı paneline giriş için kayıtlı e-posta ve şifreniz gerekir. Henüz hesabınız yoksa işletme başvurusundan başlayın.",
      links: [
        { label: "İşletme girişi", href: "/isletme-giris" },
        { label: "Servis sağlayıcı giriş", href: "/servis-saglayici-giris" },
        { label: "İşletme başvuru", href: "/isletme-basvuru" },
      ],
    };
  }

  if (matchAny(normalized, ["adres", "konum", "konumumu", "teslimat adresi", "adres degistir"])) {
    const city = resolveCity(message, location);
    const locNote = location?.label?.trim()
      ? ` Kayıtlı konumunuz: ${location.label}.`
      : "";
    return {
      reply: city
        ? `${city} için adres ve teslimat bölgesi seçebilirsiniz.${locNote} Header'daki konum simgesinden veya Yemek/Market sayfasındaki adres alanından güncelleyebilirsiniz.`
        : `Teslimat ve keşif için konum seçmeniz gerekir.${locNote} Header'dan konumunuzu belirleyebilir veya bana şehrinizi yazabilirsiniz.`,
      links: [
        { label: "Yemek", href: buildYemekCityHref(city ?? location?.city) },
        { label: "Keşfet", href: buildKesfetSearchHref("", city ?? location?.city) },
        { label: "Haritalar", href: "/haritalar" },
      ],
    };
  }

  if (matchAny(normalized, ["harita", "haritalar", "navigasyon", "yol tarifi", "rota"])) {
    const food = extractFoodCategory(message);
    const city = resolveCity(message, location);
    const q = food?.searchTerm ?? "";
    return {
      reply: food
        ? `${food.label} aramasını harita üzerinde de gösterebilirim.${city ? ` ${city} civarına odaklanalım mı?` : ""}`
        : "Haritalar bölümünde işletmeleri, konumunuzu ve rotaları görebilirsiniz. Ne aramak istiyorsunuz?",
      links: [
        { label: "Haritalar", href: q ? buildHaritalarSearchHref(q) : "/haritalar" },
        ...(q
          ? [{ label: "Keşfet'te ara", href: buildKesfetSearchHref(q, city ?? undefined) }]
          : [{ label: "Keşfet", href: "/kesfet" }]),
        { label: "Yakınımdakiler", href: "/isletmeler" },
      ],
    };
  }

  if (matchAny(normalized, ["turizm", "seyahat", "otel", "tatil", "tur ", "villa", "konaklama"])) {
    const city = resolveCity(message, location);
    const params = city ? `?city=${encodeURIComponent(city)}` : "";
    return {
      reply: city
        ? `${city} için tur, otel ve konaklama seçeneklerine Seyahat bölümünden bakabilirsiniz. Tarih ve kişi sayısı belirtirseniz daha net yönlendirebilirim.`
        : "Tur, otel, villa ve konaklama rezervasyonları Seyahat bölümünde. Hangi şehir veya tarih aralığını düşünüyorsunuz?",
      links: [
        { label: "Seyahat", href: `/turizm${params}` },
        { label: "Keşfet", href: buildKesfetSearchHref("otel", city ?? undefined) },
        { label: "Destek", href: "/destek" },
      ],
    };
  }

  if (matchAny(normalized, ["alisveris", "magaza", "e-ticaret", "sepet", "urun ara", "pazaryeri"])) {
    return {
      reply:
        "Alışveriş pazaryerinde ürün ve satıcı arayabilir, sepetinize ekleyip ödeme adımına geçebilirsiniz. Belirli bir ürün veya kategori arıyorsanız söyleyin.",
      links: [
        { label: "Alışveriş", href: "/magaza" },
        { label: "Sepet", href: "/magaza/sepet" },
        { label: "Mağaza satıcı ol", href: "/magaza/satici-ol" },
      ],
    };
  }

  if (matchAny(normalized, ["destek", "sikayet", "yardim", "sorun", "iade"])) {
    return {
      reply:
        "Sipariş, ödeme veya hesap sorunlarında destek talebi oluşturabilir veya iletişim formunu kullanabilirsiniz. Sipariş numaranız varsa paylaşın, doğru ekibe yönlendireyim.",
      links: [
        { label: "Destek", href: "/destek" },
        { label: "İletişim", href: "/iletisim" },
        { label: "Sipariş takip", href: "/siparis-takip" },
      ],
    };
  }

  if (foodIntent) return foodIntent;

  if (extractCityFromMessage(message) && matchAny(normalized, ["isletme", "restoran", "dukkan", "dükkan", "nerede"])) {
    const city = resolveCity(message, location)!;
    return {
      reply: `${city}'daki işletmeleri Keşfet haritasında veya Yakınımdakiler listesinde görebilirsiniz. Belirli bir ürün veya kategori söylerseniz daraltabilirim.`,
      links: [
        { label: `${city} Keşfet`, href: buildKesfetSearchHref("", city) },
        { label: "Yakınımdakiler", href: "/isletmeler" },
        { label: "Yemek", href: buildYemekCityHref(city) },
      ],
    };
  }

  return null;
}

export function buildLocationContextNote(location?: YekpareAiLocationContext): string {
  if (!location?.city?.trim() && !location?.label?.trim()) return "";
  const parts = [location.district, location.city].filter(Boolean);
  const label = location.label?.trim() || parts.join(", ");
  if (!label) return "";
  return `Kullanıcının kayıtlı konumu (gizlilik: koordinat yok): ${label}. Yanıtlarda "konumunuza göre" ifadesini uygun yerlerde kullan.`;
}

/** AI veya yedek yanıttaki linkleri niyet tabanlı linklerle birleştir (tekrarsız, en fazla 3). */
export function mergeIntentLinks(
  existing: YekpareAiLink[],
  intentLinks: YekpareAiLink[],
): YekpareAiLink[] {
  const seen = new Set<string>();
  const out: YekpareAiLink[] = [];
  for (const link of [...existing, ...intentLinks]) {
    if (!link?.href?.startsWith("/") || seen.has(link.href)) continue;
    seen.add(link.href);
    out.push(link);
    if (out.length >= 3) break;
  }
  return out;
}

export function isGenericLinkSet(links: YekpareAiLink[]): boolean {
  if (links.length === 0) return true;
  const generic = new Set(["/yemek", "/magaza", "/turizm", "/destek"]);
  return links.length <= 3 && links.every((l) => generic.has(l.href));
}
