import { db } from "@workspace/db";
import { kesfetDiscoverGroupsTable, kesfetDiscoverSubcategoriesTable } from "@workspace/db";
import { sql, eq, asc } from "drizzle-orm";

export const KESFET_DISCOVER_GROUP_DEFS: {
  key: string;
  label: string;
  icon: string;
  sortOrder: number;
  subs: string[];
}[] = [
  {
    key: "saglik",
    label: "Sağlık",
    icon: "⚕️",
    sortOrder: 1,
    subs: [
      "Aile Hekimleri",
      "Akupunktur",
      "Çocuk Doktorları",
      "Dahiliye Doktorları",
      "Dermatolog",
      "Diş Hekimleri",
      "Diyetisyenler",
      "Eczane",
      "Evde Bakım Hizmetleri",
      "Genel Cerrahi Doktorları",
      "Göz Doktorları",
      "Göz Hastaneleri ve Klinikleri",
      "Hastane",
      "Kulak Burun Boğaz Doktorları",
      "Poliklinikler",
    ],
  },
  {
    key: "ev",
    label: "Ev",
    icon: "🏠",
    sortOrder: 2,
    subs: [
      "Antikacılar ve Antika Tamiri",
      "Bahçe Düzenleme ve Peyzaj",
      "Bahçe Mobilyaları",
      "Beyaz Eşya ve Elektronik Mağazaları",
      "Cam Balkon",
      "Çelik Kapı",
      "Çeyiz Mağazaları",
      "Çocuk-Bebek Mobilya ve Eşyaları",
      "Duşakabin",
      "Duvar Kağıdı",
      "Ev Tekstili",
      "Evden Eve Nakliyat",
      "Halı Yıkama",
      "Hazır Mutfak ve Banyo",
      "Koltuk Döşeme ve Döşemelik Kumaş",
      "Küçük Ev Aletleri",
      "Perde ve Jaluzi",
      "Su Bayileri",
      "Yatak ve Baza",
    ],
  },
  {
    key: "hizmetler",
    label: "Hizmetler",
    icon: "🛠️",
    sortOrder: 3,
    subs: [
      "Ambulans Hizmetleri",
      "Arabuluculuk",
      "Bankalar",
      "Boyacılar",
      "Çay Bahçesi",
      "Çay Ocağı",
      "Çilingir ve Anahtarcılar",
      "Dış Cephe Kaplama",
      "Doğal Gaz Tesisatçıları",
      "Elektrikçiler ve Elektrik Malzemeleri",
      "Gümrük Müşavirliği",
      "İnşaat Mühendisliği ve Müteahhitlik",
      "Kargo-Kutu ve Oluklu Mukavva",
      "Menajerlik Ajansları",
      "Mobilya Boyama",
      "Noter",
      "Oto Tamircileri",
      "Psikoteknik Kursu",
      "Sanal Ofis",
      "Serbest Muhasebeci Mali Müşavirler",
      "Sıhhi Tesisatçı",
      "SRC Kursu",
      "Temizlik Şirketleri",
      "Terziler",
      "Yeminli Mali Müşavirler",
      "Yol Yardım-Oto Kurtarma",
    ],
  },
  {
    key: "egitim",
    label: "Eğitim",
    icon: "📚",
    sortOrder: 4,
    subs: [
      "Özel Okullar",
      "Özel Sürücü Kursları (MTSK / Ehliyet)",
      "SRC Psikoteknik Merkezleri",
      "Sınava Hazırlık Kursları",
      "Eğitim Danışmanlığı",
      "Yabancı Dil Kursları",
      "Yurtdışı Eğitim Danışmanlığı",
      "Rehabilitasyon Merkezleri",
      "Destek Merkezleri",
      "Terapi Merkezleri",
      "Kişisel Gelişim Kursları",
      "Sertifika Merkezleri",
      "Bilişim Akademileri",
      "Robotik Kodlama",
      "Online Eğitim Platformları",
      "Uzaktan Öğretim Kursları",
      "Kız ve Erkek Öğrenci Yurtları",
    ],
  },
  {
    key: "eglence",
    label: "Eğlence",
    icon: "🎭",
    sortOrder: 5,
    subs: [
      "Beach Club ve Plajlar",
      "Bilardo Salonları",
      "Birahaneler",
      "Bowling Salonları",
      "Cd-Dvd-Bilgisayar Oyun Satışı ve Kiralama",
      "Düğün Salonları",
      "Gece Kulübü ve Barlar",
      "Gösteri Merkezleri",
      "Hayvanat Bahçeleri",
      "İnternet Kafeler ve Oyun Salonları",
      "Lunapark ve Eğlence Parkları",
      "Meyhaneler",
      "Paintball",
      "Parklar ve Oyun Alanları",
      "Parti ve Düğün Organizasyonu",
      "Restoranlar",
      "Şarap Evleri",
      "Sinemalar",
      "Tiyatrolar",
      "Türkü Evleri",
    ],
  },
  {
    key: "otomotiv",
    label: "Otomotiv",
    icon: "🚗",
    sortOrder: 6,
    subs: [
      "Galeri",
      "2. El",
      "Sıfır Araç",
      "Yedek Parça",
      "Çıkma Parça",
      "Oto Yıkama",
      "Oto Klima Servisi",
      "Oto Mekanik / Motor Tamir",
      "Oto Elektrikçi",
      "Oto Kaportacı",
      "Egzozcu",
      "Lastikçi",
      "Rot-Balans",
      "Periyodik Bakım Merkezi",
      "Oto Ekspertiz",
      "Oto Çekici / Kurtarıcı",
      "LPG Servisi",
    ],
  },
  {
    key: "siparis",
    label: "Sipariş",
    icon: "🍽️",
    sortOrder: 7,
    subs: [
      "Yemek",
      "Market",
      "Fast Food",
      "Kafe",
      "Pastane",
      "Manav",
      "Kasap",
      "Kurye",
    ],
  },
  {
    key: "servis",
    label: "Servis",
    icon: "🛠️",
    sortOrder: 8,
    subs: [
      "VIP Transfer",
      "Tamir",
      "Temizlik",
      "Boyacı",
      "Elektrikçi",
      "Tesisatçı",
      "Klima Servisi",
      "Güvenlik",
      "Taşımacılık",
    ],
  },
  {
    key: "seyahat",
    label: "Seyahat",
    icon: "🌍",
    sortOrder: 9,
    subs: [
      "Otel",
      "Tur",
      "Uçak",
      "Villa",
      "Yat",
      "Araç Kiralama",
      "Boğaz Turu ve Mavi Tur",
      "Devre Mülk Hizmetleri",
      "Duty Free Alışveriş Noktaları",
      "Evcil Hayvan Pansiyonları",
      "Havaalanları",
      "Havayolları",
      "Kampingler",
      "Limanlar",
      "Marinalar",
      "Otobüs Terminalleri",
      "Otobüs ve Minibüs Kiralama",
      "Tekne Kiralama",
      "Tren İstasyonları",
      "Tur Şirketleri",
      "Turist Danışma Büroları",
      "Vapur ve Feribot İskeleleri",
      "Vize Takip Firmaları",
    ],
  },
  {
    key: "ulasim",
    label: "Ulaşım",
    icon: "🚕",
    sortOrder: 10,
    subs: [
      "Kargo",
      "Paket",
      "Taksi",
      "Dolmuş",
      "Kurye",
      "Çekici",
      "Nakliyat",
      "Rent a Car",
    ],
  },
];

