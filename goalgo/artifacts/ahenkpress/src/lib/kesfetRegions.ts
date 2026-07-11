/** Keşfet — bölge mozaik kartları (yerel public/assets görselleri) */
export type KesfetRegionMosaicSlot =
  | "mosaic-hero"
  | "mosaic-tall"
  | "mosaic-sm-1"
  | "mosaic-sm-2"
  | "mosaic-sm-3"
  | "mosaic-sm-4"
  | "mosaic-wide";

export type KesfetRegion = {
  id: string;
  name: string;
  mosaic: KesfetRegionMosaicSlot;
  image: string;
  imageAlt: string;
  cities: string[];
};

const REGION_IMAGE_BASE = "/assets/kesfet-regions";

/** DOM sırası mobil yığında okunabilir; masaüstü grid slotları `mosaic` ile belirlenir. */
export const KESFET_REGIONS: KesfetRegion[] = [
  {
    id: "ic-anadolu",
    name: "İç Anadolu",
    mosaic: "mosaic-hero",
    imageAlt: "Ankara Anıtkabir tören meydanı",
    image: `${REGION_IMAGE_BASE}/ic-anadolu.jpg`,
    cities: ["Ankara", "Konya", "Eskişehir", "Kayseri"],
  },
  {
    id: "ege",
    name: "Ege",
    mosaic: "mosaic-tall",
    imageAlt: "Ege Bodrum beyaz evler ve begonvil",
    image: `${REGION_IMAGE_BASE}/ege.jpg`,
    cities: ["İzmir", "Aydın", "Muğla", "Manisa", "Denizli"],
  },
  {
    id: "dogu-anadolu",
    name: "Doğu Anadolu",
    mosaic: "mosaic-sm-1",
    imageAlt: "Van Akdamar Adası ve kilisesi",
    image: `${REGION_IMAGE_BASE}/dogu-anadolu.jpg`,
    cities: ["Erzurum", "Van", "Malatya", "Elazığ"],
  },
  {
    id: "guneydogu",
    name: "Güneydoğu Anadolu",
    mosaic: "mosaic-sm-2",
    imageAlt: "İshak Paşa Sarayı gün batımı",
    image: `${REGION_IMAGE_BASE}/guneydogu.jpg`,
    cities: ["Gaziantep", "Diyarbakır", "Şanlıurfa", "Mardin"],
  },
  {
    id: "akdeniz",
    name: "Akdeniz",
    mosaic: "mosaic-wide",
    imageAlt: "Alanya tersanesi ve Akdeniz kıyısı",
    image: `${REGION_IMAGE_BASE}/akdeniz.jpg`,
    cities: ["Antalya", "Mersin", "Adana", "Hatay"],
  },
  {
    id: "karadeniz",
    name: "Karadeniz",
    mosaic: "mosaic-sm-3",
    imageAlt: "Karadeniz yeşil vadi ve dere",
    image: `${REGION_IMAGE_BASE}/karadeniz.jpg`,
    cities: ["Trabzon", "Samsun", "Ordu", "Rize"],
  },
  {
    id: "marmara",
    name: "Marmara",
    mosaic: "mosaic-sm-4",
    imageAlt: "İstanbul Haliç ve Süleymaniye manzarası",
    image: `${REGION_IMAGE_BASE}/marmara.jpg`,
    cities: ["İstanbul", "Bursa", "Kocaeli", "Tekirdağ", "Sakarya"],
  },
];
