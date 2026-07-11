/** Coerce API/DB rating values (string DECIMAL, null) to a finite number. */
export function coerceRating(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

/** Format rating for display; returns null when no meaningful rating. */
export function formatRating(value: unknown, digits = 1): string | null {
  const n = coerceRating(value, NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(digits);
}