/** Legacy / removed Popüler Aramalar entries — deactivated on sync */
const REMOVED_SUB_NAMES = new Set([
  "Aile Sağlığı Merkezleri - Sağlık Ocakları",
  "Aile Sağlığı Merkezleri",
  "Sağlık Ocakları",
]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildExpectedSlugMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const g of KESFET_DISCOVER_GROUP_DEFS) {
    for (const name of g.subs) {
      map.set(`${g.key}-${slugify(name)}`, g.key);
    }
  }
  return map;
}

export async function ensureKesfetDiscoverTables(
  logger?: { info: (msg: string, obj?: object) => void },
): Promise<void> {
  const log = (msg: string) => (logger ? logger.info(msg, {}) : console.log(msg));
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS kesfet_discover_groups (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      icon TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS kesfet_discover_subcategories (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id VARCHAR NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      google_place_type TEXT,
      google_keyword TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  log("ensureKesfetDiscoverTables: tables ready");
}

export async function syncKesfetDiscoverCategories(
  logger?: { info: (msg: string, obj?: object) => void },
): Promise<void> {
  const log = (msg: string) => (logger ? logger.info(msg, {}) : console.log(msg));
  await ensureKesfetDiscoverTables(logger);
  const expectedSlugs = buildExpectedSlugMap();
  const managedKeys = new Set(KESFET_DISCOVER_GROUP_DEFS.map((g) => g.key));

  for (const g of KESFET_DISCOVER_GROUP_DEFS) {
    const existing = await db
      .select()
      .from(kesfetDiscoverGroupsTable)
      .where(eq(kesfetDiscoverGroupsTable.key, g.key));

    let groupId: string;
    if (existing[0]) {
      groupId = existing[0].id;
      await db
        .update(kesfetDiscoverGroupsTable)
        .set({
          label: g.label,
          icon: g.icon,
          sortOrder: g.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(kesfetDiscoverGroupsTable.id, groupId));
    } else {
      const [row] = await db
        .insert(kesfetDiscoverGroupsTable)
        .values({
          key: g.key,
          label: g.label,
          icon: g.icon,
          sortOrder: g.sortOrder,
          isActive: true,
        })
        .returning();
      if (!row) continue;
      groupId = row.id;
    }

    let order = 0;
    for (const name of g.subs) {
      order += 1;
      const slug = `${g.key}-${slugify(name)}`;
      await db
        .insert(kesfetDiscoverSubcategoriesTable)
        .values({
          groupId,
          name,
          slug,
          googleKeyword: name,
          sortOrder: order,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: kesfetDiscoverSubcategoriesTable.slug,
          set: {
            groupId,
            name,
            googleKeyword: name,
            sortOrder: order,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    }
  }

  const allGroups = await db.select().from(kesfetDiscoverGroupsTable);
  const groupKeyById = Object.fromEntries(allGroups.map((row) => [row.id, row.key]));
  const allSubs = await db.select().from(kesfetDiscoverSubcategoriesTable);

  for (const sub of allSubs) {
    const groupKey = groupKeyById[sub.groupId];
    const isRemovedName =
      REMOVED_SUB_NAMES.has(sub.name) ||
      sub.name.includes("Aile Sağlığı Merkezleri") ||
      (sub.name.includes("Sağlık Ocakları") && sub.name.toLowerCase().includes("aile"));
    const isStaleManaged =
      groupKey &&
      managedKeys.has(groupKey) &&
      !expectedSlugs.has(sub.slug);

    if ((isRemovedName || isStaleManaged) && sub.isActive) {
      await db
        .update(kesfetDiscoverSubcategoriesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(kesfetDiscoverSubcategoriesTable.id, sub.id));
    }
  }

  log("syncKesfetDiscoverCategories: defaults applied");
}

export async function seedKesfetDiscoverCategoriesIfNeeded(
  logger?: { info: (msg: string, obj?: object) => void },
): Promise<void> {
  await syncKesfetDiscoverCategories(logger);
}

export async function fetchKesfetDiscoverGroupsPayload(activeOnly = true) {
  const groupWhere = activeOnly ? eq(kesfetDiscoverGroupsTable.isActive, true) : undefined;
  const groups = await db
    .select()
    .from(kesfetDiscoverGroupsTable)
    .where(groupWhere)
    .orderBy(asc(kesfetDiscoverGroupsTable.sortOrder), asc(kesfetDiscoverGroupsTable.label));

  const subs = await db
    .select()
    .from(kesfetDiscoverSubcategoriesTable)
    .orderBy(asc(kesfetDiscoverSubcategoriesTable.sortOrder), asc(kesfetDiscoverSubcategoriesTable.name));

  const activeSub = activeOnly ? subs.filter((s) => s.isActive) : subs;
  return groups.map((g) => ({
    id: g.id,
    key: g.key,
    label: g.label,
    icon: g.icon ?? "📂",
    sortOrder: g.sortOrder,
    isActive: g.isActive,
    subcategories: activeSub
      .filter((s) => s.groupId === g.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        googlePlaceType: s.googlePlaceType,
        googleKeyword: s.googleKeyword ?? s.name,
        sortOrder: s.sortOrder,
        isActive: s.isActive,
        groupId: s.groupId,
      })),
  }));
}
