/** Otomotiv servis taksonomisi — frontend config (API ile senkron) */

export type OtomotivServiceCategory = {
  slug: string;
  name: string;
  storeType: string;
  tags: string[];
  icon?: string;
};

export type OtomotivServiceGroup = {
  slug: string;
  name: string;
  sortOrder: number;
  icon: string;
  categories: OtomotivServiceCategory[];
};

export const OTOMOTIV_SERVICE_GROUPS: OtomotivServiceGroup[] = [
  {
    slug: "mekanik-genel-bakim",
    name: "Mekanik ve Genel Bakım",
    sortOrder: 1,
    icon: "🔩",
    categories: [
      { slug: "oto-mekanik", name: "Oto Mekanik / Motor Tamir", storeType: "otomotiv_servis_mekanik", icon: "🔧", tags: ["motor arızası", "motor tamir", "yağ değişimi", "motor revizyon", "mekanik tamir", "oto mekanik"] },
      { slug: "yetkili-servis", name: "Yetkili Servis", storeType: "otomotiv_servis_yetkili", icon: "🏢", tags: ["yetkili servis", "bayi servis", "garanti servis", "marka servis"] },
      { slug: "ozel-servis", name: "Özel Servis", storeType: "otomotiv_servis_ozel", icon: "🛠️", tags: ["özel servis", "bağımsız servis", "oto servis"] },
      { slug: "periyodik-bakim-merkezi", name: "Periyodik Bakım Merkezi", storeType: "otomotiv_servis_periyodik", icon: "📋", tags: ["periyodik bakım", "bakım paketi", "yağ filtresi", "filtre değişimi", "10 bin bakım"] },
    ],
  },
  {
    slug: "elektrik-elektronik",
    name: "Elektrik, Elektronik ve Akıllı Sistemler",
    sortOrder: 2,
    icon: "⚡",
    categories: [
      { slug: "oto-elektrikci", name: "Oto Elektrikçi", storeType: "otomotiv_servis_elektrik", icon: "⚡", tags: ["oto elektrik", "elektrik arızası", "marş dinamosu", "alternatör", "akü", "sigorta"] },
      { slug: "oto-elektronik", name: "Oto Elektronik / Beyin Tamiri", storeType: "otomotiv_servis_elektronik", icon: "💻", tags: ["beyin tamiri", "ecu", "elektronik arıza", "oto beyin", "immobilizer"] },
      { slug: "oto-diyagnostik", name: "Oto Diyagnostik (Arıza Tespit)", storeType: "otomotiv_servis_diyagnostik", icon: "🔍", tags: ["arıza tespit", "diyagnostik", "obd", "bilgisayarlı arıza", "check engine"] },
      { slug: "oto-ses-goruntu", name: "Oto Ses ve Görüntü (Multimedya)", storeType: "otomotiv_servis_multimedya", icon: "🔊", tags: ["multimedya", "oto ses", "teyp montaj", "navigasyon", "kamera montaj", "hoparlör"] },
    ],
  },
  {
    slug: "kaporta-boya",
    name: "Kaporta, Boya ve Dış Aksam",
    sortOrder: 3,
    icon: "🎨",
    categories: [
      { slug: "oto-kaportaci", name: "Oto Kaportacı", storeType: "otomotiv_servis_kaporta", icon: "🔨", tags: ["kaporta", "kaportacı", "çarpma onarım", "göçük", "hasar onarım"] },
      { slug: "boyasiz-gocuk", name: "Boyasız Göçük Düzeltme (PDR)", storeType: "otomotiv_servis_pdr", icon: "✨", tags: ["pdr", "boyasız göçük", "göçük düzeltme", "dolgu"] },
      { slug: "oto-boyaci", name: "Oto Boyacı", storeType: "otomotiv_servis_boya", icon: "🎨", tags: ["oto boya", "boyacı", "lokal boya", "tam boya", "cila"] },
      { slug: "oto-camci", name: "Oto Camcı", storeType: "otomotiv_servis_cam", icon: "🪟", tags: ["oto cam", "cam değişimi", "ön cam", "camcı", "cam çatlağı"] },
      { slug: "plastik-tampon", name: "Plastik ve Tampon Tamiri", storeType: "otomotiv_servis_tampon", icon: "🧩", tags: ["tampon tamiri", "plastik kaynak", "tampon boya", "plastik parça"] },
    ],
  },
  {
    slug: "alt-takim-egzoz",
    name: "Alt Takım, Egzoz ve Yürüyen Aksam",
    sortOrder: 4,
    icon: "⭕",
    categories: [
      { slug: "egzozcu", name: "Egzozcu", storeType: "otomotiv_servis_egzoz", icon: "💨", tags: ["egzoz", "egzozcu", "egzoz değişimi", "egzoz borusu", "katalitik"] },
      { slug: "rot-balans", name: "Rot-Balans", storeType: "otomotiv_servis_rot_balans", icon: "⚖️", tags: ["rot balans", "rot ayarı", "balans", "jant düzeltme"] },
      { slug: "lastikci", name: "Lastikçi", storeType: "otomotiv_servis_lastik", icon: "⭕", tags: ["lastik", "lastikçi", "lastik değişimi", "lastik montaj", "patlak lastik"] },
      { slug: "amortisor-supansiyon", name: "Amortisör ve Süspansiyon", storeType: "otomotiv_servis_supansiyon", icon: "🔩", tags: ["amortisör", "süspansiyon", "salıncak", "rot başı", "takoz"] },
      { slug: "fren-servisi", name: "Fren Servisi", storeType: "otomotiv_servis_fren", icon: "🛑", tags: ["fren", "fren balata", "fren diski", "abs", "fren hidroliği"] },
      { slug: "sanziman-servisi", name: "Şanzıman Servisi", storeType: "otomotiv_servis_sanziman", icon: "⚙️", tags: ["şanzıman", "vites kutusu", "otomatik şanzıman", "debriyaj", "kavrama"] },
    ],
  },
  {
    slug: "konfor-ic-mekan",
    name: "Konfor ve İç Mekan",
    sortOrder: 5,
    icon: "🪑",
    categories: [
      { slug: "oto-klima-servisi", name: "Oto Klima Servisi", storeType: "otomotiv_servis_klima", icon: "❄️", tags: ["klima", "klima üflüyor", "gaz basma", "klima gazı", "klima bakımı", "klima arızası", "klima servisi"] },
      { slug: "oto-dosemeci", name: "Oto Döşemeci", storeType: "otomotiv_servis_doseme", icon: "🪑", tags: ["döşeme", "koltuk döşeme", "deri kaplama", "tavan döşeme", "oto döşeme"] },
      { slug: "oto-yikama-detailing", name: "Oto Yıkama ve Detailing", storeType: "otomotiv_servis_yikama", icon: "💧", tags: ["oto yıkama", "detailing", "pasta cila", "iç temizlik", "seramik kaplama"] },
      { slug: "sunroof-kilit", name: "Sunroof ve Kilit Servisi", storeType: "otomotiv_servis_sunroof", icon: "🔐", tags: ["sunroof", "cam tavan", "kilit arızası", "merkezi kilit", "cam kaldırma"] },
    ],
  },
  {
    slug: "destek-ozel",
    name: "Destek ve Özel Amaçlı",
    sortOrder: 6,
    icon: "🚛",
    categories: [
      { slug: "oto-ekspertiz", name: "Oto Ekspertiz", storeType: "otomotiv_servis_ekspertiz", icon: "📑", tags: ["ekspertiz", "araç ekspertiz", "hasar kaydı", "boya ölçüm"] },
      { slug: "oto-cekici", name: "Oto Çekici / Kurtarıcı", storeType: "otomotiv_servis_cekici", icon: "🚛", tags: ["çekici", "oto kurtarma", "yol yardım", "kurtarıcı"] },
      { slug: "lpg-servisi", name: "LPG Servisi", storeType: "otomotiv_servis_lpg", icon: "⛽", tags: ["lpg", "lpg montaj", "lpg bakım", "gaz sistemi"] },
      { slug: "turbo-servisi", name: "Turbo Servisi", storeType: "otomotiv_servis_turbo", icon: "🌀", tags: ["turbo", "turbo tamiri", "turbo revizyon"] },
      { slug: "radyator-depo", name: "Radyatör ve Depo Tamircisi", storeType: "otomotiv_servis_radyator", icon: "🌡️", tags: ["radyatör", "su radyatörü", "depo tamiri", "yakıt deposu", "soğutma sistemi"] },
    ],
  },
];

