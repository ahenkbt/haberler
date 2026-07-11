import type { TravllaDestination, TravllaTour } from "./travllaTypes";
import { TRV } from "./travllaPaths";

export const TRAVLLA_DEMO_DESTINATIONS: TravllaDestination[] = [
  {
    id: 1,
    title: "Antalya",
    slug: "antalya",
    image: "https://images.unsplash.com/photo-1589561253831-b8421dd58261?w=900&q=80",
    listings: 42,
    excerpt: "Akdeniz kıyıları, antik kentler ve yatırım turları.",
    detailTitle: "Antalya Seyahat Rehberi",
    gallery: [
      "https://images.unsplash.com/photo-1589561253831-b8421dd58261?w=1200&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80",
    ],
  },
  {
    id: 2,
    title: "İstanbul",
    slug: "istanbul",
    image: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&q=80",
    listings: 58,
    excerpt: "İki kıtanın buluştuğu şehir — kültür ve gastronomi turları.",
    detailTitle: "İstanbul Keşif Rotası",
    gallery: [
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80",
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80",
    ],
  },
  {
    id: 3,
    title: "Kapadokya",
    slug: "kapadokya",
    image: "https://images.unsplash.com/photo-1570633774822-44f52c0b3455?w=900&q=80",
    listings: 36,
    excerpt: "Balon turları, vadiler ve peri bacaları.",
    detailTitle: "Kapadokya Tur Paketleri",
    gallery: [
      "https://images.unsplash.com/photo-1570633774822-44f52c0b3455?w=1200&q=80",
      "https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=1200&q=80",
    ],
  },
  {
    id: 4,
    title: "Bodrum",
    slug: "bodrum",
    image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=900&q=80",
    listings: 31,
    excerpt: "Ege koyları, yat turları ve yaz festivalleri.",
    detailTitle: "Bodrum & Muğla Turları",
    gallery: [
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80",
      "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200&q=80",
    ],
  },
  {
    id: 5,
    title: "Fethiye",
    slug: "fethiye",
    image: "https://images.unsplash.com/photo-1602002418082-dd4a3f5b3f5e?w=900&q=80",
    listings: 27,
    excerpt: "Ölüdeniz, tekne turları ve Likya yolu yürüyüşleri.",
    detailTitle: "Fethiye Aktivite Turları",
    gallery: [
      "https://images.unsplash.com/photo-1602002418082-dd4a3f5b3f5e?w=1200&q=80",
    ],
  },
  {
    id: 6,
    title: "Trabzon",
    slug: "trabzon",
    image: "https://images.unsplash.com/photo-1596484552834-065fdc54d390?w=900&q=80",
    listings: 22,
    excerpt: "Karadeniz yaylaları, Sümela ve doğa turları.",
    detailTitle: "Trabzon & Karadeniz",
    gallery: [
      "https://images.unsplash.com/photo-1596484552834-065fdc54d390?w=1200&q=80",
    ],
  },
];

function defaultItinerary(title: string, city: string | null) {
  const place = city || title;
  return [
    { day: "1. Gün", title: `${place} varış & transfer`, body: "Havalimanı veya otogar karşılama, konaklamaya yerleşme ve kısa şehir turu." },
    { day: "2. Gün", title: "Ana tur programı", body: "Rehber eşliğinde öne çıkan noktalar, fotoğraf molaları ve öğle yemeği molası." },
    { day: "3. Gün", title: "Serbest zaman / dönüş", body: "İsteğe bağlı aktiviteler ve dönüş transferi." },
  ];
}

function defaultReviews(rating: number, count: number) {
  return [
    { author: "Ayşe Y.", rating: Math.min(5, Math.round(rating)), text: "Program yoğun ama akıcıydı; rehber bilgiliydi.", date: "2026-03-12" },
    { author: "Can D.", rating: Math.max(4, Math.round(rating) - 1), text: "Fiyat/performans iyi; Yekpare üzerinden rezervasyon kolaydı.", date: "2026-02-28" },
    { author: "Elif S.", rating: Math.round(rating), text: "Ailece katıldık, çocuklar için de uygundu.", date: "2026-01-15" },
  ].slice(0, Math.min(3, Math.max(1, Math.floor(count / 40))));
}

export function enrichTourRow(row: Record<string, unknown>): TravllaTour {
  const title = String(row.title ?? "");
  const city = row.city ? String(row.city) : null;
  const rating = Number(row.rating ?? 4.5);
  const reviewCount = Number(row.review_count ?? 0);
  const gallery = Array.isArray(row.gallery) && row.gallery.length
    ? (row.gallery as string[])
    : row.image_url
      ? [String(row.image_url)]
      : [];
  const slug = String(row.slug ?? "");
  return {
    id: Number(row.id),
    type: String(row.type ?? "tour"),
    title,
    slug,
    city,
    district: row.district ? String(row.district) : null,
    image_url: row.image_url ? String(row.image_url) : null,
    gallery,
    price: String(row.price ?? "0"),
    sale_price: row.sale_price != null ? String(row.sale_price) : null,
    price_unit: String(row.price_unit ?? "kişi"),
    rating,
    review_count: reviewCount,
    star_rating: row.star_rating != null ? Number(row.star_rating) : null,
    description: row.description ? String(row.description) : null,
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : undefined,
    duration_days: row.duration_days != null ? Number(row.duration_days) : 3,
    duration_nights: row.duration_nights != null ? Number(row.duration_nights) : 2,
    itinerary:
      Array.isArray(row.itinerary) && row.itinerary.length
        ? (row.itinerary as TravllaTour["itinerary"])
        : defaultItinerary(title, city),
    reviews:
      Array.isArray(row.reviews) && row.reviews.length
        ? (row.reviews as TravllaTour["reviews"])
        : defaultReviews(rating, reviewCount),
    href: row.href ? String(row.href) : TRV.tur(slug),
  };
}

export function normalizeListingTours(rows: Record<string, unknown>[]): TravllaTour[] {
  return rows.map((r) => enrichTourRow(r));
}

export function destinationBySlug(slug: string): TravllaDestination | null {
  return TRAVLLA_DEMO_DESTINATIONS.find((d) => d.slug === slug.toLowerCase()) ?? null;
}

export function toursForDestinationCity(city: string, allTours: TravllaTour[]): TravllaTour[] {
  const needle = city.toLowerCase();
  const matched = allTours.filter(
    (t) =>
      (t.city || "").toLowerCase().includes(needle) ||
      needle.includes((t.city || "").toLowerCase()) ||
      t.title.toLowerCase().includes(needle),
  );
  return matched.length ? matched.slice(0, 12) : allTours.filter((t) => t.type === "tour").slice(0, 4);
}
