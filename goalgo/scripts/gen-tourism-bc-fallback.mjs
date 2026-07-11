import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demo = JSON.parse(
  fs.readFileSync(path.join(root, "artifacts/api-server/src/data/tourism-bc-demo.json"), "utf8"),
);

const TYPE_ALIASES = { space: "villa", uzay: "villa" };
const rows = demo.listings
  .filter((l) => l.type !== "hotel" && !l.roomCarrier)
  .map((l, i) => ({
  id: -(9000 + i),
  type: TYPE_ALIASES[l.type] || l.type,
  title: l.title,
  slug: l.slug,
  city: l.city,
  image_url: l.image,
  price: String(l.price),
  sale_price: l.salePrice != null ? String(l.salePrice) : null,
  price_unit: l.priceUnit === "gece" ? "gece" : l.priceUnit === "gun" || l.priceUnit === "gün" ? "gün" : l.priceUnit,
  star_rating: l.starRating ?? null,
  rating: l.rating ?? 4.5,
  review_count: l.reviewCount ?? 0,
  is_featured: Boolean(l.isFeatured),
  bc_client_fallback: true,
}));

const out = `import type { TourismListingRow } from "./normalizeTourismListing";

const BC: TourismListingRow[] = ${JSON.stringify(rows, null, 2)};

const TYPE_ALIASES: Record<string, string> = { space: "villa", uzay: "villa" };

export function getTourismBcClientFallback(type: string, limit = 24): TourismListingRow[] {
  const t = TYPE_ALIASES[type] || type;
  return BC.filter((l) => l.type === t).slice(0, limit);
}
`;

fs.writeFileSync(
  path.join(root, "artifacts/ahenkpress/src/themes/bookingcore/lib/tourismBcClientFallback.ts"),
  out,
);

const counts = Object.fromEntries(
  ["hotel", "villa", "car", "boat", "tour"].map((t) => [t, rows.filter((r) => r.type === t).length]),
);
console.log("Generated fallback:", rows.length, "listings", counts);
