import type { OtomotivBusinessType } from "./otomotivAdminTypes";
import { OTOMOTIV_SERVICE_GROUPS } from "@/themes/otomotiv/otomotivServiceCategories";

export const OTOMOTIV_SERVIS_CATEGORY_OPTIONS = OTOMOTIV_SERVICE_GROUPS.flatMap((group) =>
  group.categories.map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    groupName: group.name,
    storeType: cat.storeType,
  })),
);

export const OTOMOTIV_BUSINESS_TYPES: {
  value: OtomotivBusinessType;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { value: "galeri", label: "Oto Galeri", emoji: "🚗", description: "Sıfır + 2. el araç vitrini (B2C/C2C)" },
  { value: "yedek_parca", label: "Yedek Parçacı", emoji: "🔩", description: "Ürün kataloğu, stok, uyumluluk, kargo" },
  { value: "cikma", label: "Çıkma Parçacı", emoji: "♻️", description: "Çıkma parça ilanları, durum, teklif sistemi" },
  { value: "servis", label: "Oto Tamir Servisi", emoji: "🔧", description: "Hizmet listesi, randevu slotları, çalışma saatleri" },
  { value: "yikama", label: "Oto Yıkamacı", emoji: "💧", description: "Paketler (iç/dış/detay), randevu, fiyat" },
  { value: "lastik", label: "Lastikçi", emoji: "⭕", description: "Lastik ürünleri + montaj/balans randevusu" },
  { value: "genel", label: "Genel Otomotiv", emoji: "🏢", description: "Ortak firma profili, belgeler, abonelik" },
];

export type OtomotivBusinessDetailTab =
  | "profil"
  | "araclar"
  | "fotograflar"
  | "urunler"
  | "uyumluluk"
  | "kargo"
  | "randevular"
  | "hizmetler"
  | "calisma_saatleri"
  | "belgeler";

export const BUSINESS_TYPE_TABS: Record<OtomotivBusinessType, { id: OtomotivBusinessDetailTab; label: string }[]> = {
  galeri: [
    { id: "profil", label: "Firma Profili" },
    { id: "araclar", label: "Araçlar" },
    { id: "fotograflar", label: "Fotoğraflar" },
  ],
  yedek_parca: [
    { id: "profil", label: "Firma Profili" },
    { id: "urunler", label: "Ürünler" },
    { id: "uyumluluk", label: "Uyumluluk" },
    { id: "kargo", label: "Kargo" },
  ],
  cikma: [
    { id: "profil", label: "Firma Profili" },
    { id: "urunler", label: "Çıkma İlanları" },
    { id: "uyumluluk", label: "Uyumluluk" },
  ],
  servis: [
    { id: "profil", label: "Firma Profili" },
    { id: "hizmetler", label: "Hizmetler" },
    { id: "randevular", label: "Randevu Slotları" },
    { id: "calisma_saatleri", label: "Çalışma Saatleri" },
  ],
  yikama: [
    { id: "profil", label: "Firma Profili" },
    { id: "hizmetler", label: "Paketler" },
    { id: "randevular", label: "Randevu Slotları" },
    { id: "calisma_saatleri", label: "Çalışma Saatleri" },
  ],
  lastik: [
    { id: "profil", label: "Firma Profili" },
    { id: "urunler", label: "Lastik Ürünleri" },
    { id: "hizmetler", label: "Montaj Hizmetleri" },
    { id: "randevular", label: "Randevu Slotları" },
  ],
  genel: [
    { id: "profil", label: "Firma Profili" },
    { id: "belgeler", label: "Belgeler & Abonelik" },
  ],
};

export const VEHICLE_CLASSES = [
  { value: "otomobil", label: "Otomobil" },
  { value: "ticari", label: "Ticari" },
  { value: "arazi", label: "Arazi / SUV" },
  { value: "minibus", label: "Minibüs" },
  { value: "kamyon", label: "Kamyon" },
  { value: "otobus", label: "Otobüs" },
  { value: "motosiklet", label: "Motosiklet" },
  { value: "diger", label: "Diğer" },
];

export const STATUS_TR: Record<string, string> = {
  pending: "Bekliyor",
  active: "Aktif",
  inactive: "Pasif",
  rejected: "Reddedildi",
  deleted: "Silindi",
  draft: "Taslak",
  sold: "Satıldı",
  new: "Yeni",
  contacted: "Arandı",
  quoted: "Teklif verildi",
  converted: "Dönüştü",
  closed: "Kapalı",
  spam: "Spam",
};

export const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-800",
  deleted: "bg-red-100 text-red-800",
  draft: "bg-slate-100 text-slate-600",
  sold: "bg-blue-100 text-blue-800",
};

export function businessTypeLabel(type: OtomotivBusinessType | string): string {
  return OTOMOTIV_BUSINESS_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function businessTypeEmoji(type: OtomotivBusinessType | string): string {
  return OTOMOTIV_BUSINESS_TYPES.find((t) => t.value === type)?.emoji ?? "🚗";
}
