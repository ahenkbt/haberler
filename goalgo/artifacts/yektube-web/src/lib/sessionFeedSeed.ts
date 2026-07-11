/** Oturum boyunca sabit feed karışım seed'i — sayfa yenilemede çeşitlilik korunur */
export function readSessionFeedSeed(storageKey = "yektube-feed-seed"): number {
  try {
    let raw = sessionStorage.getItem(storageKey);
    if (!raw) {
      raw = String(Math.floor(Math.random() * 1_000_000_000));
      sessionStorage.setItem(storageKey, raw);
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : Math.floor(Math.random() * 1_000_000_000);
  } catch {
    return Math.floor(Math.random() * 1_000_000_000);
  }
}

/** Kategori rafları — oturum seed'inden bağımsız, SEO/statik vitrin için sabit karışım */
export const STATIC_SHELF_FEED_SEED = 42;
