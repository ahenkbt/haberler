import { createHash } from "node:crypto";
import { slugify } from "./news-context.js";

/** Kapak dosya adı gövdesi üst sınırı (uzantı hariç). */
export const NEWS_COVER_FILENAME_MAX_LEN = 80;

const HASH_LEN = 6;

/** Başlıktan güvenli medya dosya adı gövdesi: `{slug}-{shortHash}` */
export function newsCoverFilenameStem(title: string, hashSeed?: string): string {
  const decoded = String(title ?? "").trim();
  const base = slugify(decoded) || "haber";
  const seed = String(hashSeed ?? decoded).trim() || base;
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, HASH_LEN);
  const maxBaseLen = Math.max(1, NEWS_COVER_FILENAME_MAX_LEN - hash.length - 1);
  const trimmedBase = base.slice(0, maxBaseLen).replace(/-+$/, "") || "haber";
  return `${trimmedBase}-${hash}`;
}

/** Dosya adı gövdesini güvenli karakterlere indirger. */
export function sanitizeMediaFilenameStem(raw: string): string {
  return (
    String(raw ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, NEWS_COVER_FILENAME_MAX_LEN) || "haber"
  );
}
