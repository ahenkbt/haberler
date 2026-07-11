export type TourismReviewRow = {
  id: string;
  author: string;
  date: string;
  rating: number;
  text: string;
};

export type TourismRatingBreakdown = {
  stars: 1 | 2 | 3 | 4 | 5;
  pct: number;
  count: number;
};

export type TourismReviewBundle = {
  average: number;
  total: number;
  breakdown: TourismRatingBreakdown[];
  reviews: TourismReviewRow[];
};

const STUB_REVIEWS: Omit<TourismReviewRow, "id">[] = [
  {
    author: "Ayşe K.",
    date: "12.03.2026",
    rating: 5,
    text: "Konum mükemmel, odalar temiz ve personel çok ilgili. Tekrar tercih ederiz.",
  },
  {
    author: "Mehmet T.",
    date: "28.02.2026",
    rating: 4,
    text: "Kahvaltı çeşitliliği iyiydi. Giriş işlemleri biraz uzun sürdü ama genel deneyim olumlu.",
  },
  {
    author: "Zeynep A.",
    date: "15.01.2026",
    rating: 5,
    text: "Aile tatili için ideal. Havuz ve spa alanları bakımlı, fiyat/performans dengesi iyi.",
  },
];

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

/** Demo/stub yorum paketi — API Review modülü gelene kadar detay sayfasında gösterilir. */
export function buildTourismReviewStub(
  listingKey: string | number,
  ratingRaw: number | string,
  reviewCountRaw: number | string,
): TourismReviewBundle {
  const average = Math.min(5, Math.max(0, Number(ratingRaw) || 4.2));
  const total = Math.max(3, Math.round(Number(reviewCountRaw) || 12));
  const seed = hashSeed(String(listingKey));

  const weights = [0.08, 0.06, 0.1, 0.22, 0.54].map((w, i) => {
    const jitter = ((seed >> (i * 3)) & 7) / 100;
    return Math.max(0.02, w + (i === 4 ? jitter : -jitter / 4));
  });
  const sum = weights.reduce((a, b) => a + b, 0);

  const breakdown: TourismRatingBreakdown[] = ([5, 4, 3, 2, 1] as const).map((stars, i) => {
    const pct = Math.round((weights[4 - i]! / sum) * 100);
    return { stars, pct, count: Math.max(1, Math.round((total * pct) / 100)) };
  });

  const reviews = STUB_REVIEWS.map((r, i) => ({
    ...r,
    id: `${listingKey}-${i}`,
    rating: i === 0 ? Math.ceil(average) : r.rating,
  }));

  return { average, total, breakdown, reviews };
}
