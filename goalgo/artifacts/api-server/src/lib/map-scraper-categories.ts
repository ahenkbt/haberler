import { db } from "@workspace/db";
import { mapCategoriesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { INSAATFIRMALARIM_CATEGORIES } from "./insaatfirmalarim-scraper.js";
import { fetchKesfetDiscoverGroupsPayload, seedKesfetDiscoverCategoriesIfNeeded } from "./kesfet-discover-seed.js";

/** Kamu ve kamusal alan üst kategorisi. */
export const KESFET_KAMU_SUPER = "kamu";

export type KesfetScraperBackfillCategory = {
  slug: string;
  label: string;
  keyword: string;
  googlePlaceType?: string;
  homepageSuperCategory: string;
  storeType: string;
  public?: boolean;
};

export const KESFET_SCRAPER_BACKFILL_CATEGORIES: KesfetScraperBackfillCategory[] = [
  { slug: "yeme-icme-eglence", label: "Yeme, İçme ve Eğlence", keyword: "restoran lokanta özel işletme", googlePlaceType: "restaurant", homepageSuperCategory: "siparis", storeType: "mekan_restoran" },
  { slug: "alisveris-perakende", label: "Alışveriş, Perakende ve Mağazacılık", keyword: "mağaza alışveriş özel işletme", googlePlaceType: "store", homepageSuperCategory: "alisveris", storeType: "alisveris" },
  { slug: "saglik-medikal-bakim", label: "Sağlık, Medikal ve Kişisel Bakım (Özel)", keyword: "güzellik salonu kuaför bakım medikal optik özel işletme", googlePlaceType: "beauty_salon", homepageSuperCategory: "hizmet", storeType: "hizmet_guzellik" },
  { slug: "otomotiv", label: "Otomotiv ve Araç Dünyası", keyword: "oto servis oto tamir oto ekspertiz özel işletme", googlePlaceType: "car_repair", homepageSuperCategory: "hizmet", storeType: "hizmet_tamir" },
  { slug: "insaat-emlak-dekorasyon", label: "İnşaat, Emlak ve Ev Dekorasyonu", keyword: "emlak ofisi tadilat dekorasyon yapı malzemeleri", googlePlaceType: "real_estate_agency", homepageSuperCategory: "hizmet", storeType: "hizmet_ev" },
  { slug: "egitim-kurs", label: "Eğitim, Kurs ve Kişisel Gelişim (Özel)", keyword: "özel kurs dershane eğitim merkezi", googlePlaceType: "store", homepageSuperCategory: "hizmet", storeType: "hizmet_egitim" },
  { slug: "profesyonel-hizmetler", label: "Profesyonel Hizmetler ve Kurumsal Danışmanlık", keyword: "avukat mali müşavir danışmanlık ajans", googlePlaceType: "lawyer", homepageSuperCategory: "hizmet", storeType: "hizmet_kurumsal" },
  { slug: "ev-esnaf-hizmetleri", label: "Ev ve Esnaf Hizmetleri", keyword: "esnaf ev hizmetleri tesisat elektrik temizlik", googlePlaceType: "store", homepageSuperCategory: "mekan_dukkan", storeType: "hizmet_esnaf" },
  { slug: "spor-yasam-pet", label: "Spor, Yaşam ve Evcil Hayvan Hizmetleri", keyword: "spor salonu petshop pet hizmetleri", googlePlaceType: "gym", homepageSuperCategory: "hizmet", storeType: "hizmet_yasam" },
  { slug: "turizm-konaklama-seyahat", label: "Turizm, Konaklama ve Seyahat", keyword: "otel butik otel seyahat acentesi turizm", googlePlaceType: "lodging", homepageSuperCategory: "turizm", storeType: "turizm" },
  { slug: "kafe-tatli-firin", label: "Kafe, Tatlı ve Fırın", keyword: "kafe pastane tatlıcı fırın", googlePlaceType: "cafe", homepageSuperCategory: "siparis", storeType: "mekan_kafe" },
  { slug: "market-bakkal-sarkuteri", label: "Market, Bakkal ve Şarküteri", keyword: "market bakkal şarküteri", googlePlaceType: "supermarket", homepageSuperCategory: "alisveris", storeType: "alisveris_market" },
  { slug: "akaryakit-istasyon", label: "Akaryakıt ve Şarj İstasyonları", keyword: "akaryakıt istasyonu benzinlik şarj istasyonu", googlePlaceType: "gas_station", homepageSuperCategory: "hizmet", storeType: "hizmet_akaryakit" },
  { slug: "kuyumcu-takı", label: "Kuyumcu ve Takı", keyword: "kuyumcu altın takı", googlePlaceType: "jewelry_store", homepageSuperCategory: "alisveris", storeType: "alisveris_kuyumcu" },
  { slug: "elektronik-teknoloji", label: "Elektronik ve Teknoloji Mağazaları", keyword: "elektronik teknoloji bilgisayar telefon mağazası", googlePlaceType: "electronics_store", homepageSuperCategory: "alisveris", storeType: "alisveris_elektronik" },
  { slug: "mobilya-dekorasyon", label: "Mobilya ve Dekorasyon Mağazaları", keyword: "mobilya dekorasyon mağazası", googlePlaceType: "furniture_store", homepageSuperCategory: "alisveris", storeType: "alisveris_mobilya" },
  { slug: "veteriner-pet", label: "Veteriner ve Pet Shop", keyword: "veteriner kliniği petshop", googlePlaceType: "veterinary_care", homepageSuperCategory: "hizmet", storeType: "hizmet_veteriner" },
  { slug: "spor-fitness", label: "Spor Salonu ve Fitness", keyword: "spor salonu fitness gym", googlePlaceType: "gym", homepageSuperCategory: "hizmet", storeType: "hizmet_spor" },
  { slug: "kafe-bar-gece", label: "Bar ve Gece Hayatı", keyword: "bar pub gece kulübü", googlePlaceType: "bar", homepageSuperCategory: "siparis", storeType: "mekan_bar" },
  { slug: "kamu-hastane-saglik", label: "Hastane ve Sağlık Kuruluşları", keyword: "hastane devlet hastanesi sağlık ocağı aile sağlığı merkezi", googlePlaceType: "hospital", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_saglik", public: true },
  { slug: "kamu-eczane", label: "Eczaneler", keyword: "eczane nöbetçi eczane", googlePlaceType: "pharmacy", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_eczane", public: true },
  { slug: "kamu-devlet-kurumlari", label: "Devlet Kurumları ve Belediye", keyword: "kaymakamlık belediye valilik nüfus müdürlüğü devlet dairesi", googlePlaceType: "local_government_office", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_devlet", public: true },
  { slug: "kamu-ibadethane", label: "İbadethaneler", keyword: "cami mescit kilise sinagog ibadethane", googlePlaceType: "place_of_worship", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_ibadethane", public: true },
  { slug: "kamu-noter", label: "Noterler", keyword: "noter", googlePlaceType: "lawyer", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_noter", public: true },
  { slug: "kamu-park-yesil-alan", label: "Park ve Yeşil Alanlar", keyword: "park millet bahçesi yeşil alan oyun parkı", googlePlaceType: "park", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_park", public: true },
  { slug: "kamu-okul", label: "Okullar", keyword: "ilkokul ortaokul lise devlet okulu", googlePlaceType: "school", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_okul", public: true },
  { slug: "kamu-universite", label: "Üniversiteler", keyword: "üniversite kampüs fakülte", googlePlaceType: "university", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_universite", public: true },
  { slug: "kamu-kutuphane", label: "Kütüphaneler", keyword: "kütüphane halk kütüphanesi", googlePlaceType: "library", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_kutuphane", public: true },
  { slug: "kamu-muze", label: "Müzeler", keyword: "müze ören yeri", googlePlaceType: "museum", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_muze", public: true },
  { slug: "kamu-postane", label: "PTT ve Postaneler", keyword: "ptt postane kargo şubesi", googlePlaceType: "post_office", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_postane", public: true },
  { slug: "kamu-emniyet", label: "Emniyet ve Karakol", keyword: "polis karakolu emniyet müdürlüğü jandarma", googlePlaceType: "police", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_emniyet", public: true },
  { slug: "kamu-itfaiye", label: "İtfaiye", keyword: "itfaiye", googlePlaceType: "fire_station", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_itfaiye", public: true },
  { slug: "kamu-ulasim-durak", label: "Otogar, Tren ve Metro İstasyonları", keyword: "otogar tren istasyonu metro istasyonu durak", googlePlaceType: "transit_station", homepageSuperCategory: KESFET_KAMU_SUPER, storeType: "kamu_ulasim", public: true },
];

/** map_categories.slug → kazıma botu slug / storeType eşlemesi. */
export const MAP_CATEGORY_SCRAPER_ALIASES: Record<string, {
  scraperSlugs: string[];
  storeTypes: string[];
  googlePlaceTypes: string[];
  superCategories?: string[];
}> = {
  restoranlar: {
    scraperSlugs: ["yeme-icme-eglence"],
    storeTypes: ["mekan_restoran"],
    googlePlaceTypes: ["restaurant", "meal_takeaway", "meal_delivery", "food"],
  },
  kafeler: { scraperSlugs: ["kafe-tatli-firin", "kafe-bar-gece"], storeTypes: ["mekan_kafe", "mekan_bar"], googlePlaceTypes: ["cafe", "bakery"] },
  hastaneler: { scraperSlugs: ["kamu-hastane-saglik"], storeTypes: ["kamu_saglik"], googlePlaceTypes: ["hospital"] },
  eczaneler: { scraperSlugs: ["kamu-eczane"], storeTypes: ["kamu_eczane"], googlePlaceTypes: ["pharmacy"] },
  otomotiv: {
    scraperSlugs: ["otomotiv"],
    storeTypes: [
      "otomotiv_galeri", "otomotiv_bayi", "otomotiv_servis", "otomotiv_yikama", "otomotiv_lastik",
      "otomotiv_yedek_parca", "otomotiv_cikma", "otomotiv_genel", "hizmet_tamir", "hizmet_galeri",
      "hizmet_yikama", "hizmet_lastik", "hizmet_parca",
      ...OTOMOTIV_SERVICE_CATEGORY_ROWS.map((r) => r.store_type),
    ],
    googlePlaceTypes: ["car_dealer", "car_repair", "car_wash", "auto_parts_store"],
    superCategories: ["hizmet"],
  },
  "benzin-istasyonu": { scraperSlugs: ["akaryakit-istasyon"], storeTypes: ["hizmet_akaryakit"], googlePlaceTypes: ["gas_station"] },
  marketler: { scraperSlugs: ["market-bakkal-sarkuteri"], storeTypes: ["alisveris_market"], googlePlaceTypes: ["supermarket", "grocery_or_supermarket"], superCategories: ["alisveris"] },
  oteller: { scraperSlugs: ["turizm-konaklama-seyahat"], storeTypes: ["turizm"], googlePlaceTypes: ["lodging", "hotel"], superCategories: ["turizm", "seyahat"] },
  "alisveris-merkezleri": { scraperSlugs: ["alisveris-perakende"], storeTypes: ["alisveris"], googlePlaceTypes: ["shopping_mall", "store"], superCategories: ["alisveris"] },
  elektronik: { scraperSlugs: ["elektronik-teknoloji"], storeTypes: ["alisveris_elektronik"], googlePlaceTypes: ["electronics_store"], superCategories: ["alisveris"] },
  "moda-giyim": { scraperSlugs: ["alisveris-perakende"], storeTypes: ["alisveris"], googlePlaceTypes: ["clothing_store", "shoe_store"], superCategories: ["alisveris"] },
  hizmetler: { scraperSlugs: ["profesyonel-hizmetler", "ev-esnaf-hizmetleri", "saglik-medikal-bakim", "spor-yasam-pet"], storeTypes: [], googlePlaceTypes: [] },
  eglence: { scraperSlugs: ["kafe-bar-gece", "yeme-icme-eglence"], storeTypes: ["mekan_bar"], googlePlaceTypes: ["bar", "night_club"], superCategories: ["siparis"] },
  bankalar: { scraperSlugs: [], storeTypes: ["hizmet_kurumsal"], googlePlaceTypes: ["bank"], superCategories: ["hizmet"] },
};

export const MAP_SCRAPER_SUPER_CATEGORY_LABELS: Record<string, string> = {
  siparis: "Sipariş / Yemek",
  alisveris: "Alışveriş",
  turizm: "Turizm",
  seyahat: "Seyahat",
  ulasim: "Ulaşım",
  hizmet: "Hizmet",
  mekan_dukkan: "Mekan & Dükkan",
  firma_rehberi: "Sarı Sayfalar / Firma Rehberi",
  kamu: "Kamu ve Kamusal Alan",
  insaat: "İnşaat",
  yiyecek: "Yiyecek & İçecek (eski)",
  mekan: "Mekan (eski)",
};

const DISCOVER_GROUP_SUPER: Record<string, { superCategory: string; storeType: string }> = {
  saglik: { superCategory: "hizmet", storeType: "hizmet_medikal" },
  ev: { superCategory: "alisveris", storeType: "alisveris" },
  hizmetler: { superCategory: "hizmet", storeType: "hizmet" },
  egitim: { superCategory: "hizmet", storeType: "hizmet_egitim" },
  eglence: { superCategory: "siparis", storeType: "mekan_restoran" },
  otomotiv: { superCategory: "hizmet", storeType: "otomotiv_genel" },
  siparis: { superCategory: "siparis", storeType: "siparis" },
  servis: { superCategory: "hizmet", storeType: "hizmet" },
  seyahat: { superCategory: "turizm", storeType: "turizm" },
  ulasim: { superCategory: "ulasim", storeType: "ulasim" },
  insaat: { superCategory: "insaat", storeType: "hizmet_insaat" },
};

/** Mağaza türleri — premium / ulaşım / sipariş alt tipleri. */

import { OTOMOTIV_SERVICE_CATEGORY_ROWS } from "../data/otomotiv-service-categories-data.js";

export const MAP_SCRAPER_STORE_TYPE_OPTIONS: {
  group: string;
  superCategory: string;
  items: { slug: string; label: string; storeType: string; homepageSuperCategory: string; googlePlaceType?: string; keyword?: string }[];
}[] = [
  {
    group: "Turizm",
    superCategory: "turizm",
    items: [
      { slug: "turizm-otel", label: "Otel", storeType: "turizm_otel", homepageSuperCategory: "turizm", googlePlaceType: "lodging", keyword: "otel" },
      { slug: "turizm-pansiyon", label: "Pansiyon / butik konaklama", storeType: "turizm_pansiyon", homepageSuperCategory: "turizm", googlePlaceType: "lodging", keyword: "pansiyon butik otel" },
      { slug: "turizm-villa", label: "Villa kiralama işletmesi", storeType: "turizm_villa", homepageSuperCategory: "turizm", keyword: "villa kiralama" },
      { slug: "turizm-ev-kiralama", label: "Ev / daire kiralama (tatil)", storeType: "turizm_ev_kiralama", homepageSuperCategory: "turizm", keyword: "tatil evi kiralama" },
      { slug: "turizm-tur-sirketi", label: "Tur şirketi", storeType: "turizm_tur_sirketi", homepageSuperCategory: "turizm", googlePlaceType: "travel_agency", keyword: "tur şirketi" },
      { slug: "turizm-yat-tekne", label: "Yat / tekne turu işletmesi", storeType: "turizm_yat_tekne", homepageSuperCategory: "turizm", keyword: "tekne turu yat" },
      { slug: "turizm-rentacar", label: "Rent a car (turizm)", storeType: "turizm_rentacar", homepageSuperCategory: "seyahat", googlePlaceType: "car_rental", keyword: "rent a car araç kiralama" },
    ],
  },
  {
    group: "Seyahat",
    superCategory: "seyahat",
    items: [
      { slug: "seyahat-acenta", label: "Seyahat acentası", storeType: "seyahat_acenta", homepageSuperCategory: "seyahat", googlePlaceType: "travel_agency", keyword: "seyahat acentası" },
      { slug: "seyahat-otobus", label: "Otobüs / hat seyahat şirketi", storeType: "seyahat_otobus", homepageSuperCategory: "seyahat", keyword: "otobüs firması" },
      { slug: "seyahat-rentacar", label: "Rent a car (seyahat)", storeType: "seyahat_rentacar", homepageSuperCategory: "seyahat", googlePlaceType: "car_rental", keyword: "araç kiralama" },
    ],
  },
  {
    group: "Ulaşım (şirket)",
    superCategory: "ulasim",
    items: [
      { slug: "ulasim-taksi-sirketi", label: "Taksi / dolmuş şirketi", storeType: "ulasim_taksi_sirketi", homepageSuperCategory: "ulasim", keyword: "taksi dolmuş" },
      { slug: "ulasim-kurye-sirketi", label: "Kurye şirketi", storeType: "ulasim_kurye_sirketi", homepageSuperCategory: "ulasim", keyword: "kurye şirketi" },
      { slug: "ulasim-cekici-sirketi", label: "Çekici / oto kurtarma şirketi", storeType: "ulasim_cekici_sirketi", homepageSuperCategory: "ulasim", keyword: "oto kurtarma çekici" },
      { slug: "ulasim-nakliyat-kargo", label: "Nakliyat / lojistik / kargo şirketi", storeType: "ulasim_nakliyat_kargo", homepageSuperCategory: "ulasim", keyword: "nakliyat lojistik kargo" },
      { slug: "ulasim-ozel-tasima", label: "Özel yolcu taşıma şirketi", storeType: "ulasim_ozel_tasima", homepageSuperCategory: "ulasim", keyword: "özel yolcu taşıma" },
      { slug: "ulasim-minibus-servis", label: "Minibüs / servis / okul servisi şirketi", storeType: "ulasim_minibus_servis", homepageSuperCategory: "ulasim", keyword: "servis minibüs" },
    ],
  },
  {
    group: "Ulaşım (bireysel)",
    superCategory: "ulasim",
    items: [
      { slug: "ulasim-arac-paylasim-bireysel", label: "Araç paylaşım (bireysel)", storeType: "ulasim_arac_paylasim_bireysel", homepageSuperCategory: "ulasim", keyword: "araç paylaşım" },
    ],
  },
  {
    group: "Mekan & sipariş",
    superCategory: "siparis",
    items: [
      { slug: "siparis-genel", label: "Sipariş / teslimat (genel dükkan)", storeType: "siparis", homepageSuperCategory: "siparis", googlePlaceType: "store", keyword: "dükkan" },
      { slug: "mekan-restoran", label: "Restoran / lokanta", storeType: "mekan_restoran", homepageSuperCategory: "siparis", googlePlaceType: "restaurant", keyword: "restoran lokanta" },
      { slug: "mekan-kafe", label: "Kafe / kahveci / çay ocağı", storeType: "mekan_kafe", homepageSuperCategory: "siparis", googlePlaceType: "cafe", keyword: "kafe kahve" },
      { slug: "mekan-fastfood", label: "Fast food / dürüm / burger", storeType: "mekan_fastfood", homepageSuperCategory: "siparis", googlePlaceType: "meal_takeaway", keyword: "fast food burger" },
      { slug: "mekan-market", label: "Market / bakkal / süpermarket", storeType: "mekan_market", homepageSuperCategory: "siparis", googlePlaceType: "supermarket", keyword: "market bakkal" },
      { slug: "mekan-kuruyemis", label: "Kuruyemiş / şekerleme", storeType: "mekan_kuruyemis", homepageSuperCategory: "siparis", keyword: "kuruyemiş" },
      { slug: "mekan-manav", label: "Manav / sebze-meyve", storeType: "mekan_manav", homepageSuperCategory: "siparis", keyword: "manav sebze meyve" },
      { slug: "mekan-kasap", label: "Kasap / şarküteri", storeType: "mekan_kasap", homepageSuperCategory: "siparis", keyword: "kasap şarküteri" },
      { slug: "mekan-tavuk", label: "Tavuk / işkembe / kokoreç", storeType: "mekan_tavuk", homepageSuperCategory: "siparis", keyword: "tavuk kokoreç" },
      { slug: "mekan-balik", label: "Balık / deniz ürünleri (dükkan)", storeType: "mekan_balik", homepageSuperCategory: "siparis", keyword: "balıkçı" },
      { slug: "mekan-firin-unlu", label: "Fırın / unlu mamul / pastane (dükkan)", storeType: "mekan_firin_unlu", homepageSuperCategory: "siparis", googlePlaceType: "bakery", keyword: "fırın pastane" },
      { slug: "mekan-simit-borek", label: "Simit / börek / tost dükkanı", storeType: "mekan_simit_borek", homepageSuperCategory: "siparis", keyword: "simit börek" },
      { slug: "mekan-eczane", label: "Eczane", storeType: "mekan_eczane", homepageSuperCategory: "siparis", googlePlaceType: "pharmacy", keyword: "eczane" },
      { slug: "mekan-icecek", label: "İçecek / büfe / su bayii", storeType: "mekan_icecek", homepageSuperCategory: "siparis", keyword: "su bayii büfe" },
      { slug: "mekan-cicek", label: "Çiçekçi", storeType: "mekan_cicek", homepageSuperCategory: "siparis", googlePlaceType: "florist", keyword: "çiçekçi" },
      { slug: "mekan-petshop", label: "Pet shop / mama", storeType: "mekan_petshop", homepageSuperCategory: "siparis", googlePlaceType: "pet_store", keyword: "pet shop" },
      { slug: "mekan-kitap-kirtasiye", label: "Kırtasiye / fotokopi", storeType: "mekan_kitap_kirtasiye", homepageSuperCategory: "siparis", keyword: "kırtasiye fotokopi" },
      { slug: "mekan-dukkan-diger", label: "Diğer mahalle dükkanı (sipariş)", storeType: "mekan_dukkan_diger", homepageSuperCategory: "siparis", googlePlaceType: "store", keyword: "dükkan" },
    ],
  },
  {
    group: "Alışveriş & genel hizmet",
    superCategory: "alisveris",
    items: [
      { slug: "alisveris-genel", label: "E-ticaret / mağaza", storeType: "alisveris", homepageSuperCategory: "alisveris", googlePlaceType: "store", keyword: "mağaza alışveriş" },
      { slug: "firma-rehberi", label: "Sarı Sayfalar / firma rehberi", storeType: "firma_rehberi", homepageSuperCategory: "firma_rehberi", googlePlaceType: "store", keyword: "işletme firma" },
      { slug: "firma-rehberi-hizmet", label: "Sarı Sayfalar hizmet işletmesi", storeType: "firma_rehberi_hizmet", homepageSuperCategory: "firma_rehberi", keyword: "hizmet işletmesi" },
      { slug: "firma-rehberi-magaza", label: "Sarı Sayfalar ürün listeleyen işletme", storeType: "firma_rehberi_magaza", homepageSuperCategory: "firma_rehberi", googlePlaceType: "store", keyword: "mağaza" },
      { slug: "hizmet-genel", label: "Genel hizmet işletmesi", storeType: "hizmet", homepageSuperCategory: "mekan_dukkan", googlePlaceType: "store", keyword: "hizmet" },
      { slug: "hizmetler-coklu", label: "Hizmetler (çoklu)", storeType: "hizmetler", homepageSuperCategory: "mekan_dukkan", keyword: "hizmetler" },
    ],
  },
  {
    group: "Otomotiv Servis",
    superCategory: "hizmet",
    items: OTOMOTIV_SERVICE_CATEGORY_ROWS.map((cat) => ({
      slug: `otomotiv-servis-${cat.slug}`,
      label: cat.name,
      storeType: cat.store_type,
      homepageSuperCategory: "hizmet",
      googlePlaceType: "car_repair",
      keyword: Array.isArray(cat.tags) ? cat.tags.slice(0, 3).join(" ") : cat.name,
    })),
  },
  {
    group: "İnşaat",
    superCategory: "insaat",
    items: INSAATFIRMALARIM_CATEGORIES.map((cat) => ({
      slug: cat.slug,
      label: cat.label,
      storeType: cat.storeType ?? "hizmet_insaat",
      homepageSuperCategory: "insaat",
      googlePlaceType: "general_contractor",
      keyword: cat.label,
    })),
  },
];

export type MapScraperCategoryItem = {
  id: string;
  slug: string;
  label: string;
  superCategory: string;
  superCategoryLabel: string;
  storeType: string;
  homepageSuperCategory: string;
  googlePlaceType: string | null;
  googleKeyword: string;
  categoryId: string | null;
  icon: string | null;
  source: "backfill" | "map" | "discover" | "insaat" | "store";
};

export type MapScraperCategoryGroup = {
  superCategory: string;
  label: string;
  sortOrder: number;
  items: MapScraperCategoryItem[];
};

const SUPER_SORT: Record<string, number> = {
  siparis: 1,
  alisveris: 2,
  turizm: 3,
  seyahat: 4,
  ulasim: 5,
  hizmet: 6,
  mekan_dukkan: 7,
  firma_rehberi: 8,
  kamu: 9,
  insaat: 10,
};

function superLabel(key: string): string {
  return MAP_SCRAPER_SUPER_CATEGORY_LABELS[key] ?? key;
}

function inferGooglePlaceType(name: string, fallback?: string | null): string | null {
  if (fallback?.trim()) return fallback.trim();
  const n = name.toLocaleLowerCase("tr-TR");
  if (/eczane/.test(n)) return "pharmacy";
  if (/hastane|poliklinik|doktor|hekim|klinik/.test(n)) return "doctor";
  if (/restoran|lokanta|meyhane|birahane/.test(n)) return "restaurant";
  if (/kafe|kahve|çay ocağı|cay ocagi/.test(n)) return "cafe";
  if (/otel|pansiyon|konaklama/.test(n)) return "lodging";
  if (/market|bakkal|süpermarket|supermarket/.test(n)) return "supermarket";
  if (/banka|bank/.test(n)) return "bank";
  if (/noter/.test(n)) return "lawyer";
  if (/oto tamir|servis|tamirci/.test(n)) return "car_repair";
  if (/sinema/.test(n)) return "movie_theater";
  if (/tiyatro/.test(n)) return "movie_theater";
  if (/bar|gece kulübü|pub/.test(n)) return "bar";
  if (/veteriner|pet shop|petshop/.test(n)) return "veterinary_care";
  if (/spor salonu|fitness|gym/.test(n)) return "gym";
  if (/havaalan|airport/.test(n)) return "airport";
  if (/tren istasyon|metro|otogar|terminal/.test(n)) return "transit_station";
  if (/rent a car|araç kiralama|arac kiralama/.test(n)) return "car_rental";
  if (/tur şirketi|seyahat acent/.test(n)) return "travel_agency";
  return null;
}

function pushItem(
  bucket: Map<string, MapScraperCategoryItem>,
  item: MapScraperCategoryItem,
): void {
  const dedupeKey = `${item.slug}::${item.homepageSuperCategory}::${item.storeType}`;
  if (!bucket.has(dedupeKey)) bucket.set(dedupeKey, item);
}

export async function fetchMapScraperCategoryCatalog(): Promise<{
  groups: MapScraperCategoryGroup[];
  total: number;
}> {
  await seedKesfetDiscoverCategoriesIfNeeded();
  const bucket = new Map<string, MapScraperCategoryItem>();

  for (const cat of KESFET_SCRAPER_BACKFILL_CATEGORIES) {
    pushItem(bucket, {
      id: `backfill:${cat.slug}`,
      slug: cat.slug,
      label: cat.label,
      superCategory: cat.homepageSuperCategory,
      superCategoryLabel: superLabel(cat.homepageSuperCategory),
      storeType: cat.storeType,
      homepageSuperCategory: cat.homepageSuperCategory,
      googlePlaceType: cat.googlePlaceType ?? null,
      googleKeyword: cat.keyword,
      categoryId: null,
      icon: null,
      source: "backfill",
    });
  }

  const mapRows = await db
    .select()
    .from(mapCategoriesTable)
    .where(eq(mapCategoriesTable.isActive, true))
    .orderBy(asc(mapCategoriesTable.sortOrder), asc(mapCategoriesTable.name));

  for (const row of mapRows) {
    const slug = String(row.slug).trim();
    const aliases = MAP_CATEGORY_SCRAPER_ALIASES[slug.toLocaleLowerCase("tr-TR")];
    const googlePlaceType = row.googlePlaceType
      ?? aliases?.googlePlaceTypes?.[0]
      ?? null;
    const backfill = KESFET_SCRAPER_BACKFILL_CATEGORIES.find((c) => c.slug === slug || aliases?.scraperSlugs?.includes(c.slug));
    pushItem(bucket, {
      id: `map:${row.id}`,
      slug,
      label: row.name,
      superCategory: backfill?.homepageSuperCategory ?? aliases?.superCategories?.[0] ?? "mekan_dukkan",
      superCategoryLabel: superLabel(backfill?.homepageSuperCategory ?? aliases?.superCategories?.[0] ?? "mekan_dukkan"),
      storeType: backfill?.storeType ?? aliases?.storeTypes?.[0] ?? "mekan_dukkan",
      homepageSuperCategory: backfill?.homepageSuperCategory ?? aliases?.superCategories?.[0] ?? "mekan_dukkan",
      googlePlaceType,
      googleKeyword: backfill?.keyword ?? row.name,
      categoryId: row.id,
      icon: row.icon ?? null,
      source: "map",
    });
  }

  const discoverGroups = await fetchKesfetDiscoverGroupsPayload(true);
  for (const group of discoverGroups) {
    const meta = DISCOVER_GROUP_SUPER[group.key] ?? { superCategory: "hizmet", storeType: "hizmet" };
    for (const sub of group.subcategories) {
      if (sub.isActive === false) continue;
      const gpt = inferGooglePlaceType(sub.name, sub.googlePlaceType);
      pushItem(bucket, {
        id: `discover:${group.key}:${sub.slug}`,
        slug: sub.slug,
        label: sub.name,
        superCategory: meta.superCategory,
        superCategoryLabel: superLabel(meta.superCategory),
        storeType: meta.storeType,
        homepageSuperCategory: meta.superCategory,
        googlePlaceType: gpt,
        googleKeyword: sub.googleKeyword ?? sub.name,
        categoryId: null,
        icon: group.icon ?? null,
        source: "discover",
      });
    }
  }

  for (const group of MAP_SCRAPER_STORE_TYPE_OPTIONS) {
    for (const item of group.items) {
      const isInsaat = group.superCategory === "insaat";
      pushItem(bucket, {
        id: isInsaat ? `insaat:${item.slug}` : `store:${item.slug}`,
        slug: item.slug,
        label: item.label,
        superCategory: group.superCategory,
        superCategoryLabel: superLabel(group.superCategory),
        storeType: item.storeType,
        homepageSuperCategory: item.homepageSuperCategory,
        googlePlaceType: item.googlePlaceType ?? null,
        googleKeyword: item.keyword ?? item.label,
        categoryId: null,
        icon: isInsaat ? "🏗️" : null,
        source: isInsaat ? "insaat" : "store",
      });
    }
  }

  const bySuper = new Map<string, MapScraperCategoryItem[]>();
  for (const item of bucket.values()) {
    const list = bySuper.get(item.superCategory) ?? [];
    list.push(item);
    bySuper.set(item.superCategory, list);
  }

  const groups: MapScraperCategoryGroup[] = Array.from(bySuper.entries())
    .map(([superCategory, items]) => ({
      superCategory,
      label: superLabel(superCategory),
      sortOrder: SUPER_SORT[superCategory] ?? 99,
      items: items.sort((a, b) => a.label.localeCompare(b.label, "tr")),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "tr"));

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return { groups, total };
}
