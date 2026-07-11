const YT_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Türkçe uyumlu URL slug — kanal, video, kategori adları için */
export function slugifyText(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Kanal URL parçası — ad slug + kaynak id (benzersiz ve geri çözülebilir) */
export function channelPathSlug(name: string | null | undefined, sourceId?: number | string | null): string {
  const slug = slugifyText(name);
  const id = sourceId != null ? Number(sourceId) : NaN;
  if (Number.isFinite(id) && id > 0) {
    const base = slug || "kanal";
    return `${base}-${id}`;
  }
  if (slug) return slug;
  return sourceId != null ? String(sourceId) : "kanal";
}

/** Video URL parçası — başlık slug + YouTube video id */
export function videoPathSlug(title: string | null | undefined, youtubeVideoId: string | null | undefined): string {
  const id = String(youtubeVideoId ?? "").trim();
  const titleSlug = slugifyText(title).slice(0, 80);
  if (titleSlug && id) return `${titleSlug}-${id}`;
  return id;
}

/** URL'den YouTube video id çıkarır (slug-id veya düz id) */
export function parseYoutubeVideoRef(ref: string | null | undefined): string {
  const raw = decodeURIComponent(String(ref ?? "").trim());
  if (YT_VIDEO_ID.test(raw)) return raw;

  // slug-sonunda-11karakter (videoPathSlug formatı)
  const dashed = raw.match(/-([A-Za-z0-9_-]{11})$/);
  if (dashed?.[1] && YT_VIDEO_ID.test(dashed[1])) return dashed[1];

  // Bazı slug'larda fazladan karakter — sondaki 11 karakteri dene
  const tail11 = raw.match(/([A-Za-z0-9_-]{11})$/);
  if (tail11?.[1] && YT_VIDEO_ID.test(tail11[1])) return tail11[1];

  // Metin içinde geçen 11 karakterlik id
  const embedded = raw.match(/(?:^|[^A-Za-z0-9_-])([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)/);
  if (embedded?.[1] && YT_VIDEO_ID.test(embedded[1])) return embedded[1];

  return raw;
}

export function isNumericChannelRef(ref: string | null | undefined): boolean {
  const n = Number(ref);
  return Number.isFinite(n) && n > 0 && String(n) === String(ref ?? "").trim();
}
