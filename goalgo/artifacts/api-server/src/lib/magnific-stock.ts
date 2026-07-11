import axios from "axios";

const MAGNIFIC_API = "https://api.magnific.com";

export type MagnificResourceHit = {
  id: string | number;
  title?: string;
  previewUrl: string;
};

function pickPhotoPreview(entry: Record<string, unknown>): string | null {
  const image = entry.image as Record<string, unknown> | undefined;
  if (!image || String(image.type) !== "photo") return null;
  const licenses = entry.licenses;
  if (Array.isArray(licenses) && licenses.length > 0) {
    const hasFreemium = licenses.some(
      (l) => l && typeof l === "object" && String((l as { type?: string }).type).toLowerCase() === "freemium",
    );
    if (!hasFreemium) return null;
  }
  const source = image.source as Record<string, unknown> | undefined;
  const url = source?.url;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

/**
 * Stock search: freemium (ücretsiz) + fotoğraf içerik.
 * Auth: header x-magnific-api-key — https://docs.magnific.com/introduction
 */
export async function searchMagnificFreemiumPhotos(
  apiKey: string,
  term: string,
  opts?: { limit?: number; language?: string },
): Promise<MagnificResourceHit[]> {
  const q = term.trim();
  if (!q || q.length < 2) return [];
  const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 30);

  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("limit", String(limit));
  params.set("order", "relevance");
  params.set("term", q);
  params.set("filters[license][freemium]", "1");
  params.set("filters[content_type][photo]", "1");

  const res = await axios.get(`${MAGNIFIC_API}/v1/resources?${params.toString()}`, {
    headers: {
      "x-magnific-api-key": apiKey.trim(),
      ...(opts?.language ? { "Accept-Language": opts.language } : { "Accept-Language": "tr-TR" }),
    },
    timeout: 25_000,
    validateStatus: () => true,
  });

  const data = res.data;
  if (res.status === 401 || res.status === 403) {
    const msg = (data as { message?: string })?.message || "Magnific yetkisiz — API anahtarını kontrol edin";
    throw new Error(msg);
  }
  if (res.status >= 400) {
    const msg = (data as { message?: string })?.message || `Magnific HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (!data || typeof data !== "object") return [];
  if ((data as { message?: string }).message && !(data as { data?: unknown }).data) {
    throw new Error(String((data as { message?: string }).message || "Magnific API hatası"));
  }

  const rows = (data as { data?: unknown[] }).data;
  if (!Array.isArray(rows)) return [];

  const out: MagnificResourceHit[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const previewUrl = pickPhotoPreview(r);
    if (!previewUrl) continue;
    out.push({
      id: r.id as string | number,
      title: typeof r.title === "string" ? r.title : undefined,
      previewUrl,
    });
  }
  return out;
}

export async function firstMagnificPhotoPreview(
  apiKey: string,
  term: string,
): Promise<string | null> {
  const hits = await searchMagnificFreemiumPhotos(apiKey, term, { limit: 12 });
  return hits[0]?.previewUrl ?? null;
}