export const OTOMOTIV_SERVICE_ALL_CATEGORIES = OTOMOTIV_SERVICE_GROUPS.flatMap((g) =>
  g.categories.map((c) => ({ ...c, groupSlug: g.slug, groupName: g.name, groupIcon: g.icon })),
);

export function findOtomotivServiceCategory(slug: string) {
  const key = slug.trim().toLowerCase();
  for (const group of OTOMOTIV_SERVICE_GROUPS) {
    const cat = group.categories.find((c) => c.slug === key);
    if (cat) return { group, category: cat };
  }
  return undefined;
}

export function searchOtomotivServiceCategoriesLocal(query: string) {
  const q = query.trim().toLocaleLowerCase("tr-TR");
  if (!q) return OTOMOTIV_SERVICE_ALL_CATEGORIES;
  return OTOMOTIV_SERVICE_ALL_CATEGORIES.filter((cat) => {
    const hay = [cat.name, cat.slug, cat.groupName, ...cat.tags].join(" ").toLocaleLowerCase("tr-TR");
    return hay.includes(q);
  });
}

export const OTOMOTIV_SERVICE_POPULAR_LABELS = [
  "Oto Klima Servisi",
  "Egzozcu",
  "Oto Mekanik / Motor Tamir",
  "Oto Kaportacı",
  "Lastikçi",
  "Oto Ekspertiz",
  "Oto Çekici / Kurtarıcı",
  "Periyodik Bakım Merkezi",
  "Oto Elektrikçi",
  "Rot-Balans",
];
