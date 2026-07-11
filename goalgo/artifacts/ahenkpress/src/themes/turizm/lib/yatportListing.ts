import type { BcDetailListing } from "@/themes/bookingcore/components/BookingCoreDetailLayout";

export type YachtFeatureCategory = { category: string; items: string[] };
export type YachtExtraService = { name: string; pricePerPerson: number; description?: string };
export type YachtFaqItem = { question: string; answer: string };
export type YachtTeknikDetaylar = {
  marka?: string;
  model?: string;
  yakitDahil?: boolean;
  murettebatSayisi?: number | string;
  yapimYili?: number | string;
  uzunluk?: number | string;
  kabin?: number | string;
  wc?: number | string;
};

export type YachtSummary = {
  marka?: string;
  tekneTipi?: string;
  kapasite?: number;
  kabin?: number;
  wc?: number;
  uzunluk?: number;
  yapimYili?: number;
  ilanNo?: string;
  kaptanli?: boolean;
  rentalType?: string;
  kaporaOrani?: number;
  price?: number;
  priceUnit?: string;
  kdvDahil?: boolean;
};

export type YachtListingExtras = {
  mapBusinessId?: string;
  kaptanli?: boolean | null;
  kabinSayisi?: number | null;
  yatakSayisi?: number | null;
  wcSayisi?: number | null;
  uzunlukM?: number | null;
  yapimYili?: number | null;
  ilanNo?: string | null;
  featureCategories?: YachtFeatureCategory[];
  sunulanHizmetler?: string[];
  ekstraHizmetler?: YachtExtraService[];
  teknikDetaylar?: YachtTeknikDetaylar;
  limanlar?: string[];
  faqItems?: YachtFaqItem[];
  saatlikFiyat?: number | null;
  gunlukFiyat?: number | null;
  minSureSaat?: number | null;
  kdvDahil?: boolean;
  kaporaOrani?: number | null;
  rentalTypeDefault?: string | null;
  relatedMapBusinessIds?: string[];
  cancellationPolicy?: string | null;
};

export type YatportListing = BcDetailListing & {
  is_yatport?: boolean;
  import_source?: string;
  linked_listing_id?: number;
  map_business_fallback?: boolean;
  reservation_enabled?: boolean;
  yacht_summary?: YachtSummary;
  yacht_extras?: YachtListingExtras | null;
  yacht_feature_categories?: YachtFeatureCategory[];
  yacht_sunulan_hizmetler?: string[];
  yacht_ekstra_hizmetler?: YachtExtraService[];
  yacht_teknik_detaylar?: YachtTeknikDetaylar;
  yacht_faq?: YachtFaqItem[];
  yacht_kdv_dahil?: boolean;
  yacht_kapora_orani?: number;
  yacht_cancellation_policy?: string;
  related_listings?: Array<{
    id: number | string;
    title: string;
    slug: string;
    type: string;
    city?: string | null;
    image_url?: string | null;
    price?: string;
    yacht_summary?: YachtSummary;
  }>;
};

export function isYatportListing(listing: YatportListing | null | undefined): boolean {
  if (!listing) return false;
  if (listing.is_yatport === true) return true;
  if (String(listing.import_source ?? "").toLowerCase() === "yatport") return true;
  const extra = listing.extra_info ?? {};
  if (extra.yatport_source_url || extra.yatport_ilan_no) return true;
  if (listing.yatport_owner || listing.yatport_genel_bilgiler) return true;
  if (listing.yacht_summary || listing.yacht_extras) return true;
  return false;
}

export const YATPORT_RENTAL_LABELS: Record<string, string> = {
  saatlik: "Saatlik",
  gunluk: "Günlük",
  gunubirlik: "Günübirlik",
  haftalik: "Haftalık",
  aylik: "Aylık",
};

export const YATPORT_GENEL_LABELS: Record<string, string> = {
  ilanNo: "İlan No",
  marka: "Marka",
  model: "Model",
  yapimYili: "Yapım Yılı",
  kapasite: "Kapasite",
  yemekliKapasite: "Yemekli Kapasite",
  konaklamaliKapasite: "Konaklamalı Kapasite",
  murettebat: "Mürettebat",
  uzunluk: "Uzunluk (m)",
  bayrak: "Bayrak",
  motorGucu: "Motor Gücü",
  sonBakimYili: "Son Bakım",
  wcSayisi: "Wc",
  kabinSayisi: "Kabin",
  tekneTipi: "Tekne Tipi",
};
