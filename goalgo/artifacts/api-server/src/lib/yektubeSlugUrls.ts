/** Yektube public URL slug helpers (yektube-core ile uyumlu) */

export function slugifyText(value: string): string {
  return value
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

export function channelPathSlug(name: string, sourceId?: number | null): string {
  const slug = slugifyText(name);
  const id = sourceId != null ? Number(sourceId) : NaN;
  if (Number.isFinite(id) && id > 0) return `${slug || "kanal"}-${id}`;
  return slug || (sourceId != null ? String(sourceId) : "kanal");
}

export function videoPathSlug(title: string, youtubeVideoId: string): string {
  const id = youtubeVideoId.trim();
  const titleSlug = slugifyText(title).slice(0, 80);
  if (titleSlug && id) return `${titleSlug}-${id}`;
  return id;
}

export function yektubeWatchPath(
  baseOrigin: string,
  sourceId: number,
  channelName: string,
  youtubeVideoId: string,
  title: string,
): string {
  const origin = baseOrigin.replace(/\/+$/, "");
  const prefix = origin.includes("yektube.com") ? "" : "/yp";
  const channel = channelPathSlug(channelName, sourceId);
  const video = encodeURIComponent(videoPathSlug(title, youtubeVideoId));
  return `${origin}${prefix}/kanal/${channel}/${video}`;
}
